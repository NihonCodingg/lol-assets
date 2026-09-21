"use client";

/**
 * O foco volta para onde estava quando a camada fecha (T-71).
 *
 * O painel do campeão e a ampliação são `Dialog` do Radix sem `Dialog.Trigger`:
 * abrem por estado — o cartão, a busca, o botão de ampliar. No modo modal o
 * Radix devolve o foco ao gatilho ao fechar, e sem gatilho ele caía no `body`.
 * Medido na produção em 21/09/2026: em 9 de 10 caminhos de fechar, quem usa
 * teclado voltava ao topo da página e perdia o lugar na grade.
 *
 * Isto guarda quem tinha o foco quando a camada abriu e devolve a ele. Se ele
 * saiu da tela no meio do caminho (um tile da galeria virtual que rolou para
 * longe), o foco vai para o conteúdo — o mesmo alvo do "Ir para o conteúdo".
 */
import { useCallback, useRef } from "react";

export function focarConteudo(): void {
  document.getElementById("conteudo")?.focus({ preventScroll: true });
}

export function useFocoDeVolta() {
  const origem = useRef<HTMLElement | null>(null);

  /** Para o `onOpenAutoFocus`: roda antes de o foco entrar na camada. */
  const guardar = useCallback(() => {
    const ativo = document.activeElement;
    origem.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
  }, []);

  /** Para o `onCloseAutoFocus`, que o Radix chama também quando a camada sai do DOM. */
  const devolver = useCallback((evento: Event) => {
    evento.preventDefault();
    const alvo = origem.current;
    origem.current = null;
    if (alvo?.isConnected) alvo.focus({ preventScroll: true });
    else focarConteudo();
  }, []);

  return { guardar, devolver };
}
