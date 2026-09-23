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
 * **T-49, o telefone.** Abaixo de `md` a barra vira faixa no topo, e a faixa
 * tomava 274 px de 844 — um terço da tela antes da busca (T-44). Agora são duas
 * linhas: a marca, e uma linha só que rola de lado com as categorias e as seções,
 * nessa ordem, que é a mesma do DOM e a do computador. Os avisos da Riot descem
 * para o fim da página (ver `avisos-da-riot.tsx`).
 *
 * **T-50:** fora da home — na página Sobre —, cada categoria é um link para a
 * home, já com a categoria aberta. Antes ela era botão em toda página: marcava a
 * categoria e deixava a pessoa na Sobre, sem nada mudar na tela.
 *
 * No topo, a marca do [ADR 0024]: um quadro dentro de marcas de corte, na cor
 * do texto, e o nome em peso 800.
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
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { AvisosDaRiot } from "@/components/avisos-da-riot";
import { useNavegacao } from "@/components/navegacao-context";
import { Marca } from "@/components/ui/marca";
import { siteConfig } from "@/lib/site-config";
import { ALVO_DE_TOQUE, cn } from "@/lib/utils";

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
  "flex flex-none items-center gap-2.5 rounded-controle px-2 py-1.5 text-13 text-texto-suave",
  "transition-colors duration-150 ease-saida hover:bg-superficie-alta hover:text-texto",
  // No telefone, alvo de toque de 44 px (T-49).
  "max-md:min-h-controle-xl max-md:px-2.5",
);

