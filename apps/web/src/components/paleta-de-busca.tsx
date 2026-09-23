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
 * sobre a grade em vez de empurrá-la. Onde ela mora é decisão de quem a usa
 * (`className`): no topo, por portal, ou no alto da página, quando não há topo.
 *
 * ## Resultados agrupados (T-82)
 *
 * Campeões, Skins, Itens, Runas e Feitiços, cada grupo com a cor de etiqueta
 * da categoria, poucos resultados à vista e "ver todos" quando há mais (ver
 * `lib/busca-agrupada.ts`). As fatias de item, runa e feitiço só são pedidas
 * quando alguém começa a digitar: a chegada da home continua sem fatia
 * (RNF-03). Até elas chegarem, a busca mostra campeões e skins, como antes.
 *
 * A virtualização saiu da lista ([ADR 0011]): ela existia para as 2.118 skins
 * que "prestígio" devolvia numa lista só. Agrupada, a lista mostra quatro por
 * grupo, e um grupo aberto mostra no máximo 60 — dezenas de nós, não milhares.
 *
 * ## A arte ao lado (T-54)
 *
 * O item em destaque — o que as setas movem — ganha uma prévia grande ao lado,
 * onde há largura para ela. A arte é a que o catálogo e as fatias da busca já
 * trazem; na proporção real, e sobre o xadrez quando o arquivo tem alfa.
 *
 * Escolher um resultado fecha a lista e limpa o campo. `Escape` fecha a lista,
 * e um segundo `Escape` apaga o que foi digitado. Clicar fora fecha.
 *
 * A lista continua montada quando fechada, só escondida: o cmdk declara o campo
 * como `aria-expanded` sempre, e o `aria-controls` dele não pode apontar para um
 * elemento que não existe.
 */

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { Asset, Catalog, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { Tecla } from "@/components/ui/campo";
import { MarcadorDeCategoria } from "@/components/ui/etiqueta-de-categoria";
import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import {
  agrupar,
  buscarAssets,
  idDoResultado,
  indexarAssets,
  nomeDoAsset,
  TETO_DO_GRUPO,
  type ChaveDoGrupo,
  type GrupoDaBusca,
  type IndiceDeAssets,
  type ResultadoDaBusca,
} from "@/lib/busca-agrupada";
import { ESPERA_DA_INTENCAO_MS } from "@/lib/preaquecer";
import { buildSearchIndex, parecidos, search } from "@/lib/search";
import { cn } from "@/lib/utils";

/** Altura fixa por linha: a lista não pula quando a arte chega. */
export const ALTURA_DO_ITEM = 52;
/** Quantas linhas aparecem antes de a lista rolar. */
const LINHAS_A_VISTA = 8;

/** "Ver todos os 9 campeões", "Ver todas as 12 skins". */
const VER_TODOS: Record<ChaveDoGrupo, (n: number) => string> = {
  champion: (n) => `Ver todos os ${n} campeões`,
  skin: (n) => `Ver todas as ${n} skins`,
  item: (n) => `Ver todos os ${n} itens`,
  rune: (n) => `Ver todas as ${n} runas`,
  summoner_spell: (n) => `Ver todos os ${n} feitiços`,
};

export interface PaletaDeBuscaProps {
  readonly catalog: Catalog;
  readonly assetsBaseUrl?: string;
  readonly onChampion: (champion: CatalogChampion) => void;
  /** Uma skin escolhida abre o painel do campeão dela, já naquela skin (T-19). */
  readonly onSkin: (skin: CatalogSkin, champion: CatalogChampion | undefined) => void;
  /** Um item, uma runa ou um feitiço escolhido: a página abre a categoria nele (T-82). */
  readonly onAsset?: (asset: Asset) => void;
  /** As fatias que a busca alcança além do catálogo, pedidas na primeira letra. */
  readonly carregarExtras?: () => Promise<readonly Asset[]>;
  /** Quem contém decide onde ela cabe — o telefone dentro de uma categoria não tem linha sobrando. */
  readonly className?: string;
  /**
   * O resultado em destaque parou num campeão: é hora de adiantar a fatia dele
   * (T-61, ADR 0023). Resultado de campeão ou de skin leva a um campeão.
   */
  readonly onIntencao?: (champion: CatalogChampion) => void;
}

function Paleta({
  catalog,
  assetsBaseUrl,
  onChampion,
  onSkin,
  onAsset,
  carregarExtras,
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
  /** O grupo cujo "ver todos" foi escolhido. Volta a nenhum a cada letra. */
  const [grupoAberto, setGrupoAberto] = useState<ChaveDoGrupo | null>(null);
  const [extras, setExtras] = useState<IndiceDeAssets | null>(null);
  const pediuExtras = useRef(false);
  /**
   * O item em destaque, que o cmdk controla pelas setas. É o que a prévia
   * mostra: a mesma tecla que anda na lista troca a arte grande ao lado.
   */
  const [emDestaque, setEmDestaque] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // A primeira letra pede as fatias de item, runa e feitiço — uma vez. Se a
  // rede falhar, a próxima letra tenta de novo; até lá, campeões e skins.
  useEffect(() => {
    if (!consulta.trim() || pediuExtras.current || !carregarExtras) return;
    pediuExtras.current = true;
    carregarExtras()
      .then((assets) => setExtras(indexarAssets(assets)))
      .catch(() => {
        pediuExtras.current = false;
      });
  }, [consulta, carregarExtras]);

  const exatos = useMemo<ResultadoDaBusca[]>(
    () => [
      ...search(indice, consulta, Number.POSITIVE_INFINITY),
      ...(extras ? buscarAssets(extras, consulta) : []),
    ],
    [indice, consulta, extras],
  );
  // Nada achado: os campeões a um erro de dedo de distância (T-69). Só entram
  // quando a busca de verdade volta vazia — o ranking não muda.
  const sugeridos = useMemo(
    () => (exatos.length === 0 ? parecidos(indice, consulta) : []),
    [indice, consulta, exatos],
  );
  const soParecidos = exatos.length === 0 && sugeridos.length > 0;
  const grupos = useMemo<GrupoDaBusca[]>(
    () =>
      soParecidos
        ? [{ chave: "champion", rotulo: "Parecidos", etiqueta: "champion", resultados: sugeridos, total: sugeridos.length }]
        : agrupar(exatos, grupoAberto),
    [soParecidos, sugeridos, exatos, grupoAberto],
  );
  const visiveis = useMemo(() => grupos.flatMap((g) => g.resultados), [grupos]);
  const total = soParecidos ? sugeridos.length : exatos.length;
  const mostrar = aberta && consulta.trim().length > 0;
  const vazia = consulta.trim().length > 0 && total === 0;
  const cortado = grupos.find((g) => g.chave === grupoAberto && g.total > g.resultados.length);

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

  function escolher(resultado: ResultadoDaBusca) {
    setAberta(false);
    setConsulta("");
    if (resultado.kind === "champion") onChampion(resultado.champion);
    else if (resultado.kind === "skin") onSkin(resultado.skin, indice.byKey.get(resultado.skin.championKey));
    else onAsset?.(resultado.asset);
  }

  /**
   * O cmdk normaliza o valor do item — corta espaço e baixa a caixa —, então o
   * que volta no `onValueChange` não é o id escrito: a comparação ignora a
   * caixa. Sem isto, a prévia ficava parada no primeiro resultado.
   */
  const destacado = useMemo(() => {
    const alvo = emDestaque.trim().toLowerCase();
    return visiveis.find((r) => idDoResultado(r).toLowerCase() === alvo) ?? visiveis[0];
  }, [visiveis, emDestaque]);

  // O destaque que para por um instante é intenção; o que passa digitando, não
  // — cada letra muda o primeiro resultado (T-73).
  const campeaoEmDestaque =
    mostrar && destacado
      ? destacado.kind === "champion"
        ? destacado.champion
        : destacado.kind === "skin"
          ? indice.byKey.get(destacado.skin.championKey)
          : undefined
      : undefined;
  useEffect(() => {
    if (!campeaoEmDestaque || !onIntencao) return;
    const espera = setTimeout(() => onIntencao(campeaoEmDestaque), ESPERA_DA_INTENCAO_MS);
    return () => clearTimeout(espera);
  }, [campeaoEmDestaque, onIntencao]);

  function arteDe(resultado: ResultadoDaBusca): string | undefined {
    if (resultado.kind === "skin") return artePorSkin.get(resultado.skin.skinId);
    if (resultado.kind === "asset") return resultado.asset.sourceUrl;
    return (
      artePorSkin.get(resultado.champion.baseSkinId) ?? thumbnailSrc(resultado.champion, assetsBaseUrl)
    );
  }

  return (
    <Command
      ref={raiz}
      shouldFilter={false}
      value={emDestaque}
      onValueChange={setEmDestaque}
      label="Buscar campeão, skin, item ou runa"
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
            setGrupoAberto(null);
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
          placeholder="Buscar campeão, skin, item ou runa"
          // 44 px em toda largura: no telefone é também o alvo de toque (T-49).
          // Anel fino: o campo abre focado, e o anel de 2 px somado à borda
          // magenta virava uma moldura grossa na primeira coisa que se vê.
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
              data-resultados={total}
              className="min-w-0 flex-1 overflow-y-auto p-1.5"
              style={{ maxHeight: ALTURA_DO_ITEM * LINHAS_A_VISTA + 40 }}
            >
              {/* O vazio fica fora da lista (T-64). Dentro dela, o `listbox`
                  ficava sem nenhuma opção — violação crítica do axe —, e o
                  leitor de tela não ouvia o "nada encontrado". */}
              {vazia && (
                <div role="status" className="px-3 py-6 text-center">
                  <p className="text-13 text-texto">Nada encontrado para “{consulta.trim()}”.</p>
                  <p className="mt-1 text-12 text-texto-suave">
                    Tente o nome em inglês, um apelido como mf ou j4, ou o nome da skin.
                  </p>
                </div>
              )}
              {soParecidos && (
                <p role="status" className="px-2 pt-1 pb-1.5 text-12 text-texto-suave">
                  Nada encontrado para “{consulta.trim()}”. Parecidos:
                </p>
              )}
              <Command.List
                // O padrão do cmdk é "Suggestions", em inglês.
                label={soParecidos ? "Campeões parecidos" : "Resultados da busca"}
                hidden={vazia}
              >
                {grupos.map((grupo) => (
                  <Command.Group
                    key={grupo.chave}
                    heading={
                      soParecidos ? undefined : (
                        <span className="flex items-center gap-2 px-2 pt-2 pb-1 text-12 font-semibold text-texto-suave">
                          <MarcadorDeCategoria categoria={grupo.etiqueta} />
                          {grupo.rotulo}
                          <span className="font-normal tabular-nums">{grupo.total}</span>
                        </span>
                      )
                    }
                  >
                    {grupo.resultados.map((resultado) => (
                      <Command.Item
                        key={idDoResultado(resultado)}
                        value={idDoResultado(resultado)}
                        onSelect={() => escolher(resultado)}
                        className="flex cursor-pointer items-center gap-3 rounded-controle px-2 data-[selected=true]:bg-acento-suave"
                        style={{ height: ALTURA_DO_ITEM }}
                      >
                        <Linha resultado={resultado} arte={arteDe(resultado)} />
                      </Command.Item>
                    ))}
                    {grupo.total > grupo.resultados.length && grupo.chave !== grupoAberto && (
                      <Command.Item
                        value={`ver-todos:${grupo.chave}`}
                        // Abre o grupo e deixa a lista aberta, com o foco no campo.
                        onSelect={() => setGrupoAberto(grupo.chave)}
                        className="flex h-9 cursor-pointer items-center rounded-controle px-2 pl-[60px] text-12 text-texto-suave data-[selected=true]:bg-acento-suave data-[selected=true]:text-texto"
                      >
                        {VER_TODOS[grupo.chave](grupo.total)}
                      </Command.Item>
                    )}
                  </Command.Group>
                ))}
              </Command.List>
            </div>

            <PreviaDoResultado resultado={destacado} arte={destacado && arteDe(destacado)} />
          </div>

          <div className="flex h-paleta-rodape items-center gap-3 border-t border-linha px-3 text-11 text-texto-suave">
            <span className="tabular-nums">
              {cortado
                ? `Mostrando ${TETO_DO_GRUPO} de ${cortado.total.toLocaleString("pt-BR")}. Continue digitando para achar o que procura.`
                : `${total.toLocaleString("pt-BR")} ${
                    soParecidos
                      ? total === 1
                        ? "parecido"
                        : "parecidos"
                      : total === 1
                        ? "resultado"
                        : "resultados"
                  }`}
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

function nomeDe(resultado: ResultadoDaBusca): string {
  if (resultado.kind === "champion") return resultado.champion.names.pt_BR;
  if (resultado.kind === "skin") return resultado.skin.names.pt_BR;
  return nomeDoAsset(resultado.asset);
}

/** O que diz o que é, em texto secundário. O grupo já diz o tipo. */
function detalheDe(resultado: ResultadoDaBusca): string {
  if (resultado.kind === "champion") {
    const n = resultado.champion.skinCount;
    return `${n} ${n === 1 ? "skin" : "skins"}`;
  }
  // RF-24: sem o dono, "Prestígio" não diz de quem é.
  if (resultado.kind === "skin") return resultado.championName;
  const { width, height, format } = resultado.asset;
  return `${width}×${height} ${format.toUpperCase()}`;
}

/** Arte de asset: na proporção real, sobre o xadrez quando tem alfa. */
function Miniatura({
  resultado,
  arte,
  lado,
  erroCompacto = false,
}: {
  resultado: ResultadoDaBusca;
  arte: string | undefined;
  lado: string;
  erroCompacto?: boolean;
}) {
  const asset = resultado.kind === "asset" ? resultado.asset : null;
  if (!arte) return <div aria-hidden="true" className={cn(lado, "flex-none rounded-quadro bg-superficie-alta")} />;
  return (
    <Imagem
      src={arte}
      alt=""
      // São poucas, e a lista flutuante some e volta: preguiçosa, a miniatura
      // esperava o navegador decidir que ela estava na tela.
      loading="eager"
      erroCompacto={erroCompacto}
      classeDaCaixa={cn(lado, "flex-none rounded-quadro", asset?.hasAlpha && "xadrez")}
      className={asset ? "object-contain" : "object-cover"}
    />
  );
}

/**
 * A prévia do resultado em destaque (T-54): a seta que anda na lista troca a
 * arte grande ao lado, e a escolha vira reconhecimento. Some abaixo de `sm`:
 * num telefone, a lista inteira é a tela.
 */
function PreviaDoResultado({
  resultado,
  arte,
}: {
  resultado: ResultadoDaBusca | undefined;
  arte: string | undefined;
}) {
  if (!resultado) return null;
  return (
    <div
      data-previa-da-busca=""
      className="hidden w-[248px] flex-none flex-col gap-2 border-l border-linha p-3 sm:flex"
    >
      <Miniatura resultado={resultado} arte={arte} lado="aspect-square w-full" />
      <div className="min-w-0">
        <p className="truncate text-14 font-semibold text-texto">{nomeDe(resultado)}</p>
        <p className="truncate text-12 tabular-nums text-texto-suave">{detalheDe(resultado)}</p>
      </div>
    </div>
  );
}

/** Uma linha: a arte, o nome, e o que ele é. A arte é decorativa: o nome está ao lado. */
function Linha({ resultado, arte }: { resultado: ResultadoDaBusca; arte: string | undefined }) {
  return (
    <>
      <Miniatura resultado={resultado} arte={arte} lado="size-10" erroCompacto />
      <div className="min-w-0 flex-1">
        <div className="truncate text-14 font-semibold text-texto">{nomeDe(resultado)}</div>
        <div className="truncate text-12 tabular-nums text-texto-suave">{detalheDe(resultado)}</div>
      </div>
    </>
  );
}

/** Memorizada pelo mesmo motivo da grade (T-72): a página muda, a busca não. */
export const PaletaDeBusca = memo(Paleta);
