"use client";

/**
 * O aviso de índice velho (T-31).
 *
 * Discreto de propósito, e `role="status"` em vez de `role="alert"`: não é uma
 * emergência que interrompe quem está no meio de baixar uma splash — é uma
 * informação que precisa estar na tela para quem for olhar. Leitor de tela
 * anuncia sem cortar o que estava sendo lido.
 *
 * **No vocabulário do redesenho (T-50):** ícone, a frase principal em destaque e
 * o detalhe depois, como os outros estados. Continua dizendo a idade, a data e
 * que o site segue funcionando — o que ele não pode é parecer um erro.
 *
 * No telefone ele é mais baixo — letra de 10 px e menos respiro (T-49): em
 * 375×720, com ele na tela, a lista de uma categoria chegou a ficar sem nenhuma
 * linha à vista.
 */

import { History } from "lucide-react";

import type { IndexManifest } from "@lol-assets/schema";

import { dataLegivel, idadeEmPalavras, medirFrescor } from "@/lib/frescor";

export interface AvisoDeIndiceVelhoProps {
  readonly manifest: IndexManifest;
  /** Injetável para o teste não depender do relógio da máquina. */
  readonly agora?: Date;
}

export function AvisoDeIndiceVelho({ manifest, agora }: AvisoDeIndiceVelhoProps) {
  const frescor = medirFrescor(manifest, agora);
  if (!frescor.velho) return null;

  return (
    <div
      role="status"
      data-indice="velho"
      className="flex flex-none items-start gap-2 border-b border-borda bg-acento-suave px-3.5 py-1.5 text-texto-medio md:items-center md:gap-2.5 md:py-2"
    >
      <History
        aria-hidden="true"
        strokeWidth={1.75}
        className="mt-px size-3.5 flex-none text-acento-mais-claro md:mt-0 md:size-4"
      />
      <p className="text-10 leading-cartao md:text-12">
        <strong className="font-medium text-texto-forte">O índice pode estar desatualizado.</strong>{" "}
        Ele foi gerado há {idadeEmPalavras(frescor.horas)}, em{" "}
        <time dateTime={manifest.generatedAt}>{dataLegivel(frescor.geradoEm)}</time>, e a
        atualização automática pode ter parado. O que está aqui continua funcionando, mas pode não
        ser o patch mais recente.
      </p>
    </div>
  );
}
