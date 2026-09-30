"""Medição de imagem. Lê, nunca escreve.

O ADR 0001 diz que o indexador serve os bytes de origem e nunca re-encoda. Por
isso este módulo só abre a imagem para descobrir dimensão, formato e canal alfa —
e há um teste que falha se aparecer uma chamada de escrita aqui dentro.
"""

from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass
from typing import Literal

from PIL import Image

ImageFormat = Literal["png", "jpeg", "svg"]

_FORMAT_ALIASES = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png"}


class UnsupportedImageFormatError(ValueError):
    """Formato fora do contrato: o índice declara `png`, `jpeg` e `svg`."""


@dataclass(frozen=True, slots=True)
class MeasuredImage:
    """O que o contrato precisa saber sobre um arquivo, medido dele mesmo."""

    width: int
    height: int
    format: ImageFormat
    has_alpha: bool
    bytes: int
    sha256: str


def measure(data: bytes) -> MeasuredImage:
    """Mede os bytes recebidos. Não os transforma."""
    if _eh_svg(data):
        return _medir_svg(data)
    with Image.open(io.BytesIO(data)) as image:
        raw_format = (image.format or "").lower()
        image_format = _FORMAT_ALIASES.get(raw_format)
        if image_format is None:
            raise UnsupportedImageFormatError(
                f"formato {raw_format!r} não faz parte do contrato (só png e jpeg)"
            )
        has_alpha = _has_real_alpha(image)
        width, height = image.width, image.height

    return MeasuredImage(
        width=width,
        height=height,
        format=image_format,  # type: ignore[arg-type]
        has_alpha=has_alpha,
        bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )


def _has_real_alpha(image: Image.Image) -> bool:
    """Modo com alfa não basta: o S1 mediu PNGs RGBA totalmente opacos.

    O que importa para o ADR 0001 é se existe pixel translúcido de verdade — é
    isso que decide se o asset pode ou não virar JPEG.
    """
    if image.mode not in {"RGBA", "LA", "PA", "P"} and "transparency" not in image.info:
        return False
    alpha = image.convert("RGBA").getchannel("A")
    # `getextrema()` devolve (min, max) numa banda só, mas a tipagem do Pillow
    # também cobre imagens multibanda, onde cada item é uma tupla.
    minimum = alpha.getextrema()[0]
    if isinstance(minimum, tuple):
        minimum = minimum[0]
    return bool(minimum < 255)


# --- SVG (T-93, ADR 0026) ------------------------------------------------------------------
#
# Vetor não tem resolução: `width` e `height` são as do desenho, lidas dos atributos
# da raiz (ou do `viewBox`), e o PNG de qualquer tamanho sai no navegador. O arquivo
# não é aberto por renderizador nenhum — só o texto da raiz é lido, e nada é escrito.

_RAIZ_SVG = re.compile(rb"<svg\b[^>]*>", re.IGNORECASE | re.DOTALL)


def _eh_svg(data: bytes) -> bool:
    return _RAIZ_SVG.search(data[:4096]) is not None and not data.startswith(b"\x89PNG")


def _atributo(raiz: bytes, nome: bytes) -> str | None:
    achado = re.search(rb"\s" + nome + rb'\s*=\s*["\']([^"\']*)["\']', raiz)
    return achado.group(1).decode("ascii", "replace") if achado else None


def _numero(valor: str | None) -> float | None:
    if not valor:
        return None
    achado = re.match(r"\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$", valor)
    return float(achado.group(1)) if achado else None


def _medir_svg(data: bytes) -> MeasuredImage:
    raiz_encontrada = _RAIZ_SVG.search(data[:4096])
    assert raiz_encontrada is not None
    raiz = raiz_encontrada.group(0)
    largura = _numero(_atributo(raiz, b"width"))
    altura = _numero(_atributo(raiz, b"height"))
    if largura is None or altura is None:
        caixa = (_atributo(raiz, b"viewBox") or "").replace(",", " ").split()
        if len(caixa) != 4:
            raise UnsupportedImageFormatError("svg sem width/height nem viewBox")
        largura, altura = float(caixa[2]), float(caixa[3])
    if largura <= 0 or altura <= 0:
        raise UnsupportedImageFormatError("svg com medida não positiva")
    return MeasuredImage(
        width=max(1, round(largura)),
        height=max(1, round(altura)),
        format="svg",
        # Vetor não tem fundo: o que não é desenho é transparente.
        has_alpha=True,
        bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )
