/**
 * A página que não existe.
 *
 * Existe por causa do RF-21 no telefone (T-49): desde que os avisos da Riot
 * saíram da faixa do topo, cada página os põe no próprio fim — e a 404 padrão do
 * Next não põe nada. No computador eles continuam no pé da barra lateral.
 */

import Link from "next/link";

import { AvisosNoFim } from "@/components/avisos-da-riot";

export default function NaoEncontrada() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto baixa:overflow-visible">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3.5 py-16 text-center">
        <h1 className="text-20 font-semibold tracking-titulo">Página não encontrada</h1>
        <p className="text-14 text-texto-suave">O endereço não leva a nada por aqui.</p>
        <Link
          href="/"
          className="text-14 text-acento-forte underline underline-offset-2 hover:text-acento"
        >
          Voltar ao catálogo
        </Link>
      </div>
      <AvisosNoFim />
    </main>
  );
}
