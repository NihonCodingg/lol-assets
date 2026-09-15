"use client";

/**
 * A paleta de busca — cmdk pela lista acessível e pela navegação por teclado.
 *
 * **`shouldFilter={false}` não é detalhe.** O filtro embutido do cmdk faz um
 * casamento difuso próprio, e ligado ele descartaria `mf`, `j4` e `kda` antes de
 * o nosso ranqueamento ver a consulta — em silêncio, sem erro nenhum. Quem
 * decide o que aparece é o `search()` ([ADR 0011]).
 *
 * ## A busca é a porta da frente (T-46)
 *
 * O campo fica no topo de toda tela, e os resultados **flutuam** sobre a grade
 * em vez de empurrá-la: antes, digitar uma letra jogava os 173 cartões para
 * baixo. Cada linha mostra a arte — a da skin, ou a da skin base para campeão —,
 * porque quem edita vídeo reconhece a imagem antes de terminar de ler o nome.
 *
 * Escolher um resultado fecha a lista e limpa o campo: quem acabou de abrir o
 * Jax volta do painel com o campo pronto para o próximo nome. `Escape` fecha a
 * lista, e um segundo `Escape` apaga o que foi digitado. Clicar fora fecha.
 *
 * A lista continua montada quando fechada, só escondida: o cmdk declara o campo
 * como `aria-expanded` sempre, e o `aria-controls` dele não pode apontar para um
 * elemento que não existe.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Catalog, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { Tecla } from "@/components/ui/campo";
import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import { buildSearchIndex, hitId, search, type SearchHit } from "@/lib/search";
import { cn } from "@/lib/utils";

/** Altura fixa por item — é o que a virtualização exige para medir. */
export const ALTURA_DO_ITEM = 52;
/** Acima disto a lista vira virtual. Abaixo, o custo não se paga (ADR 0011). */
export const LIMIAR_DE_VIRTUALIZACAO = 60;
/** Quantas linhas aparecem antes de a lista rolar. */
const LINHAS_A_VISTA = 8;

export interface PaletaDeBuscaProps {
  readonly catalog: Catalog;
  readonly assetsBaseUrl?: string;
  readonly onChampion: (champion: CatalogChampion) => void;
  /** Uma skin escolhida abre o painel do campeão dela, já naquela skin (T-19). */
  readonly onSkin: (skin: CatalogSkin, champion: CatalogChampion | undefined) => void;
}

