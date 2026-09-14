/**
 * Esqueleto — o lugar do conteúdo enquanto ele não chega (T-45).
 *
 * É a única animação do design ("pulse", 1,2 s), e ela existe para dizer
 * "carregando" sem um texto no meio da tela. Sempre `aria-hidden`: quem usa
 * leitor de tela ouve o estado pelo texto de carregamento da tela, não por um
 * retângulo piscando.
 */

import { cn } from "@/lib/utils";

export function Esqueleto({ className }: { readonly className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulsar rounded-padrao bg-campo", className)} />;
}
