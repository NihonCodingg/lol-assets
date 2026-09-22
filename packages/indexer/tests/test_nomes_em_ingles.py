"""T-74 — o nome em inglês de campeões e skins chega ao catálogo.

Conferido na produção em 22/09/2026: os 173 campeões e as 2.121 skins do índice
publicado já trazem `names.en_US`, e a busca do front já procura por ele. O que
faltava era uma guarda: a fixture do tarball usa o mesmo nome nos dois idiomas, e
nenhum teste percebia se o inglês deixasse de ser lido — a busca por "God Staff
Jax" morreria calada. Aqui os dois nomes são diferentes de propósito.
"""

from __future__ import annotations

import copy

from lol_assets_indexer.adapters.records import build_champion_snapshots
from lol_assets_indexer.adapters.tarball import TarballScan


def _com_nomes_em_ingles(scan: TarballScan) -> TarballScan:
    """O `scan` da sessão, com os nomes do ddragon em inglês de verdade."""
    outro = copy.deepcopy(scan)
    jax = outro.champions["en_US"]["Jax"]
    jax["title"] = "the Grandmaster at Arms"
    for skin in jax["skins"]:
        if int(skin["num"]) == 4:
            skin["name"] = "God Staff Jax"
    return outro


def test_a_skin_leva_o_nome_em_ingles_ao_lado_do_em_portugues(scan: TarballScan) -> None:
    fichas = build_champion_snapshots(_com_nomes_em_ingles(scan))
    jax = next(f for f in fichas if f.champion_id == "Jax")
    skin = next(s for s in jax.skins if s.num == 4)

    assert skin.names.en_US == "God Staff Jax"
    assert skin.names.pt_BR == "Jax Deus da Guerra", "a exibição continua em pt-BR"


def test_o_campeao_leva_o_titulo_em_ingles(scan: TarballScan) -> None:
    fichas = build_champion_snapshots(_com_nomes_em_ingles(scan))
    jax = next(f for f in fichas if f.champion_id == "Jax")

    assert jax.title.en_US == "the Grandmaster at Arms"
    assert jax.names.en_US == "Jax"


def test_toda_skin_e_todo_campeao_tem_nome_em_ingles(scan: TarballScan) -> None:
    """Sem o `en_US`, a busca em inglês não acha nada, e ninguém vê o erro."""
    for ficha in build_champion_snapshots(scan):
        assert ficha.names.en_US, ficha.champion_id
        for skin in ficha.skins:
            assert skin.names.en_US, (ficha.champion_id, skin.num)
