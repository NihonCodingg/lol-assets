"use client";

/**
 * A barra lateral — categorias, seções e o aviso legal no pé (T-80).
 *
 * O nome do arquivo continua `rodape` porque é o que ele é para o **RF-21**: o
 * lugar por onde o aviso da Riot passa em toda página. A marca saiu daqui para
 * o topo (`topo.tsx`).
 *
 * **As categorias** ([ADR 0024]): cada uma com a bolinha da cor de etiqueta
 * dela, o nome e a contagem em algarismos tabulares. A cor nunca diz nada
 * sozinha — o nome está sempre ao lado —, e a categoria aberta se diz por
 * superfície, peso e `aria-pressed`. Os títulos "Categorias" e "Projeto" saíram:
 * não ajudavam a decidir nada. A contagem fica **fora** do botão e só para o
 * olho (`aria-hidden`): dentro, quem procura o botão "Itens" acharia "Itens 868".
 *
 * **O telefone** (T-49, e o §5 do plano): a barra vira uma linha de abas que
 * rola de lado, abaixo do topo — categorias e seções, nessa ordem, a mesma do
 * DOM e a do computador. Os avisos da Riot descem para o fim da página (ver
 * `avisos-da-riot.tsx`).
 *
 * **Fora da home** (T-50), cada categoria é um link para a home, já com a
 * categoria aberta.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { AvisosDaRiot } from "@/components/avisos-da-riot";
import { useNavegacao } from "@/components/navegacao-context";
import { MarcadorDeCategoria } from "@/components/ui/etiqueta-de-categoria";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const ITEM_DE_SECAO = cn(
  "flex flex-none items-center rounded-controle px-2 text-14 text-texto-suave md:h-[30px]",
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
  // "Mapas" pela home não pode ficar com a aba marcada fora da vista.
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
      {/* No telefone, as duas listas numa linha só que rola de lado; no
          computador este `div` some (`contents`) e elas empilham na coluna. */}
      <div
        ref={linha}
        className="flex flex-none items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] md:contents"
      >
        {/*
          A lista já ocupa o lugar dela antes de o manifesto chegar (T-59), e no
          computador fica com o espaço que sobra (`md:flex-1`): o que vem abaixo
          dela — as seções e os avisos — não se mexe quando as categorias chegam.

          Sem provedor — como no teste do T-27, que monta este componente
          sozinho — a lista vem vazia e a barra desenha só o resto.
        */}
        <nav
          aria-label="Categorias"
          className="flex flex-none flex-row gap-0.5 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:px-2 md:pt-3 baixa:md:flex-none baixa:md:overflow-visible"
        >
          {/* RF-04: campeão é a navegação padrão, e a primeira da lista.
              `null` é a grade de campeões. */}
          <ItemDeCategoria
            rotulo="Campeões"
            categoria="champion"
            total={campeoes ?? undefined}
            ativo={naHome && aberta === null}
            naHome={naHome}
            onClick={() => abrir(null)}
          />
          {categorias.map((categoria) => (
            <ItemDeCategoria
              key={categoria.category}
              rotulo={categoria.rotulo}
              categoria={categoria.category}
              total={categoria.total}
              ativo={naHome && aberta === categoria.category}
              naHome={naHome}
              onClick={() => abrir(categoria.category)}
            />
          ))}
          {/* Só onde a lista está a caminho: na página Sobre, aberta direto,
              o manifesto nunca é buscado, e um esqueleto pulsaria para sempre. */}
          {naHome &&
            categorias.length === 0 &&
            Array.from({ length: LINHAS_RESERVADAS }, (_, i) => <LugarDeCategoria key={i} />)}
        </nav>

        <span aria-hidden="true" className="mx-1.5 h-5 w-px flex-none bg-linha-forte md:hidden" />

        <nav aria-label="Seções" className="flex flex-none flex-row gap-0.5 md:flex-col md:px-2 md:py-2">
          <Link href="/sobre" className={ITEM_DE_SECAO}>
            Sobre e créditos
          </Link>
          <a href={siteConfig.repositoryUrl} className={ITEM_DE_SECAO}>
            Código
          </a>
        </nav>
      </div>

      {/* RF-21: os dois textos da Riot, inteiros, numa área própria no pé da
          coluna — no computador. Presos ao pé e sem encolher: em qualquer altura
          de tela, os dois à vista. Quem cede espaço é a lista de categorias, que
          rola. No telefone eles estão no fim de cada página. */}
      <footer className="hidden flex-none border-t border-linha px-3.5 pt-3 pb-3.5 md:block">
        <AvisosDaRiot />
      </footer>
    </aside>
  );
}

function ItemDeCategoria({
  rotulo,
  categoria,
  total,
  ativo,
  naHome = true,
  onClick,
}: {
  rotulo: string;
  categoria: string;
  total?: number;
  ativo: boolean;
  /** Fora da home, o item é um link para ela; o clique escolhe a categoria antes de ir. */
  naHome?: boolean;
  onClick: () => void;
}) {
  const classe = cn(
    "flex w-full cursor-pointer items-center gap-2.5 rounded-controle px-2 text-left text-14 whitespace-nowrap",
    "transition-colors duration-150 ease-saida md:h-[30px] md:pr-12",
    // No telefone é aba: 44 px de toque, e a aberta ganha o traço embaixo.
    "max-md:min-h-controle-xl max-md:rounded-none max-md:border-b-2 max-md:px-2.5",
    ativo
      ? "font-semibold text-texto max-md:border-acento md:bg-superficie-alta"
      : "text-texto-suave hover:text-texto max-md:border-transparent md:hover:bg-superficie-alta",
  );
  const conteudo = (
    <>
      <MarcadorDeCategoria categoria={categoria} />
      {rotulo}
    </>
  );

  return (
    <div className="relative flex-none">
      {naHome ? (
        <button type="button" aria-pressed={ativo} data-ativa={ativo || undefined} onClick={onClick} className={classe}>
          {conteudo}
        </button>
      ) : (
        <Link href="/" data-ativa={ativo || undefined} onClick={onClick} className={classe}>
          {conteudo}
        </Link>
      )}
      {total !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 text-12 tabular-nums text-texto-suave md:block"
        >
          {total.toLocaleString("pt-BR")}
        </span>
      )}
    </div>
  );
}

// --- o lugar que a lista ocupa antes de existir (T-59) -------------------------------------

/**
 * Quantas linhas desenhar enquanto o manifesto não chega. O número exato não
 * importa — **o layout é que segura o lugar**. Oito é o que o patch declara hoje.
 */
const LINHAS_RESERVADAS = 8;

/** Uma linha da lista antes de ela existir: a altura exata da de verdade (30 px). */
function LugarDeCategoria() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[30px] flex-none items-center gap-2.5 px-2 max-md:h-controle-xl"
    >
      <span className="size-2 flex-none rounded-full bg-superficie-alta" />
      <div className="h-3.5 w-24 animate-pulsar rounded-controle bg-superficie-alta max-md:w-16" />
    </div>
  );
}