export function PaletaDeBusca({ catalog, assetsBaseUrl, onChampion, onSkin }: PaletaDeBuscaProps) {
  const indice = useMemo(() => buildSearchIndex(catalog), [catalog]);
  const artePorSkin = useMemo(
    () => new Map(catalog.skins.map((skin) => [skin.skinId, thumbnailSrc(skin, assetsBaseUrl)])),
    [catalog, assetsBaseUrl],
  );
  const [consulta, setConsulta] = useState("");
  const [aberta, setAberta] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Sem teto: quem segura a lista é a virtualização, não um corte arbitrário.
  const resultados = useMemo(
    () => search(indice, consulta, Number.POSITIVE_INFINITY),
    [indice, consulta],
  );
  const mostrar = aberta && consulta.trim().length > 0;
  const scroller = useRef<HTMLDivElement>(null);
  const virtual = resultados.length > LIMIAR_DE_VIRTUALIZACAO;
  const virtualizador = useVirtualizer({
    count: resultados.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ALTURA_DO_ITEM,
    overscan: 8,
  });
  const janela = virtual
    ? virtualizador.getVirtualItems().map((v) => ({ indice: v.index, inicio: v.start }))
    : resultados.map((_, indice) => ({ indice, inicio: indice * ALTURA_DO_ITEM }));

  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      if (evento.key !== "/" || evento.defaultPrevented) return;
      const alvo = evento.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA")) return;
      // `preventDefault` antes do foco: senão a barra entra no campo (RF-02).
      evento.preventDefault();
      campo.current?.focus();
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  // Clicar fora fecha. `pointerdown` e não o `blur` do campo: o item do cmdk não
  // recebe foco, e fechar no `blur` esconderia a lista antes de o clique chegar.
  useEffect(() => {
    if (!aberta) return;
    function fora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setAberta(false);
    }
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta]);

  function escolher(hit: SearchHit) {
    setAberta(false);
    setConsulta("");
    if (hit.kind === "champion") {
      onChampion(hit.champion);
      return;
    }
    onSkin(hit.skin, indice.byKey.get(hit.skin.championKey));
  }

  function arteDe(hit: SearchHit): string | undefined {
    if (hit.kind === "skin") return artePorSkin.get(hit.skin.skinId);
    return artePorSkin.get(hit.champion.baseSkinId) ?? thumbnailSrc(hit.champion, assetsBaseUrl);
  }

  return (
    <Command
      ref={raiz}
      shouldFilter={false}
      label="Buscar campeão ou skin"
      className="relative z-20 flex flex-none items-center border-b border-borda px-3.5 py-2"
    >
      <div className="relative w-full max-w-busca-max">
        <Search
          aria-hidden="true"
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-texto-suave"
        />
        <Command.Input
          ref={campo}
          autoFocus
          value={consulta}
          onValueChange={(valor) => {
            setConsulta(valor);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onKeyDown={(evento) => {
            if (evento.key !== "Escape") return;
            // Parar aqui impede que o painel de categoria, que escuta a janela,
            // feche junto com a lista.
            if (mostrar) {
              evento.stopPropagation();
              setAberta(false);
            } else if (consulta) {
              evento.stopPropagation();
              setConsulta("");
            }
          }}
          placeholder="Campeão ou skin — tente mf, j4, K/DA"
          // 44 px a partir de `md`; na faixa do telefone o campo fica com a
          // altura de antes até o T-49 refazer o topo inteiro. Anel fino: o
          // campo abre focado, e o anel de 2 px somado à borda violeta virava
          // uma moldura grossa na primeira coisa que se vê.
          data-anel="fino"
          className="h-controle-lg w-full rounded-medio border border-borda-forte bg-campo pr-11 pl-10 font-interface text-13 text-texto caret-acento transition-colors duration-150 ease-saida placeholder:text-texto-suave hover:border-borda-fraca focus:border-acento md:h-controle-xl md:text-14"
        />
        <Tecla className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:block">
          /
        </Tecla>

        <div
          data-aberta={mostrar}
          className={cn(
            "absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-medio border border-borda-forte bg-superficie-alta shadow-[var(--sombra-paleta)]",
            !mostrar && "hidden",
          )}
        >
          <div
            ref={scroller}
            data-virtual={virtual}
            data-resultados={resultados.length}
            className="overflow-y-auto p-1.5"
            style={{ maxHeight: ALTURA_DO_ITEM * LINHAS_A_VISTA }}
          >
            <Command.List
              style={
                virtual
                  ? { height: virtualizador.getTotalSize(), position: "relative" }
                  : undefined
              }
            >
              {consulta.trim() && resultados.length === 0 && (
                <Command.Empty className="px-3 py-6 text-center">
                  <p className="text-13 text-texto-forte">Nada para “{consulta.trim()}”.</p>
                  <p className="mt-1 text-12 text-texto-suave">
                    Tente o nome do campeão, um apelido como mf ou j4, ou o nome da skin.
                  </p>
                </Command.Empty>
              )}
              {janela.map(({ indice: posicao, inicio }) => {
                const hit = resultados[posicao];
                return (
                  <Command.Item
                    key={hitId(hit)}
                    value={hitId(hit)}
                    onSelect={() => escolher(hit)}
                    className="flex cursor-pointer items-center gap-3 rounded-padrao px-2 data-[selected=true]:bg-acento-suave"
                    style={
                      virtual
                        ? {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: ALTURA_DO_ITEM,
                            transform: `translateY(${inicio}px)`,
                          }
                        : { height: ALTURA_DO_ITEM }
                    }
                  >
                    <Linha hit={hit} arte={arteDe(hit)} />
                  </Command.Item>
                );
              })}
            </Command.List>
          </div>

          <div className="flex h-paleta-rodape items-center gap-3 border-t border-borda px-3 font-mono text-10 text-texto-suave">
            <span className="tabular-nums">
              {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
            </span>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla>
              navegar
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Tecla>↵</Tecla>
              abrir
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Tecla>esc</Tecla>
              fechar
            </span>
          </div>
        </div>
      </div>
    </Command>
  );
}

/** Uma linha: a arte, o nome, e o que ele é. */
function Linha({ hit, arte }: { hit: SearchHit; arte: string | undefined }) {
  const nome = hit.kind === "champion" ? hit.champion.names.pt_BR : hit.skin.names.pt_BR;
  const detalhe =
    hit.kind === "champion"
      ? `Campeão · ${hit.champion.skinCount} ${hit.champion.skinCount === 1 ? "skin" : "skins"}`
      : // RF-24: sem o dono, "Prestígio" não diz de quem é.
        `Skin · ${hit.championName}`;

  return (
    <>
      {/* Decorativa: o nome já está escrito ao lado. */}
      {arte ? (
        <Imagem
          src={arte}
          alt=""
          erroCompacto
          classeDaCaixa="size-9 flex-none rounded-tecla"
          className="object-cover"
        />
      ) : (
        <div aria-hidden="true" className="size-9 flex-none rounded-tecla bg-campo" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-13 font-medium text-texto-forte">{nome}</div>
        <div className="truncate text-11 text-texto-suave">{detalhe}</div>
      </div>
    </>
  );
}
