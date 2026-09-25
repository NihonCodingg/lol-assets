/**
 * Botão — três variantes, e nenhuma a mais ([ADR 0024]).
 *
 * - **primário**: o destaque magenta com texto no grafite do fundo (6,04:1).
 *   É a ação que a tela existe para oferecer — "Baixar PNG", "Baixar zip" —, e
 *   há no máximo uma por contexto.
 * - **tonal**: a primária que se repete numa lista (T-89) — o fundo magenta
 *   escuro com a borda no destaque, cheia no hover.
 * - **contorno**: superfície elevada com a linha forte. A ação secundária:
 *   "Original", "Limpar seleção", fechar.
 * - **fantasma**: sem borda, ganha superfície no `hover`. Item de lista,
 *   ação dentro de campo.
 *
 * Sem sombra: a profundidade é a superfície mais clara. O tamanho é altura:
 * `28 · 30 · 32`, mais o `24` e o `26` dos botões-ícone (TOKENS.md).
 */
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type VarianteDoBotao = "primario" | "tonal" | "contorno" | "fantasma";
export type TamanhoDoBotao = "xs" | "sm" | "md" | "padrao" | "lg";

const VARIANTE: Record<VarianteDoBotao, string> = {
  primario: "bg-acento text-fundo font-semibold hover:bg-acento-forte",
  // A ação primária quando ela se repete numa lista (T-89): dez botões magenta
  // empilhados gritavam mais que a arte. Continua a principal da linha — tem o
  // destaque na borda e cheia no hover —, e a arte volta a mandar.
  tonal:
    "border border-acento/60 bg-acento-suave text-texto font-semibold hover:border-acento hover:bg-acento hover:text-fundo",
  contorno: "border border-linha-forte bg-superficie-alta text-texto hover:bg-campo",
  fantasma: "text-texto-suave hover:bg-superficie-alta hover:text-texto",
};

const TAMANHO: Record<TamanhoDoBotao, string> = {
  xs: "h-controle-xs w-controle-xs justify-center text-12",
  sm: "h-controle-sm w-controle-sm justify-center text-13",
  md: "h-controle-md px-2.5 text-13",
  padrao: "h-controle px-2.5 text-13",
  lg: "h-controle-lg px-2.5 text-13",
};

// `ComponentProps` e não `ButtonHTMLAttributes`: traz o `ref`, que no React 19 é
// prop comum — a bandeja do lote precisa dele para levar o foco (T-68).
export interface BotaoProps extends ComponentProps<"button"> {
  readonly variante?: VarianteDoBotao;
  readonly tamanho?: TamanhoDoBotao;
}

export function Botao({
  variante = "contorno",
  tamanho = "padrao",
  className,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-controle",
        "whitespace-nowrap font-interface",
        // `disabled` precisa parecer desabilitado: um botão que só ignora o
        // clique é indistinguível de um botão quebrado.
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTE[variante],
        TAMANHO[tamanho],
        className,
      )}
      {...resto}
    />
  );
}
