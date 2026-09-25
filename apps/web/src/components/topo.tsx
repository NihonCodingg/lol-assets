"use client";

/**
 * O topo: a marca à esquerda e a busca no centro, com presença (T-80, §5 do
 * Plano de Design).
 *
 * Mora no layout, como a barra lateral, e atravessa as duas colunas. A busca
 * não nasce aqui: ela precisa do catálogo, que é da página, e a página a desenha
 * no miolo deste topo por portal (ver `navegacao-context.tsx`). Na página Sobre
 * o miolo fica vazio.
 *
 * No computador, a marca ocupa a largura da barra lateral e o miolo tem, à
 * direita, um respiro do mesmo tamanho: a busca fica no centro da janela, e não
 * no centro do que sobra. No telefone, só o símbolo, e a busca com o resto.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNavegacao } from "@/components/navegacao-context";
import { Marca } from "@/components/ui/marca";
import { ALVO_DE_TOQUE, cn } from "@/lib/utils";

export function Topo() {
  const { registrarLugarDaBusca, aberta } = useNavegacao();
  // Na home, até a busca chegar, o esqueleto dela segura o lugar — no HTML do
  // servidor inclusive. Em outra página o miolo fica vazio.
  const caminho = usePathname();
  const naHome = caminho === null || caminho === "/";
  return (
    <header className="relative z-20 flex h-topo flex-none items-center gap-2 border-b border-linha bg-superficie pr-3 md:col-span-2 md:gap-0 md:pr-0 baixa:static">
      <Link
        href="/"
        className={cn(
          ALVO_DE_TOQUE,
          "flex h-full flex-none items-center rounded-controle pl-3 md:w-barra-lateral md:pl-3.5",
        )}
      >
        {/* No telefone, com a busca no topo, o nome sai da vista e fica para o
            leitor de tela. Sem ela — dentro de uma categoria, ou no Sobre —, o
            nome volta (T-91): a faixa era só o símbolo e um vazio. */}
        <Marca className={cn(naHome && aberta === null && "[&>span:last-child]:max-md:sr-only")} />
      </Link>
      <div className="flex min-w-0 flex-1 justify-center md:pr-barra-lateral md:pl-3.5">
        <div className="w-full max-w-busca-max">
          <div ref={registrarLugarDaBusca} data-lugar-da-busca="" className="peer" />
          {naHome && (
            <div
              aria-hidden="true"
              className="hidden h-controle-xl animate-pulsar rounded-controle bg-superficie-alta peer-empty:block"
            />
          )}
        </div>
      </div>
    </header>
  );
}
