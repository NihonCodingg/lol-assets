"use client";

/**
 * A grade padrão: 173 cartões, um por campeão ([ADR 0010]).
 *
 * **Não virtualiza, de propósito.** São 173 itens; o [ADR 0011] mediu que a
 * virtualização só se paga nos resultados de busca de skin, que chegam a 2.118.
 * Virtualizar 173 cartões custaria altura fixa por breakpoint e um scroller
 * próprio para não ganhar nada.
 *
 * O filtro por **função** do RF-08 mora aqui e não na navegação por categoria:
 * função é atributo de campeão, e campeão é a home ([ADR 0010]). As etiquetas
 * vêm do catálogo — os 173 campeões do patch 16.18.1 têm todas.
 *
 * ## O cartão
 *
 * Placa quadrada com a arte, nome embaixo e contagem de skins em mono. A arte é
 * o *tile* 380×380 da skin base (T-46): o `square` de 128 px esticado até 152 ou
 * 210 px ficava borrado. O `square` continua de reserva, para catálogo sem skin.
 *
 * ## Densidade (T-40)
 *
 * As duas larguras-alvo do design: densa (152 px) e confortável (210 px). A
 * escolha fica no `localStorage`, que é preferência de quem usa; quando ele não
 * existe ou lança — modo privado —, a grade abre densa e nada quebra.
 */

import { Grid2x2, Grid3x3, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";

import type { CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { Chip } from "@/components/ui/chip";
import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import { filtrarCampeoes, funcoesDe } from "@/lib/categorias";
import { cn } from "@/lib/utils";

export type Densidade = "compacta" | "densa" | "confortavel";

/** O que o `localStorage` pode trazer; qualquer outra coisa vira a densa. */
const DENSIDADES: readonly Densidade[] = ["compacta", "densa", "confortavel"];

export const CHAVE_DA_DENSIDADE = "biblioteca:densidade";

export function lerDensidade(): Densidade {
  try {
    const guardada = window.localStorage.getItem(CHAVE_DA_DENSIDADE) as Densidade | null;
    return guardada && DENSIDADES.includes(guardada) ? guardada : "densa";
  } catch {
    return "densa";
  }
}

function gravarDensidade(densidade: Densidade): void {
  try {
    window.localStorage.setItem(CHAVE_DA_DENSIDADE, densidade);
  } catch {
    // Modo privado: a escolha vale até recarregar, e a grade continua de pé.
  }
}

/** Largura-alvo, não número de colunas: quem decide quantas cabem é a janela. */
const COLUNAS: Record<Densidade, string> = {
  compacta:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-compacto),1fr))] gap-x-2 gap-y-3",
  densa:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-denso),1fr))] gap-x-2.5 gap-y-4",
  confortavel:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-confortavel),1fr))] gap-x-3.5 gap-y-5",
};

export interface GradeDeCampeoesProps {
  readonly champions: readonly CatalogChampion[];
  /** As skins do catálogo: a arte do cartão é a da skin base. Sem elas, o `square`. */
  readonly skins?: readonly CatalogSkin[];
  readonly assetsBaseUrl?: string;
  readonly onAbrir: (champion: CatalogChampion) => void;
}

