/**
 * A marca: um quadro 16:9 dentro de quatro marcas de corte ([ADR 0024]).
 *
 * O símbolo sai do conceito do site — o bin do editor —, e não do jogo: nada
 * de dourado, de hextech ou de moldura da Riot. É desenhado na cor do texto; o
 * destaque magenta fica para interação. O mesmo desenho é o favicon
 * (`app/icon.svg`), e por isso ele é feito de traços grossos o bastante para
 * sobreviver a 16 px.
 */

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function SimboloDaMarca({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={cn("size-5 flex-none", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
    >
      <path d="M1.5 6V1.5H6M14 1.5h4.5V6M18.5 14v4.5H14M6 18.5H1.5V14" />
      <rect x="4.5" y="6.9" width="11" height="6.2" rx="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Marca({ className }: { readonly className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-texto", className)}>
      <SimboloDaMarca />
      <span className="text-14 font-extrabold tracking-marca whitespace-nowrap">{siteConfig.displayName}</span>
    </span>
  );
}
