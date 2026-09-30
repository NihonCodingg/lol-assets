"""Os ícones das rotas — topo, selva, meio, atirador e suporte (T-93, ADR 0026).

Como os emblemas de elo (`ranked.py`), não há JSON que os liste: o cliente os
carrega pelo nome da posição. A lista é fechada e cada URL é conferida pela
medida. Vêm em **SVG**, a versão de maior qualidade que a fonte tem: o PNG que
o cliente usa tem 136 px, e o vetor dá um PNG de qualquer tamanho no navegador.
"""

from __future__ import annotations

import asyncio
import logging

from lol_assets_schema.models import Asset, LocalizedName

from lol_assets_indexer.http import SourceClient
from lol_assets_indexer.imaging import measure
from lol_assets_indexer.naming import asset_id, file_extension

logger = logging.getLogger(__name__)

POSITION_SVG_DIR = "plugins/rcp-fe-lol-static-assets/global/default/svg"

#: `(arquivo, nome em pt-BR, nome em inglês)`, na ordem do mapa, de cima para baixo.
ROTAS: tuple[tuple[str, str, str], ...] = (
    ("top", "Topo", "Top"),
    ("jungle", "Selva", "Jungle"),
    ("middle", "Meio", "Middle"),
    ("bottom", "Atirador", "Bottom"),
    ("utility", "Suporte", "Support"),
)


def position_icon_url(base: str, rota: str) -> str:
    return f"{base.rstrip('/')}/latest/{POSITION_SVG_DIR}/position-{rota}.svg"


async def fetch_position_icons(client: SourceClient) -> tuple[list[Asset], dict[str, str]]:
    """Os cinco ícones, medidos. Uma rota que falhar fica de fora; as outras entram."""
    base = client.settings.cdragon_base_url

    async def uma(rota: str, pt_br: str, en_us: str) -> Asset | None:
        url = position_icon_url(base, rota)
        try:
            medida = measure(await client.get_bytes(url))
        except Exception as erro:
            logger.info("ícone de rota ilegível", extra={"url": url, "kind": type(erro).__name__})
            return None
        return Asset(
            id=asset_id("position_icon", rota),
            type="position_icon",
            category="position",
            ref_id=rota,
            names=LocalizedName(pt_BR=pt_br, en_US=en_us),
            source="cdragon",
            source_url=url,
            file_name=f"Rota_{en_us}.{file_extension(medida.format)}",
            width=medida.width,
            height=medida.height,
            format=medida.format,
            has_alpha=medida.has_alpha,
            bytes=medida.bytes,
            sha256=medida.sha256,
        )

    resultados = await asyncio.gather(*(uma(*rota) for rota in ROTAS))
    assets = [asset for asset in resultados if asset is not None]
    logger.info(
        "ícones de rota indexados", extra={"declarados": len(ROTAS), "medidos": len(assets)}
    )
    return assets, {}
