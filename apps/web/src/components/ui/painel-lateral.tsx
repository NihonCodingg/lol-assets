"use client";

/**
 * O painel sobre Radix Dialog ([ADR 0011]): na borda direita ou, com
 * `centralizado`, no centro da tela (T-89).
 *
 * Este é o único primitivo que justifica a dependência do Radix, e justifica
 * bem: o painel do design é um diálogo modal com véu, e um diálogo modal escrito
 * à mão erra sempre nas mesmas três coisas — o foco não fica preso dentro dele,
 * o fundo continua rolando atrás, e o leitor de tela continua lendo a página
 * embaixo como se ela estivesse acessível.
 *
 * **O momento de abrir (T-83).** Com `origem` — a caixa do tile tocado —, o
 * painel nasce do tamanho e na posição do tile e cresce até o lugar dele, em
 * 240 ms: é a única animação elaborada do site ([ADR 0024]). Escala uniforme,
 * para a arte não se deformar no caminho, e só `transform` e `opacity`. Com
 * `prefers-reduced-motion`, ele simplesmente aparece.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import { useFocoDeVolta } from "@/lib/foco";
import { cn } from "@/lib/utils";

/** A duração do crescimento do tile ao painel. */
export const DURACAO_DA_ABERTURA_MS = 240;

export interface PainelLateralProps {
  readonly aberto: boolean;
  readonly onFechar: () => void;
  /** Lido por leitor de tela como o nome do diálogo. Obrigatório. */
  readonly titulo: string;
  readonly children: ReactNode;
  readonly className?: string;
  /**
   * Se `Escape` e o clique fora fecham o painel.
   *
   * O padrão é o do Radix, que é o certo para um diálogo novo. O painel do
   * campeão desliga o `Escape`, que ele trata com ordem própria (ampliação e
   * chroma primeiro); desde o T-89, no centro da tela, fecha por clique fora.
   */
  readonly fecharPorEsc?: boolean;
  readonly fecharPorFora?: boolean;
  /** A caixa do tile de onde o painel nasce. Sem ela, o painel só aparece. */
  readonly origem?: DOMRect | null;
  /**
   * No centro da tela, e não na borda direita (T-89). Centrado por `inset-0` e
   * margem automática, e não por `translate`: o crescimento do tile anima o
   * `transform`, e um `translate` de centralização seria apagado por ele.
   */
  readonly centralizado?: boolean;
}

/** Faz o painel crescer da caixa do tile até a dele. Devolve se animou. */
export function crescerDe(elemento: HTMLElement, origem: DOMRect): boolean {
  if (typeof elemento.animate !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const alvo = elemento.getBoundingClientRect();
  if (alvo.width === 0 || alvo.height === 0) return false;
  const escala = origem.width / alvo.width;
  const dx = origem.left - alvo.left;
  const dy = origem.top - alvo.top;
  elemento.animate(
    [
      { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${escala})`, opacity: 0.4 },
      { transformOrigin: "0 0", transform: "none", opacity: 1 },
    ],
    { duration: DURACAO_DA_ABERTURA_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  return true;
}

export function PainelLateral({
  aberto,
  onFechar,
  titulo,
  children,
  className,
  fecharPorEsc = true,
  fecharPorFora = true,
  origem = null,
  centralizado = false,
}: PainelLateralProps) {
  const conteudo = useRef<HTMLDivElement>(null);
  const foco = useFocoDeVolta();

  // Antes de pintar: o primeiro quadro já é o painel do tamanho do tile.
  useLayoutEffect(() => {
    if (aberto && origem && conteudo.current) crescerDe(conteudo.current, origem);
    // Só na abertura: trocar de skin não pode fazer o painel crescer de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return (
    <Dialog.Root open={aberto} onOpenChange={(proximo) => !proximo && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20" style={{ background: "var(--veu)" }} />
        <Dialog.Content
          ref={conteudo}
          tabIndex={-1}
          data-foco-contido=""
          aria-label={titulo}
          aria-describedby={undefined}
          // Ao abrir, o foco vai para o painel, e não para o primeiro botão dele
          // (T-47): a dica "Fechar (Esc)" abria toda vez por cima da arte. O
          // primeiro Tab chega no fechar do mesmo jeito.
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            foco.guardar();
            conteudo.current?.focus();
          }}
          // Ao fechar, o foco volta a quem abriu — o cartão, a busca (T-71).
          onCloseAutoFocus={foco.devolver}
          onEscapeKeyDown={(evento) => !fecharPorEsc && evento.preventDefault()}
          onPointerDownOutside={(evento) => !fecharPorFora && evento.preventDefault()}
          onInteractOutside={(evento) => !fecharPorFora && evento.preventDefault()}
          className={cn(
            "fixed z-25 flex flex-col bg-superficie-alta",
            centralizado
              ? "inset-0 md:m-auto md:h-[min(900px,94vh)] md:w-[min(1320px,95vw)] md:rounded-painel md:border md:border-linha-forte"
              : "inset-y-0 right-0 w-[min(540px,74%)] border-l border-linha-forte",
            className,
          )}
        >
          {/* O título existe para o leitor de tela mesmo quando a tela mostra
              um cabeçalho próprio: um diálogo sem nome é um diálogo que ninguém
              anuncia. */}
          <Dialog.Title className="sr-only">{titulo}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
