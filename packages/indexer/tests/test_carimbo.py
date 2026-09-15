"""T-51 — o carimbo de verificação ([ADR 0018]).

Em 14/09/2026 o site dizia "a indexação automática pode ter parado" com o workflow
rodando a cada ~5 h, dezessete vezes seguidas desde o último patch, sem uma falha. O
índice não mudava porque a Riot não tinha lançado patch — e o aviso media justamente a
mudança.

O carimbo é a execução sem patch novo deixando rastro: `checkedAt` no manifesto, no
máximo uma vez por dia. Três promessas são testadas aqui: carimbar só quando venceu
(senão é um commit no `main` a cada 6 h), mexer numa linha só (senão o `git log -p`
vira ruído) e caber folgado no limite de 72 h do site.
"""

from __future__ import annotations

import difflib
import json
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

from lol_assets_indexer.publish.storage import prepare_manifest
from lol_assets_indexer.scheduling import (
    GERACAO_DO_INDEXADOR,
    INTERVALO_DO_CARIMBO,
    current_generation,
    decide,
    last_checked,
    published,
    stamp_checked,
    write_github_output,
)
from lol_assets_schema import SCHEMA_VERSION
from lol_assets_schema.models import IndexManifest
from lol_assets_schema.validators import validate_manifest

RAIZ = Path(__file__).resolve().parents[3]
VERSAO = "16.18.1"
CATEGORIAS = ("champion", "emote", "item", "map", "profile_icon", "rune", "summoner_spell", "ward")
AGORA = datetime(2026, 9, 14, 12, 0, tzinfo=UTC)


def _iso(quando: datetime) -> str:
    return quando.strftime("%Y-%m-%dT%H:%M:%SZ")


def _manifesto(gerado: datetime, conferido: datetime | None = None) -> IndexManifest:
    documento: dict[str, object] = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": _iso(gerado),
        "currentVersion": VERSAO,
        "generation": {"indexer": GERACAO_DO_INDEXADOR, "categories": list(CATEGORIAS)},
        "versions": [
            {
                "gameVersion": VERSAO,
                "indexedAt": _iso(gerado),
                "assetsCopied": False,
                "catalog": {"url": "catalog-a.json", "champions": 173, "skins": 2121, "bytes": 10},
                "shards": [
                    {
                        "category": "champion",
                        "url": "index-champion-b.json",
                        "assets": 1,
                        "bytes": 1,
                    }
                ],
            }
        ],
    }
    if conferido is not None:
        documento["checkedAt"] = _iso(conferido)
    return IndexManifest.model_validate(documento)


def _publicar(destino: Path, manifesto: IndexManifest) -> Path:
    """Escreve como o publicador escreve: o JSON canônico, byte a byte."""
    destino.mkdir(parents=True, exist_ok=True)
    caminho = destino / "manifest.json"
    caminho.write_bytes(prepare_manifest(manifesto))
    return caminho


def _linhas(caminho: Path) -> list[str]:
    return caminho.read_text(encoding="utf-8").splitlines()


# --- a última verificação ------------------------------------------------------------


def test_sem_carimbo_a_ultima_verificacao_e_a_geracao() -> None:
    """Gerar também é conferir — e é o que vale nos índices anteriores ao 1.3.0."""
    gerado = AGORA - timedelta(days=4)
    assert last_checked(_manifesto(gerado)) == gerado


def test_com_carimbo_vale_o_carimbo() -> None:
    conferido = AGORA - timedelta(hours=5)
    assert last_checked(_manifesto(AGORA - timedelta(days=4), conferido)) == conferido


def test_carimbo_mais_antigo_que_a_geracao_nao_envelhece_o_indice() -> None:
    gerado = AGORA - timedelta(hours=5)
    assert last_checked(_manifesto(gerado, AGORA - timedelta(days=4))) == gerado


# --- quando carimbar -----------------------------------------------------------------


def test_carimba_quando_o_ultimo_venceu(tmp_path: Path) -> None:
    """É o 14/09/2026: gerado há quatro dias, nenhuma verificação registrada."""
    caminho = _publicar(tmp_path, _manifesto(AGORA - timedelta(days=4)))

    assert stamp_checked(tmp_path, AGORA) == "2026-09-14T12:00:00Z"
    assert json.loads(caminho.read_text(encoding="utf-8"))["checkedAt"] == "2026-09-14T12:00:00Z"


def test_antes_de_vencer_nao_escreve_nada(tmp_path: Path) -> None:
    """Carimbar a cada execução seria um commit no `main` — e um deploy — a cada 6 h."""
    caminho = _publicar(tmp_path, _manifesto(AGORA - INTERVALO_DO_CARIMBO + timedelta(minutes=1)))
    antes = caminho.read_bytes()

    assert stamp_checked(tmp_path, AGORA) is None
    assert caminho.read_bytes() == antes


def test_no_limite_exato_carimba(tmp_path: Path) -> None:
    _publicar(tmp_path, _manifesto(AGORA - INTERVALO_DO_CARIMBO))
    assert stamp_checked(tmp_path, AGORA) is not None


