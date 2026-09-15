"use client";

/**
 * A barra lateral — marca, categorias, seções e o aviso legal no pé.
 *
 * O nome do arquivo continua `rodape` porque é o que ele é para o **RF-21**: o
 * lugar por onde o aviso da Riot passa em toda página. O design não desenhou
 * rodapé nenhum — o layout dele é `100vh` em duas colunas — e a decisão de
 * 10/09 foi pôr o aviso aqui, no pé da coluna da esquerda, em vez de comer
 * altura da grade com uma faixa atravessada.
 *
 * As **categorias** entraram no T-41. Antes elas ficavam abaixo dos 173 cartões
 * de campeão, o que obrigava a rolar a grade inteira para chegar em "Itens".
 * Aqui elas estão sempre à vista, que é onde o design as desenhou.
 *
 * **T-46:** cada categoria ganhou ícone e contagem, e "Início" saiu — levava ao
 * mesmo lugar que "Campeões". A contagem fica **fora** do botão e só para o olho
 * (`aria-hidden`): dentro, ela entraria no nome acessível, e quem procura o
 * botão "Itens" acharia "Itens 868". Os avisos passaram da fonte mono para a da
 * interface: continuam inteiros e literais, e deixam de parecer um bloco de
 * código no pé da tela.
 *
 * O quadrado violeta de 20px no topo é a marca do design. Ele não é logotipo: é
 * o acento, do tamanho que o desenho pede, no lugar que o desenho reservou para
 * `[ nome do produto ]`.
 */

import {
  CircleUserRound,
  CodeXml,
  Eye,
  Hexagon,
  Info,
  Map as Mapa,
  Shapes,
  ShoppingBag,
  Sparkles,
  Swords,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useNavegacao } from "@/components/navegacao-context";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** Um desenho por categoria, do mesmo conjunto ([ADR 0017]). Categoria nova cai em `Shapes`. */
const ICONE_DA_CATEGORIA: Readonly<Record<string, LucideIcon>> = {
  item: ShoppingBag,
  rune: Hexagon,
  summoner_spell: Zap,
  profile_icon: CircleUserRound,
  emote: Sparkles,
  ward: Eye,
  map: Mapa,
  misc: Shapes,
};

/** O traço padrão do lucide, 2 px, pesa demais a 16 px ao lado de texto de 13. */
const TRACO = 1.75;

const ITEM_DE_SECAO = cn(
  "flex items-center gap-2.5 rounded-padrao px-2 py-1.5 text-13 text-texto-suave",
  "transition-colors duration-150 ease-saida hover:bg-campo hover:text-texto",
);

export function Rodape() {
  const { categorias, campeoes, aberta, abrir } = useNavegacao();

  return (
    <aside className="flex min-h-0 flex-row flex-wrap items-center gap-x-2 border-b border-borda bg-superficie md:flex-col md:flex-nowrap md:items-stretch md:gap-x-0 md:overflow-y-auto md:border-b-0 md:border-r">
      {/* A marca leva para a home. Com "Início" fora (T-46), é o caminho de
          volta de quem está na página Sobre. */}
      <Link href="/" className="flex h-cabecalho flex-none items-center gap-2 rounded-padrao px-3.5">
        <div className="size-5 flex-none rounded-marca bg-acento" aria-hidden="true" />
        <span className="text-13 font-semibold tracking-marca text-texto-forte">
          {siteConfig.displayName}
        </span>
      </Link>

      {/* Sem provedor — como no teste do T-27, que monta este componente sozinho
          — a lista vem vazia e a barra desenha só o resto. */}
      {categorias.length > 0 && (
        <nav
          aria-label="Categorias"
          className="flex w-full flex-row flex-wrap gap-0.5 px-2 md:w-auto md:flex-none md:flex-col md:flex-nowrap"
        >
          <span className="hidden px-2 pt-1.5 pb-1 font-mono text-10 uppercase tracking-rotulo text-texto-suave md:block">
            Categorias
          </span>
          {/* RF-04: campeão é a navegação padrão, e no design ele é a primeira
              categoria da lista. `null` é a grade de campeões. */}
          <ItemDeCategoria
            rotulo="Campeões"
            icone={Swords}
            total={campeoes ?? undefined}
            ativo={aberta === null}
            onClick={() => abrir(null)}
          />
          {categorias.map((categoria) => (
            <ItemDeCategoria
              key={categoria.category}
              rotulo={categoria.rotulo}
              icone={ICONE_DA_CATEGORIA[categoria.category] ?? Shapes}
              total={categoria.total}
              ativo={aberta === categoria.category}
              onClick={() => abrir(categoria.category)}
            />
          ))}
        </nav>
      )}

      <nav
        aria-label="Seções"
        className="flex w-full flex-row flex-wrap gap-0.5 px-2 md:mt-3 md:w-auto md:flex-none md:flex-col md:flex-nowrap"
      >
        <span className="hidden px-2 pt-1.5 pb-1 font-mono text-10 uppercase tracking-rotulo text-texto-suave md:block">
          Projeto
        </span>
        <Link href="/sobre" className={ITEM_DE_SECAO}>
          <Info aria-hidden="true" strokeWidth={TRACO} className="hidden size-4 flex-none md:block" />
          Sobre e créditos
        </Link>
        <a href={siteConfig.repositoryUrl} className={ITEM_DE_SECAO}>
          <CodeXml aria-hidden="true" strokeWidth={TRACO} className="hidden size-4 flex-none md:block" />
          Código
        </a>
      </nav>

      {/* RF-21: os dois textos da Riot, **inteiros**, em toda página — o do
          Developer Portal e o do Legal Jibber Jabber (ver `site-config.ts`). Em
          tela estreita eles ocupam a linha toda da faixa em vez de serem
          cortados: "visível" com reticências não é visível. `mt-auto` põe o
          rodapé no pé da coluna quando há coluna. `lang="en"` porque o texto é
          copiado, não traduzido. */}
      <footer className="flex w-full flex-none flex-col gap-2 px-3.5 pb-2 md:mt-auto md:w-auto md:border-t md:border-borda md:pt-3 md:pb-3.5">
        <p data-aviso="riot" lang="en" className="text-10 leading-solta text-texto-suave">
          {siteConfig.riotLegalNotice}
        </p>
        <p data-aviso="jibber-jabber" lang="en" className="text-10 leading-solta text-texto-suave">
          {siteConfig.riotJibberJabberNotice}
        </p>
      </footer>
    </aside>
  );
}

function ItemDeCategoria({
  rotulo,
  icone: Icone,
  total,
  ativo,
  onClick,
}: {
  rotulo: string;
  icone: LucideIcon;
  total?: number;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={ativo}
        onClick={onClick}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-padrao px-2 py-1.5 text-left text-13",
          "transition-colors duration-150 ease-saida md:pr-12",
          ativo ? "bg-selecionado text-texto" : "text-texto-suave hover:bg-campo hover:text-texto",
        )}
      >
        {/* Ícone e contagem só a partir de `md`: na faixa do telefone eles
            quebrariam a linha e comeriam a altura que a grade precisa (T-44). */}
        <Icone
          aria-hidden="true"
          strokeWidth={TRACO}
          className={cn("hidden size-4 flex-none md:block", ativo && "text-acento-claro")}
        />
        {rotulo}
      </button>
      {total !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 font-mono text-10 tabular-nums text-texto-suave md:block"
        >
          {total.toLocaleString("pt-BR")}
        </span>
      )}
    </div>
  );
}
