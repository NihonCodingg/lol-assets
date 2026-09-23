"use client";

/**
 * A paleta de busca — cmdk pela lista acessível e pela navegação por teclado.
 *
 * **`shouldFilter={false}` não é detalhe.** O filtro embutido do cmdk faz um
 * casamento difuso próprio, e ligado ele descartaria `mf`, `j4` e `kda` antes de
 * o nosso ranqueamento ver a consulta — em silêncio, sem erro nenhum. Quem
 * decide o que aparece é o `search()` ([ADR 0011]).
 *
 * ## A busca é a porta da frente (T-46, T-80)
 *
 * O campo fica no centro do topo, com presença, e os resultados **flutuam**
 * sobre a grade em vez de empurrá-la: antes, digitar uma letra jogava os 173
 * cartões para baixo. Onde ela mora é decisão de quem a usa (`className`): no
 * topo, por portal, ou no alto da página, quando não há topo. Cada linha mostra a arte — a da skin, ou a da skin base para campeão —,
 * porque quem edita vídeo reconhece a imagem antes de terminar de ler o nome.
 *
 * ## A arte ao lado (T-54)
 *
 * Buscar escolhe **skin** ([ADR 0010]), e o que identifica uma skin é a arte.
 * Com miniatura de 32 px, "K/DA" e "K/DA ALL OUT" eram duas linhas de texto
 * quase iguais. A linha passou a 72 px com arte de 56, e o item em destaque
 * — o que as setas movem — ganha uma prévia grande ao lado, onde há largura
 * para ela. A arte é o *tile* que o catálogo já traz: a splash mora na fatia do
 * campeão, e a home não busca fatia nenhuma (RNF-03).
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
import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { Catalog, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { Tecla } from "@/components/ui/campo";
import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import { ESPERA_DA_INTENCAO_MS } from "@/lib/preaquecer";
import { buildSearchIndex, hitId, parecidos, search, type SearchHit } from "@/lib/search";
import { cn } from "@/lib/utils";

/** Altura fixa por item — é o que a virtualização exige para medir. */
export const ALTURA_DO_ITEM = 72;
/** Acima disto a lista vira virtual. Abaixo, o custo não se paga (ADR 0011). */
export const LIMIAR_DE_VIRTUALIZACAO = 60;
/** Quantas linhas aparecem antes de a lista rolar. */
const LINHAS_A_VISTA = 6;

export interface PaletaDeBuscaProps {
  readonly catalog: Catalog;
  readonly assetsBaseUrl?: string;
  readonly onChampion: (champion: CatalogChampion) => void;
  /** Uma skin escolhida abre o painel do campeão dela, já naquela skin (T-19). */
  readonly onSkin: (skin: CatalogSkin, champion: CatalogChampion | undefined) => void;
  /** Quem contém decide onde ela cabe — o telefone dentro de uma categoria não tem linha sobrando. */
  readonly className?: string;
  /**
   * O resultado em destaque parou num campeão: é hora de adiantar a fatia dele
   * (T-61, ADR 0023). Todo resultado leva a um campeão — o de skin, ao dono.
   */
  readonly onIntencao?: (champion: CatalogChampion) => void;
}

