"""A decisão de indexar ou não, e como ela chega ao Actions (T-13, T-38, T-51).

O workflow roda a cada 6 horas; a Riot publica um patch a cada duas semanas. Na
esmagadora maioria das execuções não há nada a fazer, e "nada a fazer" precisa
custar segundos, não os ~40 minutos de baixar 2,39 GB.

**Duas coisas fazem reindexar, não uma** (T-38). A versão do jogo é a óbvia. A
outra é o indexador mudar: o T-21 acrescentou etiquetas de filtro e o T-22
acrescentou emotes e wards, e nenhum dos dois teria chegado ao índice publicado
até a Riot lançar patch. O índice ficaria velho **de código** parecendo novo de
versão, e o único jeito de descobrir seria alguém reparar que o filtro não
filtra.

**"Nada a fazer" também deixa rastro** (T-51, [ADR 0018]). Sem ele, o site não
distingue "a Riot não lançou patch" de "a indexação parou": nos dois casos o
índice não muda. O carimbo de verificação grava no manifesto quando a indexação
automática conferiu o índice pela última vez — no máximo uma vez por dia.

Este módulo é a parte testável dessas decisões. O YAML só pergunta e obedece.
"""

from __future__ import annotations

import json
import logging
import os
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from lol_assets_schema import SCHEMA_VERSION
from lol_assets_schema.models import Generation, IndexManifest

from lol_assets_indexer.publish.storage import MANIFEST_KEY, prepare_manifest

logger = logging.getLogger(__name__)

#: Sobe **à mão** quando um construtor passa a produzir registro diferente.
#:
#: Não é hash do código-fonte de propósito: hash reindexaria 2,39 GB a cada
#: refatoração e a cada bump de dependência. O preço de ser manual é lembrar — e
#: o histórico abaixo existe para que "por que este número é 3?" tenha resposta
#: sem `git log`.
#:
#: 1. T-09 — a primeira indexação do patch inteiro.
#: 2. T-21 — etiquetas de filtro nas categorias não-campeão.
#: 3. T-22 — emotes e ward skins pelo cdragon, e a fusão das duas fontes.
#: 4. T-73 — uma fatia por campeão, apontada pelo catálogo (ADR 0023, contrato 2.0.0).
#: 5. T-76 — o arquivo de marcação (`_fpo`) sai do índice.
GERACAO_DO_INDEXADOR = 5

#: De quanto em quanto tempo, no máximo, uma execução sem patch novo carimba o
#: manifesto (ADR 0018).
#:
#: O site acende o aviso de índice velho com 72 h sem verificação
#: (`LIMITE_DE_IDADE_HORAS`, em `apps/web/src/lib/frescor.ts`). Medido em setembro
#: de 2026, o Actions atrasa o agendamento e chega a deixar ~10 h entre duas
#: execuções; com o carimbo a cada 24 h, o publicado não passa de ~34 h numa semana
#: normal, e o aviso só acende depois de mais ~38 h seguidas sem nenhuma execução
#: bem-sucedida. Carimbar a cada execução daria o mesmo aviso com quatro vezes mais
#: commits no `main` — e cada commit no `main` é um deploy de produção.
INTERVALO_DO_CARIMBO = timedelta(hours=24)


@dataclass(frozen=True, slots=True)
class Decision:
    """O que o workflow precisa saber para decidir se continua."""

    needs_index: bool
    latest: str
    indexed: str | None
    reason: str

    def as_github_output(self) -> str:
        return (
            f"needs_index={'true' if self.needs_index else 'false'}\n"
            f"game_version={self.latest}\n"
            f"indexed_version={self.indexed or ''}\n"
        )


@dataclass(frozen=True, slots=True)
class Publicado:
    """O que o índice publicado diz sobre si mesmo."""

    game_version: str
    schema_version: str
    #: `None` nos índices gerados antes do T-38.
    generation: Generation | None


def current_generation(categories: Iterable[str]) -> Generation:
    """A assinatura desta execução. `categories` é o que foi realmente emitido."""
    return Generation(indexer=GERACAO_DO_INDEXADOR, categories=sorted(set(categories)))


def published(output: Path) -> Publicado | None:
    """O que já está publicado no destino, ou `None`.

    Manifesto ilegível conta como ausente: melhor reindexar por causa de um
    arquivo corrompido do que ficar parado achando que está tudo certo.
    """
    manifesto = output / "manifest.json"
    if not manifesto.is_file():
        return None
    try:
        documento = IndexManifest.model_validate(json.loads(manifesto.read_text(encoding="utf-8")))
    except (ValueError, OSError) as erro:
        logger.info(
            "manifesto ilegível no destino; tratando como ausente",
            extra={"kind": type(erro).__name__},
        )
        return None
    return Publicado(
        game_version=documento.current_version,
        schema_version=documento.schema_version,
        generation=documento.generation,
    )


