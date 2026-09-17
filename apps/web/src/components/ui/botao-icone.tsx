/**
 * Botão só com ícone — quadrado, com nome obrigatório (T-45).
 *
 * `rotulo` é ao mesmo tempo o `aria-label` e o texto da dica, e o tipo não deixa
 * esquecer: um botão-ícone sem nome é um botão que o leitor de tela anuncia como
 * "botão" e mais nada.
 *
 * O ícone vem de fora, já com `aria-hidden`: o nome é o `rotulo`, nunca o desenho.
 *
 * **Dica leve (T-48).** Numa galeria virtual, cada linha que entra na tela monta
 * seis botões destes, e o Radix Tooltip de cada um custava ~2,5 ms por quadro de
 * rolagem — a diferença entre 60 quadros por segundo e 50. Com `dicaLeve`, a
 * dica é CSS: o mesmo desenho, aberta no *hover* e no foco do teclado, sem
 * JavaScript nenhum. O preço é não sair de contêiner que corta, então ela só
 * serve onde há espaço acima do botão. O nome continua no `aria-label`, e por
 * isso ela é `aria-hidden`.
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
  /** A dica em CSS, para listas longas. Ver o topo do arquivo. */
  readonly dicaLeve?: boolean;
}

export function BotaoIcone({
  rotulo,
  icone,
  dica,
  dicaAberta = false,
  dicaLeve = false,
  variante = "fantasma",
  className,
  ...resto
}: BotaoIconeProps) {
  const botao = (
    <Botao
      aria-label={rotulo}
      variante={variante}
      tamanho="md"
      className={cn("w-controle-md justify-center px-0", className)}
      {...resto}
    >
      {icone}
    </Botao>
  );

  if (!dicaLeve) {
    return (
      <Dica texto={dica ?? rotulo} aberta={dicaAberta}>
        {botao}
      </Dica>
    );
  }

  return (
    <span className="group/dica relative inline-flex">
      {botao}
      <span
        aria-hidden="true"
        data-dica={dicaAberta ? "aberta" : "fechada"}
        className={cn(
          "pointer-events-none absolute right-0 bottom-full z-10 mb-1.5 whitespace-nowrap",
          "rounded-tecla border border-borda-forte bg-campo-alto px-2 py-1 text-12 text-texto shadow-[var(--sombra-paleta)]",
          // O atraso do Radix (300 ms) no hover; no foco e no clique, na hora.
          "opacity-0 transition-opacity duration-150 ease-saida group-hover/dica:opacity-100 group-hover/dica:delay-300",
          "group-has-[:focus-visible]/dica:opacity-100 group-has-[:focus-visible]/dica:delay-0",
          dicaAberta && "opacity-100 delay-0",
        )}
      >
        {dica ?? rotulo}
      </span>
    </span>
  );
}