function Paleta({
  catalog,
  assetsBaseUrl,
  onChampion,
  onSkin,
  className,
  onIntencao,
}: PaletaDeBuscaProps) {
  const indice = useMemo(() => buildSearchIndex(catalog), [catalog]);
  const artePorSkin = useMemo(
    () => new Map(catalog.skins.map((skin) => [skin.skinId, thumbnailSrc(skin, assetsBaseUrl)])),
    [catalog, assetsBaseUrl],
  );
  const [consulta, setConsulta] = useState("");
  const [aberta, setAberta] = useState(false);
  /**
   * O item em destaque, que o cmdk controla pelas setas. É o que a prévia
   * mostra: a mesma tecla que anda na lista troca a arte grande ao lado.
   */
  const [emDestaque, setEmDestaque] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Sem teto: quem segura a lista é a virtualização, não um corte arbitrário.
  const exatos = useMemo(
    () => search(indice, consulta, Number.POSITIVE_INFINITY),
    [indice, consulta],
  );
  // Nada achado: os campeões a um erro de dedo de distância (T-69). Só entram
  // quando a busca de verdade volta vazia — o ranking não muda.
  const sugeridos = useMemo(
    () => (exatos.length === 0 ? parecidos(indice, consulta) : []),
    [indice, consulta, exatos],
  );
  const soParecidos = exatos.length === 0 && sugeridos.length > 0;
  const resultados = soParecidos ? sugeridos : exatos;
  const mostrar = aberta && consulta.trim().length > 0;
  const vazia = consulta.trim().length > 0 && resultados.length === 0;
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

  /**
   * O cmdk normaliza o valor do item — corta espaço e baixa a caixa —, então o
   * que volta no `onValueChange` não é o `hitId` escrito: a comparação ignora a
   * caixa. Sem isto, a prévia ficava parada no primeiro resultado enquanto a
   * seta andava na lista.
   */
  const destacado = useMemo(() => {
    const alvo = emDestaque.trim().toLowerCase();
    return resultados.find((hit) => hitId(hit).toLowerCase() === alvo) ?? resultados[0];
  }, [resultados, emDestaque]);

  // O destaque que para por um instante é intenção; o que passa digitando, não
  // — cada letra muda o primeiro resultado (T-73).
  const campeaoEmDestaque =
    mostrar && destacado
      ? destacado.kind === "champion"
        ? destacado.champion
        : indice.byKey.get(destacado.skin.championKey)
      : undefined;
  useEffect(() => {
    if (!campeaoEmDestaque || !onIntencao) return;
    const espera = setTimeout(() => onIntencao(campeaoEmDestaque), ESPERA_DA_INTENCAO_MS);
    return () => clearTimeout(espera);
  }, [campeaoEmDestaque, onIntencao]);

  function arteDe(hit: SearchHit): string | undefined {
    if (hit.kind === "skin") return artePorSkin.get(hit.skin.skinId);
    return artePorSkin.get(hit.champion.baseSkinId) ?? thumbnailSrc(hit.champion, assetsBaseUrl);
  }

  return (
    <Command
      ref={raiz}
      shouldFilter={false}
      value={emDestaque}
      onValueChange={setEmDestaque}
      label="Buscar campeão ou skin"
      className={cn("relative z-20 flex flex-none items-center", className)}
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
          placeholder="Buscar campeão ou skin"
          // 44 px em toda largura: no telefone é também o alvo de toque (T-49).
          // Anel fino: o campo abre focado, e o anel de 2 px somado à borda
          // violeta virava uma moldura grossa na primeira coisa que se vê.
          data-anel="fino"
          // 16 px: o campo tem presença, e o iOS não amplia a página ao focar.
          className="h-controle-xl w-full rounded-controle border border-linha-forte bg-superficie-alta pr-11 pl-10 font-interface text-16 text-texto caret-acento transition-colors duration-150 ease-saida placeholder:text-texto-suave focus:border-acento"
        />
        <Tecla className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:block">
          /
        </Tecla>

        <div
          data-aberta={mostrar}
          className={cn(
            "absolute top-full right-0 left-0 mt-1.5 overflow-hidden rounded-painel border border-linha-forte bg-superficie-alta",
            // Mais largo que o campo a partir de `sm`, para caber a prévia ao
            // lado sem espremer a lista; centrado no campo, como o campo está
            // centrado no topo. No telefone, a largura do campo.
            "sm:right-auto sm:left-1/2 sm:w-[min(760px,92vw)] sm:-translate-x-1/2",
            !mostrar && "hidden",
          )}
        >
          <div className="flex items-stretch">
          <div
            ref={scroller}
            data-virtual={virtual}
            data-resultados={resultados.length}
            className="min-w-0 flex-1 overflow-y-auto p-1.5"
            style={{ maxHeight: ALTURA_DO_ITEM * LINHAS_A_VISTA }}
          >
            {/* O vazio fica fora da lista (T-64). Dentro dela, o `listbox`
                ficava sem nenhuma opção — violação crítica do axe
                (`aria-required-children`) —, e o leitor de tela não ouvia o
                "nada para": o `Command.Empty` é `role="presentation"`. */}
            {vazia && (
              <div role="status" className="px-3 py-6 text-center">
                <p className="text-13 text-texto">Nada para “{consulta.trim()}”.</p>
                <p className="mt-1 text-12 text-texto-suave">
                  Tente o nome do campeão, um apelido como mf ou j4, ou o nome da skin.
                </p>
              </div>
            )}
            {soParecidos && (
              <p role="status" className="px-2 pt-1 pb-1.5 text-12 text-texto-suave">
                Nada para “{consulta.trim()}”. Parecido:
              </p>
            )}
            <Command.List
              // O padrão do cmdk é "Suggestions", em inglês.
              label={soParecidos ? "Campeões parecidos" : "Resultados da busca"}
              hidden={vazia}
              style={
                virtual
                  ? { height: virtualizador.getTotalSize(), position: "relative" }
                  : undefined
              }
            >
              {janela.map(({ indice: posicao, inicio }) => {
                const hit = resultados[posicao];
                return (
                  <Command.Item
                    key={hitId(hit)}
                    value={hitId(hit)}
                    onSelect={() => escolher(hit)}
                    className="flex cursor-pointer items-center gap-3 rounded-controle px-2 data-[selected=true]:bg-acento-suave"
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

            <PreviaDoResultado hit={destacado} arte={destacado && arteDe(destacado)} />
          </div>

          <div className="flex h-paleta-rodape items-center gap-3 border-t border-linha px-3 tabular-nums text-11 text-texto-suave">
            <span className="tabular-nums">
              {resultados.length}{" "}
              {soParecidos
                ? resultados.length === 1
                  ? "parecido"
                  : "parecidos"
                : resultados.length === 1
                  ? "resultado"
                  : "resultados"}
            </span>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla>
              Navegar
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Tecla>↵</Tecla>
              Abrir
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Tecla>esc</Tecla>
              Fechar
            </span>
          </div>
        </div>
      </div>
    </Command>
  );
}

/**
 * A prévia do resultado em destaque (T-54).
 *
 * A busca é a porta da frente (§A.4) e escolhe **skin** ([ADR 0010]) — e o que
 * identifica uma skin é a arte, não o nome. Numa miniatura de 32 px, "K/DA" e
 * "K/DA ALL OUT" eram duas linhas de texto quase iguais; aqui a seta que anda na
 * lista troca a arte grande ao lado, e a escolha vira reconhecimento.
 *
 * A arte é o mesmo *tile* da linha, que o catálogo já traz: a splash mora na
 * fatia do campeão, e a home não busca fatia nenhuma (RNF-03).
 *
 * Some abaixo de `sm`: num telefone, a lista inteira é a tela.
 */
function PreviaDoResultado({ hit, arte }: { hit: SearchHit | undefined; arte: string | undefined }) {
  if (!hit) return null;
  const nome = hit.kind === "champion" ? hit.champion.names.pt_BR : hit.skin.names.pt_BR;
  const detalhe =
    hit.kind === "champion"
      ? `${hit.champion.skinCount} ${hit.champion.skinCount === 1 ? "skin" : "skins"}`
      : hit.championName;

  return (
    <div
      data-previa-da-busca=""
      className="hidden w-[248px] flex-none flex-col gap-2 border-l border-linha p-3 sm:flex"
    >
      {arte ? (
        <Imagem
          src={arte}
          alt=""
          classeDaCaixa="aspect-square w-full rounded-quadro"
          className="object-cover"
        />
      ) : (
        <div aria-hidden="true" className="aspect-square w-full rounded-quadro bg-superficie-alta" />
      )}
      {/* Sem repetir o que a linha já diz ao lado: aqui o nome é o título, e o
          que sobra é de quem a skin é (RF-24) ou quantas o campeão tem. */}
      <div className="min-w-0">
        <p className="truncate text-14 font-semibold text-texto">{nome}</p>
        <p className="truncate text-12 text-texto-suave">{detalhe}</p>
      </div>
    </div>
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
          classeDaCaixa="size-[56px] flex-none rounded-controle"
          className="object-cover"
        />
      ) : (
        <div aria-hidden="true" className="size-[56px] flex-none rounded-controle bg-superficie-alta" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-14 font-semibold text-texto">{nome}</div>
        <div className="truncate text-12 text-texto-suave">{detalhe}</div>
      </div>
    </>
  );
}

/** Memorizada pelo mesmo motivo da grade (T-72): a página muda, a busca não. */
export const PaletaDeBusca = memo(Paleta);