def indexed_version(output: Path) -> str | None:
    """Só a versão publicada, para quem só quer o número."""
    atual = published(output)
    return atual.game_version if atual else None


def _mudanca_de_categorias(atual: Generation, publicada: Generation) -> str | None:
    """O que entrou e o que saiu, ou `None` se o conjunto é o mesmo."""
    novas = sorted(set(atual.categories) - set(publicada.categories))
    sumidas = sorted(set(publicada.categories) - set(atual.categories))
    partes = []
    if novas:
        partes.append("entraram " + ", ".join(novas))
    if sumidas:
        partes.append("saíram " + ", ".join(sumidas))
    return "; ".join(partes) if partes else None


def decide(
    latest: str,
    indexed: Publicado | None,
    *,
    generation: Generation,
    schema_version: str = SCHEMA_VERSION,
) -> Decision:
    """Indexa quando a versão do jogo, o contrato **ou** a assinatura diferem.

    A versão do jogo é comparada por **diferença**, não por ordem: se o ddragon
    voltar atrás num patch, o índice tem que voltar junto — ele descreve o que a
    fonte serve hoje, não o que ela já serviu. Comparar por ordem faria o site
    continuar apontando para arquivos que a fonte não tem mais.

    O motivo diz **qual** dos três mudou. É o que alguém quer saber ao abrir o
    log de uma execução que baixou 2,39 GB às três da manhã.
    """
    atual = generation
    if indexed is None:
        return Decision(True, latest, None, "não há índice publicado")

    versao = indexed.game_version
    if versao != latest:
        return Decision(True, latest, versao, f"índice em {versao}, fonte em {latest}")

    if indexed.schema_version != schema_version:
        return Decision(
            True,
            latest,
            versao,
            f"contrato do índice mudou de {indexed.schema_version} para {schema_version}",
        )

    publicada = indexed.generation
    if publicada is None:
        return Decision(True, latest, versao, "índice publicado sem assinatura de geração")

    if publicada.indexer != atual.indexer:
        return Decision(
            True,
            latest,
            versao,
            f"assinatura: o indexador foi de {publicada.indexer} para {atual.indexer}",
        )

    mudanca = _mudanca_de_categorias(atual, publicada)
    if mudanca is not None:
        return Decision(True, latest, versao, f"assinatura: categorias mudaram — {mudanca}")

    return Decision(False, latest, versao, f"já indexado em {latest}")


def last_checked(manifest: IndexManifest) -> datetime:
    """Quando a indexação automática confirmou este índice pela última vez.

    O carimbo, quando há; senão a geração — gerar também é conferir, e é o que
    vale nos manifestos anteriores ao contrato 1.3.0. O mais recente dos dois, para
    um carimbo esquecido nunca envelhecer um índice recém-gerado. É a mesma regra
    do `horasSemVerificar` do front.
    """
    gerado = _instante(manifest.generated_at)
    if manifest.checked_at is None:
        return gerado
    return max(gerado, _instante(manifest.checked_at))


def stamp_checked(
    output: Path, now: datetime, *, every: timedelta = INTERVALO_DO_CARIMBO
) -> str | None:
    """Carimba `checkedAt` no manifesto publicado, se o último carimbo venceu.

    Devolve o carimbo gravado, ou `None` quando ainda não era hora. Só faz sentido
    depois de `decide` dizer "nada a fazer": carimbar é afirmar que o índice
    publicado é o do patch atual.

    Reserializa pelo mesmo `prepare_manifest` do publicador — validado contra o
    contrato antes de escrever —, então o arquivo muda numa linha só.
    """
    caminho = output / MANIFEST_KEY
    manifesto = IndexManifest.model_validate(json.loads(caminho.read_text(encoding="utf-8")))
    if now - last_checked(manifesto) < every:
        return None
    carimbo = now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    caminho.write_bytes(prepare_manifest(manifesto.model_copy(update={"checked_at": carimbo})))
    logger.info("verificação carimbada", extra={"checkedAt": carimbo})
    return carimbo


def _instante(texto: str) -> datetime:
    """`2026-09-10T08:09:41Z` como `datetime` com fuso. Sem fuso, vale UTC."""
    quando = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    return quando if quando.tzinfo else quando.replace(tzinfo=UTC)


def write_github_output(
    decision: Decision, path: str | None = None, *, stamped: bool = False
) -> None:
    """Escreve no `$GITHUB_OUTPUT`. Fora do Actions, não faz nada.

    `stamped` diz ao passo de commit se o manifesto ganhou carimbo (ADR 0018).
    """
    destino = path or os.environ.get("GITHUB_OUTPUT")
    if not destino:
        return
    with Path(destino).open("a", encoding="utf-8") as arquivo:
        arquivo.write(decision.as_github_output())
        arquivo.write(f"stamped={'true' if stamped else 'false'}\n")