def test_o_intervalo_conta_do_ultimo_carimbo_nao_da_geracao(tmp_path: Path) -> None:
    caminho = _publicar(
        tmp_path, _manifesto(AGORA - timedelta(days=4), conferido=AGORA - timedelta(hours=3))
    )
    antes = caminho.read_bytes()

    assert stamp_checked(tmp_path, AGORA) is None
    assert caminho.read_bytes() == antes


# --- o que o carimbo muda --------------------------------------------------------------


def test_o_primeiro_carimbo_acrescenta_uma_linha_e_nada_mais(tmp_path: Path) -> None:
    """O commit do carimbo precisa ser legível no `git log -p`: uma linha."""
    gerado = AGORA - timedelta(days=4)
    caminho = _publicar(tmp_path, _manifesto(gerado))
    antes = _linhas(caminho)

    stamp_checked(tmp_path, AGORA)

    esperado = list(antes)
    esperado.insert(
        antes.index(f'  "generatedAt": "{_iso(gerado)}",') + 1,
        '  "checkedAt": "2026-09-14T12:00:00Z",',
    )
    assert _linhas(caminho) == esperado


def test_o_carimbo_seguinte_troca_so_a_propria_linha(tmp_path: Path) -> None:
    caminho = _publicar(
        tmp_path, _manifesto(AGORA - timedelta(days=4), conferido=AGORA - timedelta(days=2))
    )
    antes = _linhas(caminho)

    stamp_checked(tmp_path, AGORA)

    depois = _linhas(caminho)
    assert len(depois) == len(antes)
    assert [(a, d) for a, d in zip(antes, depois, strict=True) if a != d] == [
        ('  "checkedAt": "2026-09-12T12:00:00Z",', '  "checkedAt": "2026-09-14T12:00:00Z",')
    ]


def test_o_manifesto_carimbado_continua_no_contrato(tmp_path: Path) -> None:
    """E a geração não muda: o aviso ainda diz quando o conteúdo mudou."""
    caminho = _publicar(tmp_path, _manifesto(AGORA - timedelta(days=4)))

    stamp_checked(tmp_path, AGORA)

    documento = json.loads(caminho.read_text(encoding="utf-8"))
    validate_manifest(documento)
    assert documento["generatedAt"] == "2026-09-10T12:00:00Z"
    assert published(tmp_path) is not None


def test_o_manifesto_publicado_de_verdade_muda_so_no_carimbo(tmp_path: Path) -> None:
    """O arquivo que está no `main`, não um feito para o teste.

    Se a serialização do publicador e a do carimbo divergirem em qualquer coisa —
    ordem de campo, espaço, acento —, o primeiro carimbo reescreve o manifesto
    inteiro, e é aqui que isso aparece antes de virar commit.
    """
    publicado = RAIZ / "apps" / "web" / "public" / "indice" / "manifest.json"
    copia = tmp_path / "manifest.json"
    copia.write_bytes(publicado.read_bytes())
    antes = _linhas(copia)

    # Um dia depois de agora: vencido qualquer que seja o carimbo publicado.
    assert stamp_checked(tmp_path, datetime.now(UTC) + timedelta(days=1)) is not None

    mudou = [linha for linha in difflib.ndiff(antes, _linhas(copia)) if linha[:2] in ("- ", "+ ")]
    assert mudou
    assert all('"checkedAt"' in linha for linha in mudou), mudou


# --- o que o workflow lê ---------------------------------------------------------------


def test_a_saida_diz_se_carimbou(tmp_path: Path) -> None:
    _publicar(tmp_path / "indice", _manifesto(AGORA - timedelta(days=4)))
    decisao = decide(
        VERSAO, published(tmp_path / "indice"), generation=current_generation(CATEGORIAS)
    )
    saida = tmp_path / "github_output"

    write_github_output(decisao, str(saida), stamped=True)

    linhas = saida.read_text(encoding="utf-8").splitlines()
    assert "needs_index=false" in linhas
    assert "stamped=true" in linhas


def test_sem_carimbo_a_saida_diz_que_nao(tmp_path: Path) -> None:
    """O `if:` do workflow compara com 'true'; a saída diz o 'false' explicitamente."""
    _publicar(tmp_path / "indice", _manifesto(AGORA - timedelta(days=4)))
    decisao = decide(
        VERSAO, published(tmp_path / "indice"), generation=current_generation(CATEGORIAS)
    )
    saida = tmp_path / "github_output"

    write_github_output(decisao, str(saida))

    assert "stamped=false" in saida.read_text(encoding="utf-8").splitlines()


# --- o carimbo e o aviso do site -----------------------------------------------------


def test_o_carimbo_cabe_tres_vezes_no_limite_do_aviso() -> None:
    """O site avisa com 72 h sem verificação (`frescor.ts`); o carimbo sai a cada 24 h.

    Sobram dois dias para o Actions atrasar ou falhar antes de o aviso acender. Quem
    baixar o limite do site ou subir o intervalo daqui sem olhar o outro lado traz o
    alarme falso de volta — é para isso que este teste lê o arquivo do front.
    """
    frescor = (RAIZ / "apps" / "web" / "src" / "lib" / "frescor.ts").read_text(encoding="utf-8")
    achado = re.search(r"LIMITE_DE_IDADE_HORAS = (\d+);", frescor)
    assert achado is not None
    assert timedelta(hours=int(achado.group(1))) >= INTERVALO_DO_CARIMBO * 3
