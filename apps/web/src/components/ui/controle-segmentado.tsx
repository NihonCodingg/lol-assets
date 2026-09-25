/**
 * Controle segmentado — uma escolha entre poucas, lado a lado ([ADR 0024]).
 *
 * Por baixo são rádios de verdade, escondidos, num `fieldset`: o nome do grupo
 * é a `legend`, as setas trocam a escolha (é o comportamento nativo do rádio),
 * e o anel de foco aparece no segmento inteiro. A escolha feita não se diz só
 * com cor: o segmento marcado ganha superfície, peso e contorno.
 */

import { useId } from "react";

import { ALVO_DE_TOQUE, cn } from "@/lib/utils";

export interface OpcaoSegmentada<T extends string> {
  readonly valor: T;
  readonly rotulo: string;
  /** Mostrado em texto secundário depois do rótulo, com algarismos tabulares. */
  readonly contagem?: number;
}

export interface ControleSegmentadoProps<T extends string> {
  /** O nome do grupo, para o leitor de tela. */
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoSegmentada<T>[];
  readonly valor: T;
  readonly onMudar: (valor: T) => void;
  readonly className?: string;
}

export function ControleSegmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
  className,
}: ControleSegmentadoProps<T>) {
  const nome = useId();
  return (
    <fieldset
      className={cn(
        "inline-flex min-w-0 flex-none items-center gap-0.5 rounded-controle border border-linha bg-superficie p-0.5",
        className,
      )}
    >
      <legend className="sr-only">{rotulo}</legend>
      {opcoes.map((opcao) => {
        const marcada = opcao.valor === valor;
        return (
          <label
            key={opcao.valor}
            className={cn(
              ALVO_DE_TOQUE,
              "inline-flex h-controle-sm cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2.5 text-13",
              "transition-colors duration-150 ease-saida",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento",
              marcada
                ? "border-linha-forte bg-superficie-alta font-semibold text-texto"
                : "border-transparent text-texto-suave hover:text-texto",
            )}
          >
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={marcada}
              onChange={() => onMudar(opcao.valor)}
              className="sr-only"
            />
            {opcao.rotulo}
            {opcao.contagem !== undefined && (
              <span aria-hidden="true" className="font-normal tabular-nums text-texto-suave">
                {opcao.contagem.toLocaleString("pt-BR")}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
