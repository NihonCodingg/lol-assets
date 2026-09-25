/**
 * O filtro que liga e desliga — a função na grade de campeões, a etiqueta na
 * categoria (T-48). Eram o mesmo desenho escrito duas vezes.
 *
 * Por baixo é uma caixa de seleção de verdade, escondida: o nome acessível é o
 * texto do chip, o espaço marca e desmarca, e o anel de foco aparece no chip
 * inteiro — não num quadradinho invisível.
 *
 * `relative` não é enfeite: a caixa escondida é `position: absolute`, e sem um
 * ancestral posicionado ela escapa da linha que rola de lado no telefone e
 * alarga a página inteira (T-49) — o telefone passava a mostrar o site reduzido.
 */
import type { ReactNode } from "react";

import { ALVO_DE_TOQUE, cn } from "@/lib/utils";

export interface ChipProps {
  readonly marcado: boolean;
  readonly onAlternar: () => void;
  readonly children: ReactNode;
}

export function Chip({ marcado, onAlternar, children }: ChipProps) {
  return (
    <label
      className={cn(
        ALVO_DE_TOQUE,
        "inline-flex h-controle-md cursor-pointer items-center whitespace-nowrap rounded-controle border px-2.5 text-13",
        "transition-colors duration-150 ease-saida",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento",
        // Marcado em grafite elevado, com peso (T-91), como o controle segmentado:
        // o magenta fica para as ações e o foco. Nunca só a cor: superfície,
        // contorno e peso mudam juntos.
        marcado
          ? "border-linha-forte bg-campo font-semibold text-texto"
          : "border-linha text-texto-suave hover:bg-superficie-alta hover:text-texto",
      )}
    >
      <input type="checkbox" className="sr-only" checked={marcado} onChange={onAlternar} />
      {children}
    </label>
  );
}
