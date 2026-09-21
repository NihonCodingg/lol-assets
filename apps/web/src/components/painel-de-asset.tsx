"use client";

/**
 * O painel de um item: todos os tipos que existem no índice, cada um com ficha
 * honesta antes de qualquer download (RF-09) e as duas formas de baixar.
 *
 * **Estado por asset, não por painel.** Um download que falha marca o cartão
 * dele e mais nada: são dezenas de cartões, e um erro de rede num deles não pode
 * apagar os outros da tela (critério 4).
 *
 * As duas ações que tocam o mundo — baixar e copiar — entram por injeção, com o
 * comportamento real como padrão. É o mesmo desenho do `PngDeps` do
 * `asset-file.ts`: testável sem mock de módulo.
 *
 * **Dois desenhos.**
 *
 * - **Grade** (`grade`), no painel do campeão (T-47b): cartões agrupados por
 *   família — a arte grande, os retratos, as habilidades —, cada um com a prévia
 *   na proporção real.
 * - **Galeria**, nas categorias (T-48, revista no T-53): *tiles* de altura igual,
 *   com a arte encostando nas bordas e o nome numa linha embaixo. A ficha e as
 *   ações vêm juntas, na faixa que aparece sobre a arte no *hover* e no foco —
 *   e que em tela de toque **não** aparece: lá o caminho é tocar na arte e
 *   baixar da ampliação, que tem a mesma ficha e os mesmos dois botões. Onde o
 *   tile é estreito demais para "Original" e "PNG" escritos, os dois viram
 *   ícone com dica, sem perder o nome acessível.
 *
 * **Galeria grande vira galeria virtual.** Acima de `LIMITE_DE_VIRTUALIZACAO`
 * *tiles* o painel desenha só as linhas que estão na tela ([ADR 0011]): a
 * categoria `profile_icon` tem 5.042 ícones. A altura do *tile* é a mesma na
 * lista inteira, calculada dos arquivos dela (`medidasDaGaleria`), e é isso que
 * deixa virtualizar por linha sem medir nada.
 *
 * **Sem "fechar" (T-48).** Quem contém o painel fecha: o `×` do painel do
 * campeão, o "Voltar aos campeões" da categoria. Um botão a mais fechando a
 * mesma coisa era um a mais para achar e um a mais para entender. O `Escape`
 * continua aqui, para quem não trata a tecla por conta própria.
 *
 * Baixar dá retorno no próprio botão: o ícone gira enquanto baixa e vira ✓ por
 * dois segundos quando termina, e o leitor de tela ouve "Arquivo baixado". O
 * nome do botão não muda — quem procura "Baixar original" continua achando.
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Link2, Maximize2 } from "lucide-react";

import type { Asset } from "@lol-assets/schema";

import {
  agruparPorFamilia,
  colunasDaGaleria,
  larguraDaColuna,
  LIMITE_DE_VIRTUALIZACAO,
  medidasDaGaleria,
  medidasNaColuna,
  orderAssets,
  rotuloDoTipo,
  rotulosDaLista,
  VAO_DA_GALERIA,
  type MedidasDaGaleria,
} from "@/lib/asset-panel";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { Imagem } from "@/components/ui/imagem";
import { ParDeDownload, type QualDownload } from "@/components/ui/par-de-download";
import { cn } from "@/lib/utils";
import {
  assetSummary,
  assetUrl,
  canConvertToPng,
  convertToPng,
  formatBytes,
  pngFileName,
  saveBlob,
} from "@/lib/asset-file";

export type EstadoDoCartao = "pronto" | "baixando" | "erro";

export interface PainelDeAssetProps {
  readonly titulo: string;
  readonly assets: readonly Asset[];
  readonly assetsBaseUrl?: string;
  /** O que o `Escape` faz, quando `fecharComEsc`. */
  readonly onClose: () => void;
  readonly baixar?: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar?: (texto: string) => Promise<void>;
  /**
   * Seleção do lote (RF-17), **de fora**.
   *
   * O estado mora no pai porque um lote pode atravessar dois painéis: "tudo do
   * Jax" leva os assets da skin e os chromas, que são listas diferentes. Sem
   * `onAlternar` não há caixa nenhuma — é o que mantém o painel usável em
   * contexto onde lote não faz sentido.
   */
  readonly selecao?: ReadonlySet<string>;
  readonly onAlternar?: (id: string) => void;
  /**
   * Se `Escape` fecha **este** painel.
   *
   * `false` quando ele está dentro de outro que já trata a tecla: dois
   * ouvintes na mesma tecla fechariam os dois de uma vez, e quem tem chroma
   * aberto perderia o painel do campeão junto.
   */
  readonly fecharComEsc?: boolean;
  /**
   * Grade agrupada por família, com a prévia na proporção real (T-47b). É o
   * painel do campeão; sem ela, a galeria das categorias.
   */
  readonly grade?: boolean;
  /** Quem amplia a arte. Com ele, a prévia vira botão. */
  readonly onAmpliar?: (asset: Asset) => void;
  /** Ações da lista inteira, à direita do título — "Selecionar os N filtrados". */
  readonly acoes?: ReactNode;
  /**
   * O que vem depois do último tile, **dentro** da área que rola da galeria: os
   * avisos da Riot no telefone (T-49). Fora dela, eles ficariam fixos embaixo e
   * comeriam a altura da lista.
   */
  readonly fim?: ReactNode;
}

