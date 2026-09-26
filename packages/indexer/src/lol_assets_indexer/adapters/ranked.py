"""Os emblemas de elo (T-92, ADR 0025).

Módulo à parte do `cdragon.py` de propósito: lá, todo caminho de asset sai do JSON
que o cliente declara, e um teste de varredura proíbe montar caminho (o S2 mediu
404 em 162 de 162 caminhos montados). Os emblemas **não têm** JSON que os liste —
o cliente os carrega pelo nome da divisão —, então aqui o caminho é montado, a
partir de uma lista fechada, e cada URL é conferida pela medida: a que não
responder fica de fora, com o 404 no log.
"""

from __future__ import annotations

import asyncio
import logging

from lol_assets_schema.models import Asset, LocalizedName

from lol_assets_indexer.http import SourceClient
from lol_assets_indexer.imaging import measure
from lol_assets_indexer.naming import asset_id, file_extension

logger = logging.getLogger(__name__)

#
# O ADR 0012 tirou a categoria `rank` da v1: o emblema montado só existia dentro do
# `ranked-emblems-latest.zip` da Riot, de 61,5 MB, e o cdragon tinha as peças soltas.
# Em 26/09/2026 o cdragon passou a servir o emblema montado de cada divisão, um PNG
# com alfa por elo, com CORS aberto (ADR 0025). Não há JSON que os liste: as dez
# divisões são um conjunto fechado, que a Riot muda de temporada em temporada — a
# Esmeralda entrou em 2023. Divisão nova entra aqui; divisão que sumir da fonte cai
# fora sozinha, com o 404 no log.

RANKED_EMBLEM_DIR = "plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem"

#: `(arquivo, nome em pt-BR, nome em inglês)`, na ordem do jogo.
ELOS: tuple[tuple[str, str, str], ...] = (
    ("iron", "Ferro", "Iron"),
    ("bronze", "Bronze", "Bronze"),
    ("silver", "Prata", "Silver"),
    ("gold", "Ouro", "Gold"),
    ("platinum", "Platina", "Platinum"),
    ("emerald", "Esmeralda", "Emerald"),
    ("diamond", "Diamante", "Diamond"),
    ("master", "Mestre", "Master"),
    ("grandmaster", "Grão-Mestre", "Grandmaster"),
    ("challenger", "Desafiante", "Challenger"),
)


def rank_emblem_url(base: str, elo: str) -> str:
    return f"{base.rstrip('/')}/latest/{RANKED_EMBLEM_DIR}/emblem-{elo}.png"


async def fetch_rank_emblems(client: SourceClient) -> tuple[list[Asset], dict[str, str]]:
    """Os dez emblemas, medidos. Um elo que falhar fica de fora; os outros entram."""
    base = client.settings.cdragon_base_url

    async def um(elo: str, pt_br: str, en_us: str) -> Asset | None:
        url = rank_emblem_url(base, elo)
        try:
            medida = measure(await client.get_bytes(url))
        except Exception as erro:
            logger.info("emblema de elo ilegível", extra={"url": url, "kind": type(erro).__name__})
            return None
        return Asset(
            id=asset_id("rank_emblem", elo),
            type="rank_emblem",
            category="rank",
            ref_id=elo,
            names=LocalizedName(pt_BR=pt_br, en_US=en_us),
            source="cdragon",
            source_url=url,
            file_name=f"Rank_{en_us}.{file_extension(medida.format)}",
            width=medida.width,
            height=medida.height,
            format=medida.format,
            has_alpha=medida.has_alpha,
            bytes=medida.bytes,
            sha256=medida.sha256,
        )

    resultados = await asyncio.gather(*(um(*elo) for elo in ELOS))
    assets = [asset for asset in resultados if asset is not None]
    logger.info(
        "emblemas de elo indexados", extra={"declarados": len(ELOS), "medidos": len(assets)}
    )
    return assets, {}
