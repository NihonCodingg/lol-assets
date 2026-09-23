"use client";

/**
 * O hover do tile, uma vez só para a grade inteira (T-81).
 *
 * O hover parado do [ADR 0024] — marcas de corte nos cantos e o download
 * rápido do square — foi primeiro desenhado dentro de cada tile. Medido no A/B
 * local: a home passou de 1.387 para 2.751 nós, e a grade levava 14 ms a mais
 * para existir (86 ms com a CPU 4× mais lenta). O orçamento do primeiro tile
 * (§7 do Plano de Design) não tinha essa folga.
 *
 * Aqui há **uma** sobreposição, que vai para cima do tile sob o ponteiro ou com
 * o foco. Quem a move é o tile, por uma alça imperativa: passar o ponteiro pela
 * grade não redesenha os 173 tiles, só este componente.
 *
 * Em tela de toque não há hover, e ela não aparece: o download está no painel,
 * a um toque. O teclado tem a tecla `D` no tile focado.
 */

import { Download } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import type { CatalogChampion } from "@lol-assets/schema";

import { MarcasDeCorte } from "@/components/ui/quadro";
import { baixarSquare } from "@/lib/download-rapido";
import { cn } from "@/lib/utils";

export interface AlcaDasAcoes {
  /** Põe a sobreposição sobre a arte deste tile. */
  readonly mostrar: (arte: HTMLElement, champion: CatalogChampion) => void;
  readonly esconder: () => void;
}

interface Posicao {
  readonly champion: CatalogChampion;
  readonly x: number;
  readonly y: number;
  readonly lado: number;
}

export function AcoesDoTile({
  alca,
  assetsBaseUrl,
}: {
  readonly alca: Ref<AlcaDasAcoes>;
  readonly assetsBaseUrl?: string;
}) {
  const [posicao, setPosicao] = useState<Posicao | null>(null);

  useImperativeHandle(
    alca,
    () => ({
      mostrar(arte, champion) {
        // Relativo ao contêiner da grade, que é o pai posicionado desta camada.
        const pai = arte.closest("[data-grade-com-acoes]");
        if (!(pai instanceof HTMLElement)) return;
        const a = arte.getBoundingClientRect();
        const p = pai.getBoundingClientRect();
        setPosicao({ champion, x: a.left - p.left, y: a.top - p.top, lado: a.width });
      },
      esconder() {
        setPosicao(null);
      },
    }),
    [],
  );

  if (!posicao) return null;
  const nome = posicao.champion.names.pt_BR;
  return (
    <div
      data-acoes-do-tile=""
      className="pointer-events-none absolute pointer-coarse:hidden"
      style={{ left: posicao.x, top: posicao.y, width: posicao.lado, height: posicao.lado }}
    >
      <MarcasDeCorte lado="dentro" />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Baixar o square de ${nome} (PNG)`}
        title={`Baixar ${posicao.champion.championId}_square.png`}
        onClick={() => void baixarSquare(posicao.champion, assetsBaseUrl)}
        className={cn(
          "pointer-events-auto absolute right-1.5 bottom-1.5 grid size-8 cursor-pointer place-items-center rounded-controle",
          "border border-linha-forte bg-superficie-alta text-texto hover:border-acento hover:text-acento",
        )}
      >
        <Download aria-hidden="true" strokeWidth={2} className="size-4" />
      </button>
    </div>
  );
}