async function baixarDeVerdade(asset: Asset, comoPng: boolean, url: string): Promise<void> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const blob = await resposta.blob();
  if (comoPng) saveBlob(await convertToPng(blob), pngFileName(asset.fileName));
  else saveBlob(blob, asset.fileName);
}

function copiarDeVerdade(texto: string): Promise<void> {
  return navigator.clipboard.writeText(texto);
}

export function PainelDeAsset({
  titulo,
  assets,
  assetsBaseUrl,
  onClose,
  baixar = baixarDeVerdade,
  copiar = copiarDeVerdade,
  selecao,
  onAlternar,
  fecharComEsc = true,
  grade = false,
  onAmpliar,
  acoes,
  fim,
}: PainelDeAssetProps) {
  const ordenados = useMemo(() => orderAssets(assets), [assets]);
  const rotulos = useMemo(() => rotulosDaLista(ordenados), [ordenados]);
  const grupos = useMemo(() => (grade ? agruparPorFamilia(ordenados) : []), [grade, ordenados]);
  const [estados, setEstados] = useState<Record<string, EstadoDoCartao>>({});

  useEffect(() => {
    if (!fecharComEsc) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onClose();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onClose, fecharComEsc]);

  const marcar = useCallback((id: string, estado: EstadoDoCartao) => {
    setEstados((anteriores) => ({ ...anteriores, [id]: estado }));
  }, []);

  const doCartao = (asset: Asset) => ({
    asset,
    rotulo: rotulos.get(asset.id) ?? asset.names.pt_BR,
    url: assetUrl(asset, assetsBaseUrl),
    estado: estados[asset.id] ?? "pronto",
    marcar,
    baixar,
    copiar,
    selecionado: selecao?.has(asset.id),
    onAlternar,
    onAmpliar,
  });

  return (
    <section aria-label={titulo} className="flex min-h-0 flex-1 flex-col baixa:min-h-auto">
      <div className="flex flex-none flex-wrap items-center gap-x-2 gap-y-1 px-3.5 py-2">
        <h2 className="truncate text-12 font-medium text-texto-forte">{titulo}</h2>
        <span className="font-mono text-11 text-texto-suave">
          {ordenados.length} {ordenados.length === 1 ? "asset" : "assets"}
        </span>
        {acoes && <div className="ml-auto flex items-center gap-1.5">{acoes}</div>}
      </div>

      {grade ? (
        <div className="flex flex-col gap-6 px-3.5 pb-6">
          {grupos.map((grupo) => {
            const cartoes = (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-3">
                {grupo.assets.map((asset) => (
                  <li key={asset.id}>
                    <CartaoDaGrade {...doCartao(asset)} />
                  </li>
                ))}
              </ul>
            );
            // Um grupo só não ganha cabeçalho: seria o nome da lista, repetido.
            if (grupos.length === 1) return <div key={grupo.chave}>{cartoes}</div>;
            return (
              <section key={grupo.chave} aria-label={grupo.rotulo}>
                <h3 className="mb-2.5 flex items-baseline gap-2 text-12 font-medium text-texto-forte">
                  {grupo.rotulo}
                  <span className="font-mono text-10 font-normal text-texto-suave">
                    {grupo.assets.length}
                  </span>
                </h3>
                {cartoes}
              </section>
            );
          })}
        </div>
      ) : (
        <Galeria
          assets={ordenados}
          virtual={ordenados.length > LIMITE_DE_VIRTUALIZACAO}
          modoSelecao={(selecao?.size ?? 0) > 0}
          fim={fim}
          tile={(asset, medidas, modoSelecao, naVez) => (
            <TileDaGaleria
              {...doCartao(asset)}
              medidas={medidas}
              modoSelecao={modoSelecao}
              naVez={naVez}
            />
          )}
        />
      )}
    </section>
  );
}

