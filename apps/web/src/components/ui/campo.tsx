/**
 * Campo de texto e a tecla (`kbd`) que aparece dentro dele.
 *
 * O `caret-acento` não é enfeite: no design o cursor do campo é magenta, e é o
 * único sinal de que o campo tem foco quando o anel de `:focus-visible` não
 * aparece — porque quem clicou com o mouse não recebe anel.
 */
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CampoProps = InputHTMLAttributes<HTMLInputElement>;

export function Campo({ className, ...resto }: CampoProps) {
  return (
    <input
      className={cn(
        "h-controle-lg w-full rounded-controle border border-linha-forte bg-superficie-alta",
        "font-interface text-14 text-texto caret-acento",
        "placeholder:text-texto-suave focus:border-acento",
        className,
      )}
      {...resto}
    />
  );
}

/** A tecla desenhada, como no campo de busca (`/`) e na paleta (`esc`). */
export function Tecla({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "rounded-controle border border-linha-forte px-1.5 py-px",
        "text-12 text-texto-suave",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
