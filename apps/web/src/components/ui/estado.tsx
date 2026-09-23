/**
 * Estado — o que a tela mostra quando não há o que mostrar (T-50).
 *
 * Vazio, erro de rede, página que não existe: antes cada um tinha uma frase
 * solta, num tamanho e numa cor diferentes, e o erro vinha em inglês cru
 * ("Failed to fetch") sem dizer o que fazer. Agora os três falam igual:
 *
 * - um **ícone**, que diz o tipo de coisa antes da leitura;
 * - um **título**, que diz o que aconteceu em português;
 * - o **que fazer**, numa frase;
 * - o **detalhe técnico**, pequeno e em mono, para quem precisa relatar;
 * - a **ação**, quando existe uma — "Tentar de novo", "Limpar filtros".
 *
 * Erro não é vermelho: o tema tem um acento só (ver o `TOKENS.md`), e o estado
 * é dito pelo ícone e pelo texto. O papel acessível vem de fora — `status` para
 * o vazio, que informa; `alert` para o erro, que interrompe.
 */

import type { LucideIcon } from "lucide-react";
import type { AriaRole, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EstadoProps {
  readonly icone: LucideIcon;
  readonly titulo: string;
  /** O que fazer, numa frase. */
  readonly children?: ReactNode;
  /** O motivo técnico, como veio — "HTTP 503", "Failed to fetch". */
  readonly detalhe?: string;
  readonly acao?: ReactNode;
  readonly role?: AriaRole;
  readonly className?: string;
}

export function Estado({
  icone: Icone,
  titulo,
  children,
  detalhe,
  acao,
  role,
  className,
}: EstadoProps) {
  return (
    <div
      role={role}
      className={cn("flex flex-col items-center gap-2 px-3.5 py-16 text-center", className)}
    >
      <div className="mb-1 grid size-10 place-items-center rounded-controle border border-linha-forte bg-superficie-alta text-texto-suave">
        <Icone aria-hidden="true" strokeWidth={1.75} className="size-5" />
      </div>
      <p className="text-14 font-semibold text-texto">{titulo}</p>
      {children && <div className="max-w-md text-13 leading-cartao text-texto-suave">{children}</div>}
      {detalhe && <p className="tabular-nums text-11 text-texto-suave">{detalhe}</p>}
      {acao && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acao}</div>}
    </div>
  );
}