// --- a galeria (categorias, T-48) ---------------------------------------------------------

/**
 * A largura de um elemento, acompanhada.
 *
 * `useLayoutEffect` para a primeira leitura: as colunas ficam certas antes da
 * primeira pintura, sem um quadro de uma coluna só. No jsdom, que não faz
 * layout, a largura é 0 — e 0 é uma coluna, que é o que os testes esperam.
 */
function useLargura(elemento: RefObject<HTMLElement | null>): number {
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    const atual = elemento.current;
    if (!atual) return;
    setLargura(atual.clientWidth);
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setLargura(entrada.contentRect.width);
    });
    observador.observe(atual);
    return () => observador.disconnect();
  }, [elemento]);
  return largura;
}

interface GaleriaProps {
  readonly assets: readonly Asset[];
  readonly virtual: boolean;
  /** Com alguma coisa selecionada, as caixas ficam à vista em todos os tiles. */
  readonly modoSelecao: boolean;
  /** `naVez`: é este tile que está na ordem do Tab (T-63). */
  readonly tile: (
    asset: Asset,
    medidas: MedidasDaGaleria,
    modoSelecao: boolean,
    naVez: boolean,
  ) => ReactNode;
  readonly fim?: ReactNode;
}

function Galeria({ assets, virtual, modoSelecao, tile, fim }: GaleriaProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const largura = useLargura(lista);
  const daLista = useMemo(() => medidasDaGaleria(assets), [assets]);
  const colunas = colunasDaGaleria(largura, daLista);
  // A coluna é que decide a altura da linha (T-53): o teto da categoria diz o
  // quanto a arte pode ocupar, a coluna diz o quanto ela ocupa.
  const medidas = useMemo(
    () => ({ ...daLista, ...medidasNaColuna(daLista, larguraDaColuna(largura, colunas)) }),
    [daLista, largura, colunas],
  );
  const passo = medidas.alturaDoTile + VAO_DA_GALERIA;

  // As linhas, não os tiles: é uma linha que tem altura fixa, e é por linha
  // que a rolagem anda. Sem `measureElement` de propósito ([ADR 0011]).
  const linhas = useVirtualizer({
    count: virtual ? Math.ceil(assets.length / colunas) : 0,
    getScrollElement: () => scroller.current,
    estimateSize: () => passo,
    // Uma linha fora da tela de cada lado (T-60). Eram três: numa galeria de
    // dez colunas, isso montava **30 tiles** que ninguém veria, e montar tile é
    // o que custa quadro na rolagem.
    overscan: 1,
    paddingEnd: 24 - VAO_DA_GALERIA,
  });

  /**
   * Uma parada de Tab para a galeria inteira, e as setas andam entre os tiles
   * (T-63) — o mesmo da grade de campeões (T-57). Eram **duas paradas por tile**
   * (ampliar e a caixa do lote): na categoria de 5.042 ícones, passar da galeria
   * para o que vem depois dela era Tab dez mil vezes.
   *
   * A vez é um índice na lista, não um elemento: na galeria virtual o tile pode
   * nem estar montado. Se não está — rolou para longe —, a vez fica com o
   * primeiro que está, e o Tab nunca pula a galeria inteira.
   */
  const [vez, setVez] = useState(0);
  const pedido = useRef<number | null>(null);
  const itens = linhas.getVirtualItems();
  const montados = virtual
    ? { de: (itens[0]?.index ?? 0) * colunas, ate: ((itens.at(-1)?.index ?? -1) + 1) * colunas }
    : { de: 0, ate: assets.length };
  const naLista = Math.min(vez, Math.max(assets.length - 1, 0));
  const comAVez = naLista >= montados.de && naLista < montados.ate ? naLista : montados.de;

  // O foco vai para o tile pedido assim que ele estiver montado — na virtual,
  // um salto do Home ao End precisa de uma rolagem e de uma renderização antes.
  useEffect(() => {
    if (pedido.current === null) return;
    const porta = lista.current?.querySelector<HTMLElement>(
      `[data-indice="${pedido.current}"] [data-porta]`,
    );
    if (!porta) return;
    pedido.current = null;
    porta.focus();
  });

  function focar(indice: number) {
    const alvo = Math.max(0, Math.min(indice, assets.length - 1));
    pedido.current = alvo;
    setVez(alvo);
    if (virtual) linhas.scrollToIndex(Math.floor(alvo / colunas));
  }

  function aoFocar(evento: FocusEvent<HTMLUListElement>) {
    // Clicar ou chegar pelo Tab num tile passa a vez para ele.
    const item = (evento.target as HTMLElement).closest<HTMLElement>("[data-indice]");
    if (item) setVez(Number(item.dataset.indice));
  }

  function aoTeclar(evento: ReactKeyboardEvent<HTMLUListElement>) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
    const passos: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: colunas,
      ArrowUp: -colunas,
    };
    const passo = passos[evento.key];
    if (passo !== undefined) {
      evento.preventDefault();
      focar(comAVez + passo);
    } else if (evento.key === "Home") {
      evento.preventDefault();
      focar(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      focar(assets.length - 1);
    }
  }

  const teclado = { onKeyDown: aoTeclar, onFocus: aoFocar };

  // `scrollbar-gutter: stable`: a barra de rolagem que aparece ou some não muda
  // a largura, e as colunas não ficam trocando de número na borda.
  // Só a partir de `md`: no telefone a barra de rolagem flutua por cima, e a
  // reserva deixava a margem da direita maior que a da esquerda (T-49).
  const classeDoScroller = "min-h-0 flex-1 overflow-y-auto md:[scrollbar-gutter:stable]";

  if (!virtual) {
    return (
      // Em tela baixa, a galeria pequena rola junto com a página (T-67).
      <div className={cn(classeDoScroller, "baixa:flex-none baixa:overflow-visible")}>
        <ul
          ref={lista}
          {...teclado}
          className="mx-3.5 mb-6 grid"
          style={{
            gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
            gridAutoRows: medidas.alturaDoTile,
            gap: VAO_DA_GALERIA,
          }}
        >
          {assets.map((asset, indice) => (
            <li key={asset.id} data-indice={indice}>
              {tile(asset, medidas, modoSelecao, indice === comAVez)}
            </li>
          ))}
        </ul>
        {fim}
      </div>
    );
  }

  return (
    // `flex-1 min-h-0` em vez de uma altura fixa: a altura vem do pai, que é a
    // coluna do painel. Uma `70vh` cravada aqui ignoraria a bandeja do lote e a
    // barra de filtros que dividem a mesma tela.
    // Em tela baixa a página rola, e a galeria virtual precisa de altura
    // própria: a da tela inteira, que é o que ela ocupa quando se chega nela
    // (T-67). Sem isto, `flex-1` numa coluna sem altura dava 0 px.
    <div
      ref={scroller}
      data-virtual="sim"
      className={cn(classeDoScroller, "contain-strict baixa:h-dvh baixa:flex-none")}
    >
      <ul
        ref={lista}
        {...teclado}
        className="relative mx-3.5"
        style={{ height: linhas.getTotalSize() }}
      >
        {itens.flatMap((linha) => {
          const inicio = linha.index * colunas;
          return assets.slice(inicio, inicio + colunas).map((asset, coluna) => (
            <li
              key={asset.id}
              data-indice={inicio + coluna}
              // A lista tem 5.042 itens e desenha 40: sem isto, o leitor de tela
              // anunciaria "item 3 de 40".
              aria-setsize={assets.length}
              aria-posinset={inicio + coluna + 1}
              style={{
                position: "absolute",
                top: 0,
                // Coluna k de c, com vão g: começa em k · (100% + g) / c.
                left: `calc(${coluna} * (100% + ${VAO_DA_GALERIA}px) / ${colunas})`,
                width: `calc((100% - ${(colunas - 1) * VAO_DA_GALERIA}px) / ${colunas})`,
                height: medidas.alturaDoTile,
                transform: `translateY(${linha.start}px)`,
              }}
            >
              {tile(asset, medidas, modoSelecao, inicio + coluna === comAVez)}
            </li>
          ));
        })}
      </ul>
      {fim}
    </div>
  );
}

