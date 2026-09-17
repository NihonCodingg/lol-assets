"use client";

/**
 * A vitrine: a splash da skin escolhida, grande, no topo do painel (T-47).
 *
 * É a primeira coisa que o painel mostra, porque é o que o editor veio buscar.
 * Antes, a arte aparecia numa miniatura de 96 px no meio de uma lista.
 *
 * **Duas camadas.** Embaixo, o *tile* da skin, desfocado: ele vem do catálogo e
 * existe desde o primeiro quadro, antes de a fatia de assets chegar. Por cima, a
 * splash centralizada, que entra quando carrega. Se a splash falhar, o *tile*
 * continua ali — a vitrine nunca fica preta.
 *
 * O nome vai sobre a arte, num véu que escurece só a faixa de baixo: o texto
 * precisa de contraste, e a arte precisa do resto do quadro.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface VitrineDaSkinProps {
  readonly titulo: string;
  readonly subtitulo: string;
  /** A splash centralizada da skin, quando a fatia já chegou. */
  readonly splash?: string;
  /** O *tile* 380×380 do catálogo: a vitrine enquanto a splash não chega. */
  readonly tile?: string;
}

export function VitrineDaSkin({ titulo, subtitulo, splash, tile }: VitrineDaSkinProps) {
  const [pronta, setPronta] = useState(false);
  // Trocar de skin troca a splash: a nova entra do zero, sobre o tile dela.
  useEffect(() => setPronta(false), [splash]);

  return (
    <div className="relative aspect-video max-h-[46vh] w-full overflow-hidden bg-campo">
      {tile && (
        // eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012)
        <img
          src={tile}
          alt=""
          aria-hidden="true"
          data-vitrine="tile"
          className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
        />
      )}
      {splash && (
        // eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012)
        <img
          key={splash}
          src={splash}
          // A splash é o conteúdo, não enfeite: é a arte que o editor veio buscar.
          alt={`Splash de ${titulo}`}
          data-vitrine="splash"
          onLoad={() => setPronta(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-200 ease-saida",
            pronta ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-fundo via-fundo/70 to-transparent px-5 pt-16 pb-4">
        <h2 className="text-22 font-semibold leading-apertada tracking-titulo text-texto">{titulo}</h2>
        <p className="mt-1 text-13 text-texto-medio">{subtitulo}</p>
      </div>
    </div>
  );
}
