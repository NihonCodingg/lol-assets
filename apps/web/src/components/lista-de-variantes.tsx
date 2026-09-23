"use client";

/**
 * As variantes de uma skin, em linhas (T-83, §5 do Plano de Design).
 *
 * Cada linha é um arquivo: a miniatura (que amplia), o nome nas palavras do
 * usuário, e a ficha em colunas alinhadas — o glifo de proporção com a
 * resolução, o formato e o peso, em algarismos tabulares, sem ponto médio. O
 * editor compara "1280×720" com "1215×717" de relance, e o glifo diz qual serve
 * para a thumbnail 16:9 sem ele ler número nenhum (a tarefa T8).
 *
 * As ações ficam no fim da linha: "Baixar PNG" é a primária, "Original" e
 * "Copiar link" as secundárias ([ADR 0001], emendado). A caixa do lote abre a
 * linha. A ficha aparece antes de qualquer clique (RF-09).
 *
 * Agrupadas por família — a arte grande, os retratos, a passiva e as
 * habilidades —, com o nome do grupo só quando há mais de um.
 */

import { memo, useCallback, useMemo, useState } from "react";

import type { Asset } from "@lol-assets/schema";

import {
  anuncioDe,
  baixarDeVerdade,
  BotaoDeCopiar,
  CaixaDeSelecao,
  copiarDeVerdade,
  useCopia,
  useDownload,
  type EstadoDoCartao,
} from "@/components/painel-de-asset";
import { Imagem } from "@/components/ui/imagem";
import { ParDeDownload } from "@/components/ui/par-de-download";
import { GlifoDeProporcao } from "@/components/ui/quadro";
import { assetUrl, canConvertToPng, formatBytes } from "@/lib/asset-file";
import { agruparPorFamilia, nomeDaVariante } from "@/lib/asset-panel";
import { cn } from "@/lib/utils";

export interface ListaDeVariantesProps {
  /** O nome da lista, para o leitor de tela: "Artes de Jax". */
  readonly titulo: string;
  readonly assets: readonly Asset[];
  readonly assetsBaseUrl?: string;
  readonly selecao?: ReadonlySet<string>;
  readonly onAlternar?: (id: string) => void;
  readonly onAmpliar?: (asset: Asset) => void;
  readonly baixar?: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar?: (texto: string) => Promise<void>;
  /** No telefone (T-87): a variante escolhida, que a barra de ação do pé baixa. */
  readonly escolhida?: string;
  readonly onEscolher?: (asset: Asset) => void;
}

/**
 * As colunas da linha, no computador: caixa, miniatura, nome, resolução,
 * formato, peso e ações. A das ações tem largura fixa: o arquivo que já é PNG
 * tem um botão só, e com largura automática as colunas da ficha andavam de
 * linha para linha. No telefone, a ficha desce para baixo do nome.
 */
const COLUNAS =
  "grid grid-cols-[auto_40px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 md:grid-cols-[auto_40px_minmax(0,1fr)_7.5rem_2.75rem_3.75rem_12.5rem]";

export function ListaDeVariantes({
  titulo,
  assets,
  assetsBaseUrl,
  selecao,
  onAlternar,
  onAmpliar,
  baixar = baixarDeVerdade,
  copiar = copiarDeVerdade,
  escolhida,
  onEscolher,
}: ListaDeVariantesProps) {
  const grupos = useMemo(() => agruparPorFamilia(assets), [assets]);
  const [estados, setEstados] = useState<Record<string, EstadoDoCartao>>({});
  const marcar = useCallback((id: string, estado: EstadoDoCartao) => {
    setEstados((antes) => ({ ...antes, [id]: estado }));
  }, []);

  return (
    <section aria-label={titulo} className="flex flex-col gap-4 px-4 pb-6">
      {grupos.map((grupo) => {
        const linhas = (
          <ul className="flex flex-col">
            {grupo.assets.map((asset) => (
              <li key={asset.id} className="border-b border-linha last:border-b-0">
                <Linha
                  asset={asset}
                  url={assetUrl(asset, assetsBaseUrl)}
                  estado={estados[asset.id] ?? "pronto"}
                  marcar={marcar}
                  baixar={baixar}
                  copiar={copiar}
                  selecionado={selecao?.has(asset.id)}
                  onAlternar={onAlternar}
                  onAmpliar={onAmpliar}
                  escolhida={escolhida === asset.id}
                  onEscolher={onEscolher}
                />
              </li>
            ))}
          </ul>
        );
        // Um grupo só não ganha cabeçalho: seria o nome da lista, repetido.
        if (grupos.length === 1) return <div key={grupo.chave}>{linhas}</div>;
        return (
          <section key={grupo.chave} aria-label={grupo.rotulo}>
            <h3 className="mb-1 flex items-baseline gap-2 text-12 font-semibold text-texto-suave">
              {grupo.rotulo}
              <span className="font-normal tabular-nums">{grupo.assets.length}</span>
            </h3>
            {linhas}
          </section>
        );
      })}
    </section>
  );
}

