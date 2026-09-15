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
 * **Lista grande vira lista virtual.** Acima de `LIMITE_DE_VIRTUALIZACAO` cartões
 * o painel troca o `<ul>` por um scroller do TanStack Virtual ([ADR 0011]): a
 * categoria `profile_icon` tem 5.042 ícones, e 5.042 `<article>` no DOM é o
 * tipo de coisa que só se percebe no meio da rolagem. Abaixo do limite nada
 * muda — o painel de um campeão tem dezenas de cartões e não paga scroller
 * próprio por isso.
 *
 * **Grade, no painel do campeão (T-47b).** Com `grade`, os cartões vêm agrupados
 * por família — a arte grande, os retratos, as habilidades —, cada um com a
 * prévia na proporção real e sem ampliar imagem menor que a caixa. Com
 * `onAmpliar`, a prévia vira o botão da ampliação. As categorias continuam em
 * lista até o T-48.
 *
 * Baixar dá retorno no próprio botão: o ícone gira enquanto baixa e vira ✓ por
 * dois segundos quando termina, e o leitor de tela ouve "Arquivo baixado". O
 * nome do botão não muda — quem procura "Baixar original" continua achando.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Link2, Maximize2 } from "lucide-react";

import type { Asset } from "@lol-assets/schema";

import {
  agruparPorFamilia,
  LIMITE_DE_VIRTUALIZACAO,
  orderAssets,
  rotuloDoTipo,
} from "@/lib/asset-panel";
import { Botao } from "@/components/ui/botao";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { Imagem } from "@/components/ui/imagem";
import { ParDeDownload, type QualDownload } from "@/components/ui/par-de-download";
import { cn } from "@/lib/utils";
import {
  assetSummary,
  assetUrl,
  canConvertToPng,
  convertToPng,
  pngFileName,
  saveBlob,
} from "@/lib/asset-file";

export type EstadoDoCartao = "pronto" | "baixando" | "erro";

