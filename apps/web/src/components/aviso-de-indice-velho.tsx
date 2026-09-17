"use client";

/**
 * O aviso de índice velho (T-31).
 *
 * Discreto de propósito, e `role="status"` em vez de `role="alert"`: não é uma
 * emergência que interrompe quem está no meio de baixar uma splash — é uma
 * informação que precisa estar na tela para quem for olhar. Leitor de tela
 * anuncia sem cortar o que estava sendo lido.
 *
 * No telefone ele é mais baixo — letra de 10 px e menos respiro (T-49): em
 * 375×720, com ele na tela, a lista de uma categoria chegou a ficar sem nenhuma
 * linha à vista.
 */

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
    <p
      role="status"
      data-indice="velho"
      className="flex-none border-b border-borda bg-acento-suave px-3.5 py-1.5 text-10 leading-cartao text-texto-medio md:py-2 md:text-11"
    >
      Este índice foi gerado há {idadeEmPalavras(frescor.horas)}, em{" "}
      <time dateTime={manifest.generatedAt}>{dataLegivel(frescor.geradoEm)}</time>. A
      indexação automática pode ter parado — o que está aqui continua funcionando, mas pode
      não ser o patch mais recente.
    </p>
  );
}
