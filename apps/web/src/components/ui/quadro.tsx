/**
 * O quadro — a única ousadia do conceito ([ADR 0024]).
 *
 * Todo asset aparece na proporção real dele, e a proporção vira informação
 * visual em vez de texto: o editor vê de relance qual arquivo serve para uma
 * thumbnail 16:9 (a tarefa T8 do Plano de Design).
 *
 * - `GlifoDeProporcao`: um retângulo vazado nas proporções exatas do arquivo.
 *   Splash é largo, tela de carregamento é alta, square é quadrado.
 * - `MarcasDeCorte`: os quatro cantos de uma prova de impressão. **Fora** do
 *   quadro, na prévia do painel, sobre a superfície; **dentro**, no hover e no
 *   foco do tile, em modo `difference` — o claro inverte a arte embaixo e a
 *   marca aparece sobre qualquer imagem, clara ou escura, sem sombra.
 * - O fundo xadrez é a utilidade `xadrez` do `globals.css`.
 */

import { cn } from "@/lib/utils";

export interface GlifoDeProporcaoProps {
  readonly largura: number;
  readonly altura: number;
  /** Lado da caixa em px; o retângulo cabe nela com 1 px de respiro. */
  readonly tamanho?: number;
  readonly className?: string;
}

/**
 * Decorativo: a resolução está escrita ao lado, e é ela que o leitor de tela lê.
 * Sem dimensão conhecida, desenha um quadrado tracejado — "não se sabe".
 */
export function GlifoDeProporcao({ largura, altura, tamanho = 16, className }: GlifoDeProporcaoProps) {
  const conhecida = largura > 0 && altura > 0;
  const util = tamanho - 2;
  const escala = conhecida ? util / Math.max(largura, altura) : 1;
  const w = conhecida ? Math.max(2, largura * escala) : util;
  const h = conhecida ? Math.max(2, altura * escala) : util;
  return (
    <svg
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      className={cn("flex-none text-texto-suave", className)}
      data-glifo={conhecida ? `${largura}x${altura}` : "desconhecido"}
    >
      <rect
        x={(tamanho - w) / 2 + 0.625}
        y={(tamanho - h) / 2 + 0.625}
        width={w - 1.25}
        height={h - 1.25}
        rx={0.75}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray={conhecida ? undefined : "2 1.5"}
      />
    </svg>
  );
}

export interface MarcasDeCorteProps {
  /** `fora`: nos cantos externos, sobre a superfície. `dentro`: sobre a arte. */
  readonly lado?: "fora" | "dentro";
  readonly className?: string;
}

const CANTOS = [
  "top-0 left-0 border-t-[1.5px] border-l-[1.5px]",
  "top-0 right-0 border-t-[1.5px] border-r-[1.5px]",
  "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]",
  "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]",
] as const;

/** Vai dentro de um pai `relative`. Sempre decorativo. */
export function MarcasDeCorte({ lado = "fora", className }: MarcasDeCorteProps) {
  return (
    <span
      aria-hidden="true"
      data-marcas-de-corte={lado}
      className={cn(
        "pointer-events-none absolute",
        lado === "fora" ? "-inset-2 text-texto-suave" : "inset-1.5 text-texto mix-blend-difference",
        className,
      )}
    >
      {CANTOS.map((canto) => (
        <span key={canto} className={cn("absolute size-2.5 border-current", canto)} />
      ))}
    </span>
  );
}
