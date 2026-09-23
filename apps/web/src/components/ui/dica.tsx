"use client";

/**
 * Dica — o nome de um botão que só tem ícone, para quem enxerga (T-45).
 *
 * Botão só com ícone precisa de nome em dois canais: `aria-label` para o leitor
 * de tela e uma dica para o olho. Esta é a segunda, sobre o Radix Tooltip, que o
 * [ADR 0011] já cobre ("shadcn sobre Radix"): abre no foco do teclado e no
 * *hover*, fecha no `Escape`, e se posiciona sozinha fora de contêiner que corta.
 *
 * **Cada dica traz o próprio provedor.** O Radix exige um `Tooltip.Provider`
 * acima de toda dica; com um global no layout, qualquer teste que monte um
 * componente sozinho quebraria. O custo — dicas vizinhas não compartilham o
 * atraso — é invisível numa tela onde elas aparecem uma de cada vez.
 *
 * **`aberta` força a dica aberta.** O Radix fecha a dica no clique: certo para
 * a dica que só nomeia o botão, errado para a que responde ao clique ("Link
 * copiado"). Com `aberta`, ela fica à vista enquanto o estado durar — no mouse,
 * no teclado e no toque, onde dica nenhuma abriria sozinha.
 */

import * as Tooltip from "@radix-ui/react-tooltip";
import { useState, type ReactNode } from "react";

export interface DicaProps {
  readonly texto: string;
  readonly children: ReactNode;
  readonly lado?: "top" | "right" | "bottom" | "left";
  /** Aberta além do *hover* e do foco — é assim que a dica responde a um clique. */
  readonly aberta?: boolean;
}

export function Dica({ texto, children, lado = "top", aberta = false }: DicaProps) {
  // Sempre controlada, porque alternar entre controlada e não controlada faz o
  // Radix reclamar. Ponteiro e foco continuam decidindo, pelo `onOpenChange`.
  const [pelaInteracao, setPelaInteracao] = useState(false);
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root open={aberta || pelaInteracao} onOpenChange={setPelaInteracao}>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={lado}
            sideOffset={6}
            className="z-50 rounded-controle border border-linha-forte bg-campo px-2 py-1 text-12 text-texto"
          >
            {texto}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