// --- o que os cartões compartilham ---------------------------------------------------------

interface CartaoProps {
  readonly asset: Asset;
  /**
   * O nome na tela. É o do asset, com o que o diferencia quando dois compartilham
   * o mesmo nome na lista (T-56) — a ward e a sombra dela, o item do Rift e o do
   * ARAM.
   */
  readonly rotulo: string;
  readonly url: string;
  readonly estado: EstadoDoCartao;
  readonly marcar: (id: string, estado: EstadoDoCartao) => void;
  readonly baixar: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar: (texto: string) => Promise<void>;
  readonly selecionado?: boolean;
  readonly onAlternar?: (id: string) => void;
  readonly onAmpliar?: (asset: Asset) => void;
}

/**
 * O download de um cartão: o estado dele no painel, e qual dos dois botões gira
 * ou confirma (T-47b). A confirmação volta sozinha em dois segundos.
 */
/**
 * As duas formas de baixar e o copiar, num bloco só (T-53).
 *
 * Existe para a **ampliação** ter as mesmas ações do tile sem duplicá-las: em
 * tela de toque a faixa do tile não aparece, e a ampliação é o caminho — tocar
 * na arte, conferir no tamanho grande, baixar dali. No computador ela também
 * serve, pelo mesmo motivo de sempre: quem ampliou para conferir o detalhe está
 * a um clique de querer o arquivo.
 */
