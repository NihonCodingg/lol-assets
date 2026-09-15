/**
 * Botão só com ícone — quadrado, com nome obrigatório (T-45).
 *
 * `rotulo` é ao mesmo tempo o `aria-label` e o texto da dica, e o tipo não deixa
 * esquecer: um botão-ícone sem nome é um botão que o leitor de tela anuncia como
 * "botão" e mais nada.
 *
 * O ícone vem de fora, já com `aria-hidden`: o nome é o `rotulo`, nunca o desenho.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Botao, type BotaoProps } from "./botao";
import { Dica } from "./dica";

export interface BotaoIconeProps extends Omit<BotaoProps, "children" | "aria-label" | "tamanho"> {
  /** O nome acessível e o texto da dica. */
  readonly rotulo: string;
  readonly icone: ReactNode;
  /** A dica pode dizer outra coisa por um instante — "Link copiado" — sem trocar o nome. */
  readonly dica?: string;
  /** Mostra a dica sem esperar o *hover*: é assim que ela responde a um clique. */
  readonly dicaAberta?: boolean;
}

export function BotaoIcone({
  rotulo,
  icone,
  dica,
  dicaAberta = false,
  variante = "fantasma",
  className,
  ...resto
}: BotaoIconeProps) {
  return (
    <Dica texto={dica ?? rotulo} aberta={dicaAberta}>
      <Botao
        aria-label={rotulo}
        variante={variante}
        tamanho="md"
        className={cn("w-controle-md justify-center px-0", className)}
        {...resto}
      >
        {icone}
      </Botao>
    </Dica>
  );
}