export function Rodape() {
  const { categorias, campeoes, aberta, abrir } = useNavegacao();
  const linha = useRef<HTMLDivElement>(null);
  // `null` fora do roteador do Next — nos testes que montam a barra sozinha.
  // Lá, como na home, as categorias são botões.
  const caminho = usePathname();
  const naHome = caminho === null || caminho === "/";

  // Na linha que rola de lado, a categoria aberta vem para a tela: quem abre
  // "Mapas" pela home não pode ficar com o botão marcado fora da vista.
  useEffect(() => {
    linha.current
      ?.querySelector<HTMLElement>("[aria-pressed='true']")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [aberta, categorias]);

  return (
    // No computador a barra **não rola** (T-62): quem rola é só a lista de
    // categorias, dentro do espaço dela. Com a barra inteira rolando, numa tela
    // de 1024×640 os avisos da Riot saíam da tela — e a política pede que eles
    // estejam "readily visible".
    <aside className="flex min-h-0 flex-col border-b border-linha bg-superficie md:overflow-hidden md:border-b-0 md:border-r baixa:md:overflow-visible">
      {/* A marca leva para a home. Com "Início" fora (T-46), é o caminho de
          volta de quem está na página Sobre. */}
      <Link
        href="/"
        // 42 px à vista no telefone, 44 de toque (T-66): crescer a faixa do topo
        // por 2 px empurraria a arte inteira para baixo.
        className={cn(
          "flex h-12 flex-none items-center gap-2 self-start rounded-controle px-3.5 md:h-cabecalho md:self-auto",
          ALVO_DE_TOQUE,
        )}
      >
        <Marca />
      </Link>

      {/* No telefone, as duas listas numa linha só que rola de lado; no
          computador este `div` some (`contents`) e elas empilham na coluna. */}
      <div
        ref={linha}
        className="flex flex-none items-center gap-0.5 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none] md:contents"
      >
        {/*
          A lista já ocupa o lugar dela antes de o manifesto chegar (T-59).
          Medido na produção: sem isto, a navegação nascia em `y=59` e pulava
          para `y=336` quando o catálogo chegava, 1,6 s depois — um salto de
          layout de **0,16**, que é o pior número da chegada.

          Sem provedor — como no teste do T-27, que monta este componente
          sozinho — a lista vem vazia e a barra desenha só o resto.
        */}
        {/*
          `md:flex-1`: no computador a lista fica com o espaço que sobra, e o que
          vem **abaixo** dela — as seções e os avisos — não se mexe quando as
          categorias chegam. É isso que zera o salto, não o número de linhas
          reservadas: a lista pode crescer ou encolher à vontade dentro do
          próprio espaço.
        */}
        <nav
          aria-label="Categorias"
          className="flex flex-none flex-row gap-0.5 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:px-2 baixa:md:flex-none baixa:md:overflow-visible"
        >
            <span className="hidden px-2 pt-1.5 pb-1 tabular-nums text-11 text-texto-suave md:block">
              Categorias
            </span>
            {/* RF-04: campeão é a navegação padrão, e no design ele é a
                primeira categoria da lista. `null` é a grade de campeões. */}
            <ItemDeCategoria
              rotulo="Campeões"
              icone={Swords}
              total={campeoes ?? undefined}
              ativo={naHome && aberta === null}
              naHome={naHome}
              onClick={() => abrir(null)}
            />
            {categorias.map((categoria) => (
              <ItemDeCategoria
                key={categoria.category}
                rotulo={categoria.rotulo}
                icone={ICONE_DA_CATEGORIA[categoria.category] ?? Shapes}
                total={categoria.total}
                ativo={naHome && aberta === categoria.category}
                naHome={naHome}
                onClick={() => abrir(categoria.category)}
              />
            ))}
            {/* Só onde a lista está a caminho: na página Sobre, aberta direto,
                o manifesto nunca é buscado, e um esqueleto pulsaria para
                sempre. */}
            {naHome &&
              categorias.length === 0 &&
              Array.from({ length: LINHAS_RESERVADAS }, (_, i) => <LugarDeCategoria key={i} />)}
        </nav>

        <span aria-hidden="true" className="mx-1.5 h-5 w-px flex-none bg-linha-forte md:hidden" />

        <nav
          aria-label="Seções"
          className="flex flex-none flex-row gap-0.5 md:mt-3 md:flex-col md:px-2"
        >
          <span className="hidden px-2 pt-1.5 pb-1 tabular-nums text-11 text-texto-suave md:block">
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
      </div>

      {/* RF-21: os dois textos da Riot, inteiros, no pé da coluna — no
          computador. No telefone eles estão no fim de cada página. */}
      {/* Preso ao pé da coluna e sem encolher: em qualquer altura de tela, os
          dois avisos inteiros à vista (RF-21). Quem cede espaço é a lista de
          categorias, que rola; nunca a área da arte, que fica na outra coluna. */}
      <footer className="hidden flex-none px-3.5 md:mt-auto md:block md:border-t md:border-linha md:pt-3 md:pb-3.5">
        <AvisosDaRiot />
      </footer>
    </aside>
  );
}

function ItemDeCategoria({
  rotulo,
  icone: Icone,
  total,
  ativo,
  naHome = true,
  onClick,
}: {
  rotulo: string;
  icone: LucideIcon;
  total?: number;
  ativo: boolean;
  /** Fora da home, o item é um link para ela; o clique escolhe a categoria antes de ir. */
  naHome?: boolean;
  onClick: () => void;
}) {
  const classe = cn(
    "flex w-full cursor-pointer items-center gap-2.5 rounded-controle px-2 py-1.5 text-left text-13 whitespace-nowrap md:h-[30px]",
    "transition-colors duration-150 ease-saida md:pr-12",
    "max-md:min-h-controle-xl max-md:px-2.5",
    ativo ? "bg-superficie-alta text-texto" : "text-texto-suave hover:bg-superficie-alta hover:text-texto",
  );
  const conteudo = (
    <>
      {/* Ícone e contagem só a partir de `md`: na linha do telefone eles
          alargariam cada botão, e menos categorias caberiam à vista (T-44). */}
      <Icone
        aria-hidden="true"
        strokeWidth={TRACO}
        className={cn("hidden size-4 flex-none md:block", ativo && "text-acento-forte")}
      />
      {rotulo}
    </>
  );

  return (
    <div className="relative flex-none">
      {naHome ? (
        <button type="button" aria-pressed={ativo} onClick={onClick} className={classe}>
          {conteudo}
        </button>
      ) : (
        <Link href="/" onClick={onClick} className={classe}>
          {conteudo}
        </Link>
      )}
      {total !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 tabular-nums text-11 tabular-nums text-texto-suave md:block"
        >
          {total.toLocaleString("pt-BR")}
        </span>
      )}
    </div>
  );
}

// --- o lugar que a lista ocupa antes de existir (T-59) -------------------------------------

/**
 * Quantas linhas desenhar enquanto o manifesto não chega.
 *
 * O número exato não importa — **o layout é que segura o lugar** (ver a nota na
 * lista). Sete é o que o patch declara hoje, e é o que faz a barra parecer a
 * barra enquanto ela carrega, em vez de um vazio.
 */
const LINHAS_RESERVADAS = 7;

/**
 * Uma linha da lista antes de ela existir: a altura exata da de verdade.
 *
 * 30 px medidos no navegador — `py-1.5` mais a linha de 13 px do rótulo. Com 28
 * px, as sete linhas somavam 14 px a menos e a barra ainda pulava, agora de
 * pouco.
 */
function LugarDeCategoria() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[30px] flex-none items-center px-2 max-md:h-controle-xl"
    >
      <div className="h-4 w-24 animate-pulsar rounded-controle bg-superficie-alta max-md:w-16" />
    </div>
  );
}