export function GradeDeCampeoes({ champions, skins, assetsBaseUrl, onAbrir }: GradeDeCampeoesProps) {
  const funcoes = useMemo(() => funcoesDe(champions), [champions]);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const visiveis = useMemo(() => filtrarCampeoes(champions, marcadas), [champions, marcadas]);
  // A grade só monta no cliente, depois que o catálogo chega: ler o
  // `localStorage` no primeiro render não arrisca divergir do HTML do servidor.
  const [densidade, setDensidade] = useState<Densidade>(lerDensidade);

  const arteDe = useMemo(() => {
    const porId = new Map((skins ?? []).map((skin) => [skin.skinId, skin]));
    return (champion: CatalogChampion): string | undefined => {
      const base = porId.get(champion.baseSkinId);
      return (base && thumbnailSrc(base, assetsBaseUrl)) ?? thumbnailSrc(champion, assetsBaseUrl);
    };
  }, [skins, assetsBaseUrl]);

  function alternar(tag: string) {
    setMarcadas((antes) => {
      const proximo = new Set(antes);
      if (!proximo.delete(tag)) proximo.add(tag);
      return proximo;
    });
  }

  function escolherDensidade(proxima: Densidade) {
    setDensidade(proxima);
    gravarDensidade(proxima);
  }

  return (
    <>
      {/* Uma barra só: filtro à esquerda, contagem e densidade à direita. A
          partir de `md` ela fica presa no topo enquanto a grade rola — filtrar
          no meio da rolagem não obriga a voltar lá em cima. No telefone, não
          fica presa, e as funções vão numa linha só que rola de lado: em três
          linhas quebradas, elas tomavam 150 px antes do primeiro cartão (T-49). */}
      <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 border-b border-borda bg-fundo px-3.5 py-2 md:sticky md:top-0 md:z-10">
        <h2 className="sr-only">Campeões</h2>
        {funcoes.length > 0 && (
          <fieldset className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 max-md:-mx-3.5 max-md:w-[calc(100%+1.75rem)] max-md:flex-nowrap max-md:overflow-x-auto max-md:px-3.5 max-md:[scrollbar-width:none]">
            <legend className="float-left mr-1.5 font-mono text-10 uppercase tracking-rotulo text-texto-suave">
              Função
            </legend>
            {funcoes.map((funcao) => (
              <Chip
                key={funcao.tag}
                marcado={marcadas.has(funcao.tag)}
                onAlternar={() => alternar(funcao.tag)}
              >
                {funcao.rotulo} <span className="ml-1 font-mono text-10">({funcao.total})</span>
              </Chip>
            ))}
            {marcadas.size > 0 && (
              <button
                type="button"
                onClick={() => setMarcadas(new Set())}
                className="h-controle-md flex-none cursor-pointer whitespace-nowrap rounded-padrao px-2 text-12 text-texto-suave transition-colors duration-150 ease-saida hover:bg-campo hover:text-texto"
              >
                Todas as funções
              </button>
            )}
          </fieldset>
        )}

        {/* No telefone, a contagem sai e o controle fica na mesma linha das
            funções: era uma linha inteira de 44 px antes do primeiro cartão. */}
        <div className="ml-auto flex flex-none items-center gap-2.5">
          <span className="hidden font-mono text-11 tabular-nums text-texto-suave md:inline">
            {visiveis.length} de {champions.length} campeões
          </span>
          <div
            role="group"
            aria-label="Densidade da grade"
            className="flex items-center gap-0.5 rounded-padrao border border-borda-forte p-0.5"
          >
            <BotaoIcone
              rotulo="Grade compacta"
              dica="Máximo de cartões"
              aria-pressed={densidade === "compacta"}
              icone={<LayoutGrid aria-hidden="true" strokeWidth={1.75} className="size-4" />}
              onClick={() => escolherDensidade("compacta")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-selecionado aria-pressed:text-texto"
            />
            <BotaoIcone
              rotulo="Grade densa"
              dica="Mais cartões por linha"
              aria-pressed={densidade === "densa"}
              icone={<Grid3x3 aria-hidden="true" strokeWidth={1.75} className="size-4" />}
              onClick={() => escolherDensidade("densa")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-selecionado aria-pressed:text-texto"
            />
            <BotaoIcone
              rotulo="Grade confortável"
              dica="Cartões maiores"
              aria-pressed={densidade === "confortavel"}
              icone={<Grid2x2 aria-hidden="true" strokeWidth={1.75} className="size-4" />}
              onClick={() => escolherDensidade("confortavel")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-selecionado aria-pressed:text-texto"
            />
          </div>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p role="status" className="px-3.5 py-20 text-center text-14 text-texto-suave">
          Nenhum campeão com essa função.
        </p>
      ) : (
        <ul
          aria-label="Campeões"
          data-densidade={densidade}
          className={cn("grid px-3.5 pt-3 pb-6", COLUNAS[densidade])}
        >
          {visiveis.map((champion) => (
            <Cartao
              key={champion.championKey}
              champion={champion}
              arte={arteDe(champion)}
              onAbrir={onAbrir}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function Cartao({
  champion,
  arte,
  onAbrir,
}: {
  champion: CatalogChampion;
  arte: string | undefined;
  onAbrir: (champion: CatalogChampion) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(champion)}
        className="group block w-full cursor-pointer rounded-medio text-left"
      >
        {/* Hover discreto, sem acento: o violeta é de seleção e de ação, e
            aqui ainda não há nenhuma das duas. */}
        {arte ? (
          <Imagem
            src={arte}
            alt={champion.names.pt_BR}
            classeDaCaixa="aspect-square rounded-medio border border-borda transition-colors duration-200 ease-saida group-hover:border-borda-fraca"
            className="object-cover transition-[opacity,transform] duration-200 ease-saida group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden="true" className="aspect-square rounded-medio border border-borda bg-campo" />
        )}
        <div className="truncate pt-2 text-12 leading-cartao font-medium text-texto-forte transition-colors duration-150 ease-saida group-hover:text-texto">
          {champion.names.pt_BR}
        </div>
        {/* RF-04: o cartão conta skins, nunca chromas. */}
        <div className="truncate font-mono text-10 text-texto-suave">
          {champion.skinCount} {champion.skinCount === 1 ? "skin" : "skins"}
        </div>
      </button>
    </li>
  );
}

/**
 * A home enquanto o catálogo não chega: a forma da grade, sem texto.
 *
 * O pulso atrasa 60 ms por coluna, como o design desenha — um brilho que
 * atravessa a linha em vez de 24 caixas piscando juntas.
 */
export function EsqueletoDaGrade({ cartoes = 24 }: { cartoes?: number }) {
  return (
    <div aria-hidden="true" className={cn("grid px-3.5 pt-3", COLUNAS.densa)}>
      {Array.from({ length: cartoes }, (_, i) => (
        <div key={i} className="animate-pulsar" style={{ animationDelay: `${(i % 8) * 0.06}s` }}>
          <div className="aspect-square rounded-medio bg-campo" />
          <div className="mt-2 h-3 w-3/4 rounded-min bg-campo" />
          <div className="mt-1.5 h-2.5 w-1/3 rounded-min bg-campo" />
        </div>
      ))}
    </div>
  );
}