export function AcoesDoAsset({
  asset,
  url,
  baixar = baixarDeVerdade,
  copiar = copiarDeVerdade,
  className,
}: {
  readonly asset: Asset;
  readonly url: string;
  readonly baixar?: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar?: (texto: string) => Promise<void>;
  readonly className?: string;
}) {
  const semMarcar = useCallback(() => {}, []);
  const { acionar, andamento, feito } = useDownload(asset, url, semMarcar, baixar);
  const { copia, copiarUrl } = useCopia(copiar, url);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <ParDeDownload
        podeConverter={canConvertToPng(asset)}
        ocupado={andamento !== null}
        baixando={andamento}
        baixado={feito}
        onOriginal={() => void acionar(false)}
        onPng={() => void acionar(true)}
      />
      <BotaoDeCopiar copia={copia} onClick={copiarUrl} />
      <span role="status" className="sr-only">
        {anuncioDe(copia, feito)}
      </span>
    </div>
  );
}

function useDownload(
  asset: Asset,
  url: string,
  marcar: (id: string, estado: EstadoDoCartao) => void,
  baixar: (asset: Asset, comoPng: boolean, url: string) => Promise<void>,
) {
  const [andamento, setAndamento] = useState<QualDownload | null>(null);
  const [feito, setFeito] = useState<QualDownload | null>(null);

  useEffect(() => {
    if (!feito) return;
    const volta = window.setTimeout(() => setFeito(null), 2000);
    return () => window.clearTimeout(volta);
  }, [feito]);

  const acionar = useCallback(
    async (comoPng: boolean) => {
      const qual: QualDownload = comoPng ? "png" : "original";
      marcar(asset.id, "baixando");
      setAndamento(qual);
      setFeito(null);
      try {
        await baixar(asset, comoPng, url);
        marcar(asset.id, "pronto");
        setFeito(qual);
      } catch {
        // O erro fica no cartão. Derrubar o painel por causa de um asset seria
        // esconder os outros trinta que funcionam.
        marcar(asset.id, "erro");
      } finally {
        setAndamento(null);
      }
    },
    [asset, baixar, marcar, url],
  );

  return { acionar, andamento, feito };
}

/**
 * Copiar a URL, com a confirmação no próprio botão (T-45).
 *
 * Não num aviso flutuante: o painel do campeão é um diálogo, e o Radix esconde
 * do leitor de tela tudo o que está fora dele — um aviso lá fora nunca seria
 * anunciado. Aqui, o ícone vira ✓, a dica abre sozinha dizendo "Link copiado",
 * e a região `role="status"` do cartão anuncia.
 */
function useCopia(copiar: (texto: string) => Promise<void>, url: string) {
  const [copia, setCopia] = useState<"parado" | "copiado" | "falhou">("parado");
  useEffect(() => {
    if (copia === "parado") return;
    const volta = window.setTimeout(() => setCopia("parado"), 2000);
    return () => window.clearTimeout(volta);
  }, [copia]);
  const copiarUrl = useCallback(() => {
    // `Promise.resolve().then`: fora de contexto seguro o `navigator.clipboard`
    // nem existe, e o erro sairia síncrono, antes de qualquer `.then`.
    Promise.resolve()
      .then(() => copiar(url))
      .then(
        () => setCopia("copiado"),
        () => setCopia("falhou"),
      );
  }, [copiar, url]);
  return { copia, copiarUrl };
}

type EstadoDaCopia = ReturnType<typeof useCopia>["copia"];

/** O que a região `role="status"` do cartão diz: a última coisa que aconteceu. */
function anuncioDe(copia: EstadoDaCopia, feito: QualDownload | null): string {
  if (copia === "copiado") return "Link copiado";
  if (copia === "falhou") return "Não deu para copiar o link";
  if (feito) return "Arquivo baixado";
  return "";
}