interface LinhaProps {
  readonly asset: Asset;
  readonly url: string;
  readonly estado: EstadoDoCartao;
  readonly marcar: (id: string, estado: EstadoDoCartao) => void;
  readonly baixar: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar: (texto: string) => Promise<void>;
  readonly selecionado?: boolean;
  readonly onAlternar?: (id: string) => void;
  readonly onAmpliar?: (asset: Asset) => void;
  readonly escolhida?: boolean;
  readonly onEscolher?: (asset: Asset) => void;
}

/** Memorizada: trocar a seleção de uma linha não redesenha as outras vinte. */
const Linha = memo(function Linha({
  asset,
  url,
  estado,
  marcar,
  baixar,
  copiar,
  selecionado,
  onAlternar,
  onAmpliar,
  escolhida = false,
  onEscolher,
}: LinhaProps) {
  const { acionar, andamento, feito } = useDownload(asset, url, marcar, baixar);
  const { copia, copiarUrl } = useCopia(copiar, url);
  const { nome, tecla } = nomeDaVariante(asset);

  const miniatura = (
    <Imagem
      src={url}
      alt={`Prévia de ${nome}`}
      data-previa={asset.type}
      classeDaCaixa={cn("size-10 rounded-quadro", asset.hasAlpha && "xadrez")}
      className="object-contain"
    />
  );

  return (
    <article
      aria-label={asset.fileName}
      data-tipo={asset.type}
      data-estado={estado}
      data-escolhida={escolhida || undefined}
      className={cn(
        COLUNAS,
        "relative rounded-controle py-2 pr-1 pl-1",
        selecionado && "bg-acento-suave",
        // No telefone, a escolhida tem contorno e peso — nunca só a cor.
        escolhida && "max-md:outline-2 max-md:-outline-offset-2 max-md:outline-acento",
      )}
    >
      {onEscolher && (
        // No telefone, tocar na linha escolhe a variante para a barra do pé. Por
        // baixo da caixa e da miniatura, que continuam respondendo por si.
        <button
          type="button"
          aria-pressed={escolhida}
          aria-label={`Escolher ${nome}`}
          onClick={() => onEscolher(asset)}
          className="absolute inset-0 z-0 cursor-pointer rounded-controle md:hidden"
        />
      )}
      {onAlternar ? (
        <CaixaDeSelecao asset={asset} selecionado={selecionado} onAlternar={onAlternar} className="relative z-10" />
      ) : (
        <span aria-hidden="true" />
      )}

      {onAmpliar ? (
        <button
          type="button"
          onClick={() => onAmpliar(asset)}
          aria-label={`Ampliar ${asset.fileName}`}
          className="relative z-10 block cursor-zoom-in rounded-quadro"
        >
          {miniatura}
        </button>
      ) : (
        miniatura
      )}

      <div className="flex min-w-0 items-baseline gap-2">
        {tecla && (
          <span className="flex-none rounded-quadro border border-linha-forte px-1 text-11 font-semibold tabular-nums text-texto-suave">
            {tecla}
          </span>
        )}
        <h4 title={asset.fileName} className="truncate text-13 font-semibold text-texto">
          {nome}
        </h4>
      </div>

      {/* RF-09: a ficha, antes de qualquer clique. No telefone, uma linha só
          embaixo do nome; no computador, uma coluna por dado. */}
      <p className="col-start-3 flex items-center gap-2 text-12 tabular-nums text-texto-suave md:col-start-auto">
        <GlifoDeProporcao largura={asset.width} altura={asset.height} />
        {asset.width}×{asset.height}
        <span className="md:hidden">{asset.format.toUpperCase()}</span>
        <span className="md:hidden">{formatBytes(asset.bytes)}</span>
      </p>
      <p className="hidden text-12 tabular-nums text-texto-suave md:block">{asset.format.toUpperCase()}</p>
      <p className="hidden text-right text-12 tabular-nums text-texto-suave md:block">{formatBytes(asset.bytes)}</p>

      {/* No telefone as ações moram na barra do pé (T-87); aqui, só no computador. */}
      <div className="hidden items-center justify-end gap-1.5 md:flex">
        <ParDeDownload
          podeConverter={canConvertToPng(asset)}
          ocupado={estado === "baixando"}
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
        <p role="alert" className="col-span-full text-12 text-texto">
          Não deu para baixar: a fonte não respondeu. Tente de novo.
        </p>
      )}
    </article>
  );
});