export interface PainelDeAssetProps {
  readonly titulo: string;
  readonly assets: readonly Asset[];
  readonly assetsBaseUrl?: string;
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
   * Dentro de outro painel que já tem o próprio fechar (T-47): o "fechar"
   * daqui some. Dois botões fechando a mesma coisa por caminhos diferentes são
   * um a mais para achar e um a mais para entender.
   */
  readonly embutido?: boolean;
  /**
   * Grade agrupada por família, com a prévia na proporção real (T-47b). É o
   * painel do campeão; as categorias continuam em lista até o T-48.
   */
  readonly grade?: boolean;
  /** Quem amplia a arte. Com ele, a prévia do cartão da grade vira botão. */
  readonly onAmpliar?: (asset: Asset) => void;
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
  embutido = false,
  grade = false,
  onAmpliar,
}: PainelDeAssetProps) {
  const ordenados = useMemo(() => orderAssets(assets), [assets]);
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

  return (
    <section aria-label={titulo} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center gap-2 px-3.5 py-2">
        <h2 className="truncate text-12 font-medium text-texto-forte">{titulo}</h2>
        <span className="font-mono text-11 text-texto-suave">
          {ordenados.length} {ordenados.length === 1 ? "asset" : "assets"}
        </span>
        {!embutido && (
          <Botao variante="fantasma" tamanho="md" onClick={onClose} className="ml-auto">
            fechar
          </Botao>
        )}
      </div>

      {grade ? (
        <div className="flex flex-col gap-6 px-3.5 pb-6">
          {grupos.map((grupo) => {
            const cartoes = (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-3">
                {grupo.assets.map((asset) => (
                  <li key={asset.id}>
                    <CartaoDaGrade
                      asset={asset}
                      url={assetUrl(asset, assetsBaseUrl)}
                      estado={estados[asset.id] ?? "pronto"}
                      marcar={marcar}
                      baixar={baixar}
                      copiar={copiar}
                      selecionado={selecao?.has(asset.id)}
                      onAlternar={onAlternar}
                      onAmpliar={onAmpliar}
                    />
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
      ) : ordenados.length > LIMITE_DE_VIRTUALIZACAO ? (
        <ListaVirtual
          assets={ordenados}
          assetsBaseUrl={assetsBaseUrl}
          estados={estados}
          marcar={marcar}
          baixar={baixar}
          copiar={copiar}
          selecao={selecao}
          onAlternar={onAlternar}
        />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pb-4">
          {ordenados.map((asset) => (
            <li key={asset.id}>
              <CartaoDeAsset
                asset={asset}
                url={assetUrl(asset, assetsBaseUrl)}
                estado={estados[asset.id] ?? "pronto"}
                marcar={marcar}
                baixar={baixar}
                copiar={copiar}
                selecionado={selecao?.has(asset.id)}
                onAlternar={onAlternar}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ListaVirtualProps {
  readonly assets: readonly Asset[];
  readonly assetsBaseUrl?: string;
  readonly estados: Record<string, EstadoDoCartao>;
  readonly marcar: (id: string, estado: EstadoDoCartao) => void;
  readonly baixar: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar: (texto: string) => Promise<void>;
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
}

/**
 * Altura **estimada** de um cartão, só para o primeiro quadro.
 *
 * O virtualizador mede cada linha de verdade depois de desenhá-la (ver
 * `measureElement` abaixo); esta constante existe só para ele dimensionar a
 * barra de rolagem antes de ter medido qualquer coisa. Errar aqui custa um
 * salto no scroll, não um cartão por cima do outro.
 */
const ALTURA_ESTIMADA = 93;

function ListaVirtual({
  assets,
  assetsBaseUrl,
  estados,
  marcar,
  baixar,
  copiar,
  selecao,
  onAlternar,
}: ListaVirtualProps) {
  const scroller = useRef<HTMLDivElement>(null);
  // Sem `measureElement`: o cartão tem altura previsível e medir de volta em
  // jsdom (que não faz layout) devolveria zero e faria a lista se recalcular
  // para sempre. Estimativa fixa é o que mantém isto testável.
  const virtual = useVirtualizer({
    count: assets.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ALTURA_ESTIMADA,
    overscan: 6,
    /**
     * Mede cada linha de verdade, em vez de assumir uma altura.
     *
     * Altura cravada não sobrevive: o cartão muda de forma entre telefone e
     * desktop, o nome do asset quebra em duas linhas ou não, e os botões descem
     * quando não cabem. Já quebrou duas vezes — a categoria `emote` chegou a
     * desenhar imagem por cima do texto da linha seguinte.
     *
     * O `|| ALTURA_ESTIMADA` é o que mantém isto testável: o jsdom não faz
     * layout e devolve 0 para tudo, e uma lista de alturas zero não desenha
     * nada. Fora do navegador, vale a estimativa.
     */
    measureElement: (elemento) => elemento.getBoundingClientRect().height || ALTURA_ESTIMADA,
  });

  return (
    <div
      ref={scroller}
      data-virtual="sim"
      // `flex-1 min-h-0` em vez de uma altura fixa: a altura vem do pai, que é
      // a coluna do painel. Uma `70vh` cravada aqui ignoraria a bandeja do lote
      // e a barra de filtros que dividem a mesma tela.
      className="min-h-0 flex-1 overflow-y-auto contain-strict"
    >
      <ul style={{ height: virtual.getTotalSize(), position: "relative", margin: 0, padding: 0 }}>
        {virtual.getVirtualItems().map((item) => {
          const asset = assets[item.index];
          return (
            <li
              key={asset.id}
              data-index={item.index}
              ref={virtual.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
              }}
            >
              <CartaoDeAsset
                asset={asset}
                url={assetUrl(asset, assetsBaseUrl)}
                estado={estados[asset.id] ?? "pronto"}
                marcar={marcar}
                baixar={baixar}
                copiar={copiar}
                selecionado={selecao?.has(asset.id)}
                onAlternar={onAlternar}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface CartaoProps {
  readonly asset: Asset;
  readonly url: string;
  readonly estado: EstadoDoCartao;
  readonly marcar: (id: string, estado: EstadoDoCartao) => void;
  readonly baixar: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar: (texto: string) => Promise<void>;
  readonly selecionado?: boolean;
  readonly onAlternar?: (id: string) => void;
}

// --- o que os dois cartões compartilham ---------------------------------------------------

/**
 * O download de um cartão: o estado dele no painel, e qual dos dois botões gira
 * ou confirma (T-47b). A confirmação volta sozinha em dois segundos.
 */
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

function BotaoDeCopiar({ copia, onClick }: { copia: EstadoDaCopia; onClick: () => void }) {
  return (
    <BotaoIcone
      rotulo="Copiar URL"
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
}: {
  asset: Asset;
  selecionado?: boolean;
  onAlternar: (id: string) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "grid size-controle-min flex-none cursor-pointer place-items-center rounded-tecla border",
        "font-mono text-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento",
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
        checked={selecionado ?? false}
        onChange={() => onAlternar(asset.id)}
      />
      <span aria-hidden="true">{selecionado ? "✓" : "+"}</span>
    </label>
  );
}

// --- o cartão da lista (categorias) -------------------------------------------------------

function CartaoDeAsset({
  asset,
  url,
  estado,
  marcar,
  baixar,
  copiar,
  selecionado,
  onAlternar,
}: CartaoProps) {
  const { acionar, andamento, feito } = useDownload(asset, url, marcar, baixar);
  const { copia, copiarUrl } = useCopia(copiar, url);
  const ocupado = estado === "baixando";

  return (
    <article
      aria-label={asset.fileName}
      data-tipo={asset.type}
      data-estado={estado}
      className="flex flex-col items-start gap-2 border-b border-borda px-0.5 py-2.5 sm:flex-row sm:items-center sm:gap-3"
    >
      {onAlternar && (
        <CaixaDeSelecao asset={asset} selecionado={selecionado} onAlternar={onAlternar} />
      )}

      {/* RNF-02: a prévia é o que responde "é esta arte?" antes de baixar 121 KB.
          `loading="lazy"` porque uma categoria tem milhares de cartões e nem
          todos passam pela tela.

          `<img>` e não `next/image`: a URL é de terceiro e o [ADR 0012] não tem
          storage nem proxy — otimizar exigiria servir os bytes por conta
          própria, que é exatamente o que o projeto decidiu não fazer.

          Altura cravada e `object-contain`: a linha da lista virtual tem altura
          fixa, e prévia livre a estoura — foi o que fez a categoria `emote`
          desenhar imagem por cima do texto da linha seguinte. */}
      <Imagem
        src={url}
        alt={`Prévia de ${asset.names.pt_BR}`}
        data-previa={asset.type}
        classeDaCaixa="h-18 w-24 flex-none rounded-padrao"
        className="object-contain"
      />

      {/* **Nome primeiro, tipo depois.** No painel de um campeão as linhas são
          tipos da mesma arte e o nome se repete; numa categoria são 2.338
          assets diferentes e o tipo se repete. Mostrar os dois é o único
          arranjo que serve aos dois casos — sem ele, `emote` vira 2.338 linhas
          escritas "Emote". */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-13 font-medium text-texto-forte">{asset.names.pt_BR}</h3>
        <p className="truncate font-mono text-10 uppercase tracking-rotulo text-texto-suave">
          {rotuloDoTipo(asset.type)}
        </p>
        {/* RF-09: a ficha aparece antes de qualquer clique de download. */}
        <p className="truncate font-mono text-11 text-texto-suave">{assetSummary(asset)}</p>
      </div>

      <div className="flex w-full flex-none flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
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
        <p role="alert" className="flex-none text-11 text-acento-mais-claro">
          Falhou ao baixar. Tente de novo.
        </p>
      )}
    </article>
  );
}

// --- o cartão da grade (painel do campeão, T-47b) ----------------------------------------

/** A altura máxima da prévia na grade: uma tela de carregamento é mais alta que larga. */
const ALTURA_MAXIMA_DA_PREVIA = 256;

function PreviaDaGrade({
  asset,
  url,
  onAmpliar,
}: {
  asset: Asset;
  url: string;
  onAmpliar?: (asset: Asset) => void;
}) {
  const caixa = (
    // Proporção real, e nunca maior que o arquivo: um ícone de 64 px fica com
    // 64 px, centralizado, em vez de esticado e borrado.
    <div
      className="min-h-24 w-full"
      style={{
        aspectRatio: `${asset.width} / ${asset.height}`,
        maxHeight: Math.min(ALTURA_MAXIMA_DA_PREVIA, asset.height),
      }}
    >
      <Imagem
        src={url}
        alt={`Prévia de ${asset.names.pt_BR}`}
        data-previa={asset.type}
        classeDaCaixa="grid size-full place-items-center"
        className="object-contain"
        style={{ maxWidth: asset.width, maxHeight: asset.height }}
      />
    </div>
  );

  if (!onAmpliar) return caixa;
  return (
    <button
      type="button"
      onClick={() => onAmpliar(asset)}
      aria-label={`Ampliar ${asset.fileName}`}
      className="group/previa relative block w-full cursor-zoom-in"
    >
      {caixa}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 bottom-2 grid size-7 place-items-center rounded-padrao bg-superficie/80 text-texto opacity-0 transition-opacity duration-150 ease-saida group-hover/previa:opacity-100 group-focus-visible/previa:opacity-100"
      >
        <Maximize2 strokeWidth={1.75} className="size-3.5" />
      </span>
    </button>
  );
}

function CartaoDaGrade({
  asset,
  url,
  estado,
  marcar,
  baixar,
  copiar,
  selecionado,
  onAlternar,
  onAmpliar,
}: CartaoProps & { readonly onAmpliar?: (asset: Asset) => void }) {
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
        <PreviaDaGrade asset={asset} url={url} onAmpliar={onAmpliar} />
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
        <h4 className="truncate text-13 font-medium text-texto-forte">{asset.names.pt_BR}</h4>
        <p className="truncate font-mono text-10 uppercase tracking-rotulo text-texto-suave">
          {rotuloDoTipo(asset.type)}
        </p>
        {/* RF-09: a ficha aparece antes de qualquer clique de download. */}
        <p className="truncate font-mono text-11 text-texto-suave">{assetSummary(asset)}</p>
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
          Falhou ao baixar. Tente de novo.
        </p>
      )}
    </article>
  );
}
