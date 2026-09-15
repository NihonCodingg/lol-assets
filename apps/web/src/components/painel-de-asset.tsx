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
 * Tela crua de propósito; o design chega no T-30, e as medidas inline do
 * scroller vão junto.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Link2 } from "lucide-react";

import type { Asset } from "@lol-assets/schema";

import { LIMITE_DE_VIRTUALIZACAO, orderAssets, rotuloDoTipo } from "@/lib/asset-panel";
import { Botao } from "@/components/ui/botao";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { Imagem } from "@/components/ui/imagem";
import { ParDeDownload } from "@/components/ui/par-de-download";
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
}: PainelDeAssetProps) {
  const ordenados = useMemo(() => orderAssets(assets), [assets]);
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
        <Botao variante="fantasma" tamanho="md" onClick={onClose} className="ml-auto">
          fechar
        </Botao>
      </div>

      {ordenados.length > LIMITE_DE_VIRTUALIZACAO ? (
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
  const acionar = useCallback(
    async (comoPng: boolean) => {
      marcar(asset.id, "baixando");
      try {
        await baixar(asset, comoPng, url);
        marcar(asset.id, "pronto");
      } catch {
        // O erro fica no cartão. Derrubar o painel por causa de um asset seria
        // esconder os outros trinta que funcionam.
        marcar(asset.id, "erro");
      }
    },
    [asset, baixar, marcar, url],
  );

  const ocupado = estado === "baixando";

  /**
   * A confirmação de "Copiar URL" mora no próprio botão, não num aviso
   * flutuante (T-45). O painel do campeão é um diálogo, e o Radix esconde do
   * leitor de tela tudo o que está fora dele: um aviso lá fora nunca seria
   * anunciado. Aqui, o ícone vira ✓, a dica abre sozinha dizendo "Link
   * copiado", e uma região `role="status"` dentro do cartão anuncia.
   */
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

  return (
    <article
      aria-label={asset.fileName}
      data-tipo={asset.type}
      data-estado={estado}
      className="flex flex-col items-start gap-2 border-b border-borda px-0.5 py-2.5 sm:flex-row sm:items-center sm:gap-3"
    >
      {onAlternar && (
        <label
          className={cn(
            "grid size-controle-min flex-none cursor-pointer place-items-center rounded-tecla border",
            "font-mono text-10",
            selecionado
              ? "border-acento bg-acento text-superficie"
              : "border-borda-fraca text-texto-suave hover:border-acento",
          )}
        >
          {/* O nome acessível vem do `aria-label`, não do texto do rótulo: o
              que está escrito é "✓" ou "+", que não diz nada a quem não vê. */}
          <input
            type="checkbox"
            className="sr-only"
            aria-label={`Selecionar ${asset.fileName}`}
            checked={selecionado ?? false}
            onChange={() => onAlternar(asset.id)}
          />
          <span aria-hidden="true">{selecionado ? "✓" : "+"}</span>
        </label>
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
          onOriginal={() => void acionar(false)}
          onPng={() => void acionar(true)}
        />
        <BotaoIcone
          rotulo="Copiar URL"
          dica={
            copia === "copiado" ? "Link copiado" : copia === "falhou" ? "Não deu para copiar" : undefined
          }
          dicaAberta={copia !== "parado"}
          icone={
            copia === "copiado" ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Link2 aria-hidden="true" className="size-4" />
            )
          }
          onClick={copiarUrl}
        />
        <span role="status" className="sr-only">
          {copia === "copiado" ? "Link copiado" : copia === "falhou" ? "Não deu para copiar o link" : ""}
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