function BotaoDeCopiar({
  copia,
  onClick,
  className,
  leve = false,
}: {
  copia: EstadoDaCopia;
  onClick: () => void;
  className?: string;
  /** A dica em CSS: na galeria virtual, o Radix de cada tile pesava na rolagem. */
  leve?: boolean;
}) {
  return (
    <BotaoIcone
      rotulo="Copiar link"
      dicaLeve={leve}
      dica={copia === "copiado" ? "Link copiado" : copia === "falhou" ? "Não deu para copiar" : undefined}
      dicaAberta={copia !== "parado"}
      icone={
        copia === "copiado" ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )
      }
      onClick={onClick}
      className={className}
    />
  );
}

/**
 * A caixa do lote (RF-17). O nome acessível vem do `aria-label`, não do texto
 * do rótulo: o que está escrito é "✓" ou "+", que não diz nada a quem não vê.
 */
function CaixaDeSelecao({
  asset,
  selecionado,
  onAlternar,
  className,
  tabIndex,
  porta,
}: {
  asset: Asset;
  selecionado?: boolean;
  onAlternar: (id: string) => void;
  className?: string;
  tabIndex?: number;
  /** É por ela que o foco entra no tile, quando não há ampliação (T-63). */
  porta?: boolean;
}) {
  return (
    <label
      className={cn(
        "grid size-controle-min flex-none cursor-pointer place-items-center rounded-tecla border",
        "font-mono text-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento",
        // No toque, a caixa de 17 px ganha uma área invisível de 45 px em volta (T-49).
        "pointer-coarse:before:absolute pointer-coarse:before:-inset-[14px] pointer-coarse:before:content-['']",
        selecionado
          ? "border-acento bg-acento text-superficie"
          : "border-borda-fraca bg-superficie/80 text-texto-suave hover:border-acento",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        aria-label={`Selecionar ${asset.fileName}`}
        tabIndex={tabIndex}
        data-porta={porta || undefined}
        checked={selecionado ?? false}
        onChange={() => onAlternar(asset.id)}
      />
      <span aria-hidden="true">{selecionado ? "✓" : "+"}</span>
    </label>
  );
}

/**
 * A prévia: absoluta e centralizada, no tamanho do arquivo e nunca maior que a
 * caixa — um ícone de 64 px fica com 64 px, em vez de esticado e borrado. Com
 * `onAmpliar`, ela é o botão da ampliação.
 */
function Previa({
  asset,
  url,
  caixa,
  folga,
  onAmpliar,
  tabIndex,
}: {
  asset: Asset;
  url: string;
  caixa: { className?: string; style?: CSSProperties };
  /** O respiro entre a imagem e a borda da caixa. */
  folga?: string;
  onAmpliar?: (asset: Asset) => void;
  tabIndex?: number;
}) {
  const limite = folga ? `100% - ${folga}` : "100%";
  const imagem = (
    <div className={cn("w-full", caixa.className)} style={caixa.style}>
      <Imagem
        src={url}
        alt={`Prévia de ${asset.names.pt_BR}`}
        data-previa={asset.type}
        classeDaCaixa="size-full"
        className="absolute inset-0 m-auto size-auto"
        style={{
          maxWidth: `min(${limite}, ${asset.width}px)`,
          maxHeight: `min(${limite}, ${asset.height}px)`,
        }}
      />
    </div>
  );

  if (!onAmpliar) return imagem;
  return (
    <button
      type="button"
      onClick={() => onAmpliar(asset)}
      aria-label={`Ampliar ${asset.fileName}`}
      tabIndex={tabIndex}
      data-porta
      className="group/previa relative block w-full cursor-zoom-in"
    >
      {imagem}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-2 grid size-7 place-items-center rounded-padrao bg-superficie/80 text-texto opacity-0 transition-opacity duration-150 ease-saida group-hover/previa:opacity-100 group-focus-visible/previa:opacity-100"
      >
        <Maximize2 strokeWidth={1.75} className="size-3.5" />
      </span>
    </button>
  );
}

// --- o tile da galeria (categorias, T-48) --------------------------------------------------

/**
 * O que aparece no *hover* e no foco, e fica sempre à vista onde não há *hover*.
 * Escondido com opacidade, não com `display`: continua alcançável pelo Tab, e o
 * foco é justamente o que o mostra.
 */
const SO_NO_HOVER =
  "opacity-0 transition-opacity duration-150 ease-saida group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100";

/**
 * A faixa que cobre a arte — ficha e ações — e que em tela de toque **não**
 * aparece (T-53).
 *
 * Em tela de toque não há *hover*, e o T-48 resolvia isso deixando a faixa
 * sempre à vista: num tile de ícone de 64 px, os botões cobriam a arte inteira,
 * o tempo todo. Aqui ela some, e o caminho do toque é tocar na arte: a
 * ampliação abre com a ficha e os dois downloads. O teclado continua revelando
 * pelo foco, que é o que mantém a faixa alcançável sem ponteiro.
 */
const SO_COM_PONTEIRO =
  "opacity-0 transition-opacity duration-150 ease-saida group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:group-hover/tile:opacity-0";

/**
 * Memorizado: a cada quadro de rolagem a galeria virtual desenha de novo, e sem
 * isto os 60 tiles na tela renderizavam inteiros junto — só para sair iguais.
 * Com ele, rolar monta só as linhas que entram. As props são todas estáveis:
 * valores simples e funções que não mudam enquanto a lista não muda.
 */
const TileDaGaleria = memo(function TileDaGaleria({
  asset,
  rotulo,
  url,
  estado,
  marcar,
  baixar,
  copiar,
  selecionado,
  onAlternar,
  onAmpliar,
  medidas,
  modoSelecao,
  naVez = true,
}: CartaoProps & {
  readonly medidas: MedidasDaGaleria;
  readonly modoSelecao: boolean;
  /** Fora da vez, o tile sai da ordem do Tab: as setas é que chegam nele (T-63). */
  readonly naVez?: boolean;
}) {
  const { acionar, andamento, feito } = useDownload(asset, url, marcar, baixar);
  const { copia, copiarUrl } = useCopia(copiar, url);
  // Enquanto alguma coisa acontece no tile, as ações não somem debaixo do mouse.
  const ativo = estado !== "pronto" || andamento !== null || feito !== null || copia !== "parado";

  /**
   * As ações entram no DOM quando o tile é apontado ou recebe foco (T-60).
   *
   * Medido no build de produção, na categoria de 5.042 ícones: **45 nós por
   * tile**, 49 tiles na tela, 2.472 nós na página — e montar tile é o que custa
   * quadro na rolagem. Os dois downloads, o copiar e as três dicas são dois
   * terços desses nós, e ninguém os vê até apontar.
   *
   * O foco chega pelo botão de ampliar, que continua sempre no DOM: entrou o
   * foco no tile, as ações existem, e o Tab seguinte cai nelas. A faixa e a
   * ficha ficam — é a ficha que o RF-09 pede antes do download.
   */
  const [revelado, setRevelado] = useState(false);
  // Sem ampliação nem caixa de seleção, o tile não teria nada focável antes das
  // ações — e o teclado nunca chegaria nelas. Aí elas ficam sempre no DOM.
  const temPortaDeFoco = Boolean(onAmpliar || onAlternar);
  const mostrarAcoes = revelado || ativo || !temPortaDeFoco;
  const tabIndex = naVez ? 0 : -1;

  return (
    <article
      aria-label={asset.fileName}
      data-tipo={asset.type}
      data-estado={estado}
      onMouseEnter={() => setRevelado(true)}
      onMouseLeave={() => setRevelado(false)}
      onFocusCapture={() => setRevelado(true)}
      onBlurCapture={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) setRevelado(false);
      }}
      className={cn(
        "group/tile flex h-full flex-col overflow-hidden rounded-medio border bg-superficie-alta",
        "transition-colors duration-150 ease-saida",
        selecionado ? "border-acento" : "border-borda hover:border-borda-forte",
      )}
    >
      <div className="relative flex-none" style={{ height: medidas.alturaDaPrevia }}>
        <Previa
          asset={asset}
          url={url}
          caixa={{ style: { height: medidas.alturaDaPrevia } }}
          // O respiro em volta da arte encolhe com o tile (T-53): 16 px num
          // tile de 112 px eram 29% da largura gastos em borda.
          folga={medidas.acoesComRotulo ? "12px" : "6px"}
          onAmpliar={onAmpliar}
          tabIndex={tabIndex}
        />

        {onAlternar && (
          <CaixaDeSelecao
            asset={asset}
            selecionado={selecionado}
            onAlternar={onAlternar}
            tabIndex={tabIndex}
            porta={!onAmpliar}
            className={cn("absolute top-2 left-2", SO_NO_HOVER, (selecionado || modoSelecao) && "opacity-100")}
          />
        )}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-superficie/95 via-superficie/80 to-transparent p-1.5 pt-6",
            SO_COM_PONTEIRO,
            ativo && "opacity-100",
          )}
        >
          {/* RF-09: a ficha aparece antes de qualquer clique de download — e
              aparece junto das ações, no mesmo gesto que as revela. Em duas
              linhas, porque inteira ela não cabe num tile estreito. */}
          <p className="overflow-hidden font-mono text-10 leading-3.5 text-ellipsis whitespace-pre text-texto-suave">
            {`${asset.width}×${asset.height} · ${asset.format}\n${formatBytes(asset.bytes)} · ${asset.source}`}
          </p>
          <div className="flex min-h-controle-md items-center gap-1">
            {mostrarAcoes && (
              <>
                <ParDeDownload
                  compacto={medidas.acoesComRotulo}
                  icone={!medidas.acoesComRotulo}
                  podeConverter={canConvertToPng(asset)}
                  ocupado={estado === "baixando"}
                  baixando={andamento}
                  baixado={feito}
                  onOriginal={() => void acionar(false)}
                  onPng={() => void acionar(true)}
                />
                <div className="ml-auto">
                  <BotaoDeCopiar
                    leve
                    copia={copia}
                    onClick={copiarUrl}
                    className="bg-superficie/80 text-texto hover:bg-superficie"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {estado === "erro" && (
          <p
            role="alert"
            className="absolute inset-x-1.5 top-1.5 rounded-padrao bg-superficie/90 px-2 py-1 text-11 leading-cartao text-acento-mais-claro"
          >
            Não deu para baixar. Tente de novo.
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center px-2 py-1.5">
        <h3 title={rotulo} className="truncate text-12 leading-4 font-medium text-texto-forte">
          {rotulo}
        </h3>
      </div>

      <span role="status" className="sr-only">
        {anuncioDe(copia, feito)}
      </span>
    </article>
  );
});

// --- o cartão da grade (painel do campeão, T-47b) ----------------------------------------

/** A altura máxima da prévia na grade: uma tela de carregamento é mais alta que larga. */
const ALTURA_MAXIMA_DA_PREVIA = 256;

function CartaoDaGrade({
  asset,
  rotulo,
  url,
  estado,
  marcar,
  baixar,
  copiar,
  selecionado,
  onAlternar,
  onAmpliar,
}: CartaoProps) {
  const { acionar, andamento, feito } = useDownload(asset, url, marcar, baixar);
  const { copia, copiarUrl } = useCopia(copiar, url);
  const ocupado = estado === "baixando";

  return (
    <article
      aria-label={asset.fileName}
      data-tipo={asset.type}
      data-estado={estado}
      className="flex flex-col overflow-hidden rounded-medio border border-borda bg-superficie-alta"
    >
      <div className="relative">
        {/* Proporção real, e nunca maior que o arquivo. Altura em porcentagem,
            aqui, não resolvia: a tela de carregamento crescia pela largura e
            aparecia cortada no meio. */}
        <Previa
          asset={asset}
          url={url}
          caixa={{
            className: "min-h-24",
            style: {
              aspectRatio: `${asset.width} / ${asset.height}`,
              maxHeight: Math.min(ALTURA_MAXIMA_DA_PREVIA, asset.height),
            },
          }}
          onAmpliar={onAmpliar}
        />
        {onAlternar && (
          <CaixaDeSelecao
            asset={asset}
            selecionado={selecionado}
            onAlternar={onAlternar}
            className="absolute top-2 left-2"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 px-3 pt-2.5">
        {/* O tipo na mesma linha do nome (T-58): eram três linhas de texto por
            cartão, e o painel do campeão mostrava uma fileira de cada vez. */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h4 title={rotulo} className="truncate text-13 font-medium text-texto-forte">
            {rotulo}
          </h4>
          <p className="flex-none truncate font-mono text-10 uppercase tracking-rotulo text-texto-suave">
            {rotuloDoTipo(asset.type)}
          </p>
        </div>
        {/* RF-09: a ficha aparece antes de qualquer clique de download. */}
        <p className="truncate font-mono text-10 text-texto-suave">{assetSummary(asset)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5 pb-3">
        <ParDeDownload
          podeConverter={canConvertToPng(asset)}
          ocupado={ocupado}
          baixando={andamento}
          baixado={feito}
          onOriginal={() => void acionar(false)}
          onPng={() => void acionar(true)}
        />
        <BotaoDeCopiar copia={copia} onClick={copiarUrl} />
        <span role="status" className="sr-only">
          {anuncioDe(copia, feito)}
        </span>
      </div>

      {estado === "erro" && (
        <p role="alert" className="px-3 pb-3 text-11 text-acento-mais-claro">
          Não deu para baixar. Tente de novo.
        </p>
      )}
    </article>
  );
}
