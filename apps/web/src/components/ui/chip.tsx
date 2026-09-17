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

import { cn } from "@/lib/utils";

export interface ChipProps {
  readonly marcado: boolean;
  readonly onAlternar: () => void;
  readonly children: ReactNode;
}

export function Chip({ marcado, onAlternar, children }: ChipProps) {
  return (
    <label
      className={cn(
        "relative inline-flex h-controle-md cursor-pointer items-center whitespace-nowrap rounded-padrao border px-2.5 text-12",
        "transition-colors duration-150 ease-saida",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento",
        marcado
          ? "border-acento bg-acento-suave text-texto"
          : "border-borda-forte text-texto-suave hover:bg-campo hover:text-texto",
      )}
    >
      <input type="checkbox" className="sr-only" checked={marcado} onChange={onAlternar} />
      {children}
    </label>
  );
}
