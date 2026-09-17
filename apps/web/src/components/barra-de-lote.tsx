"use client";

/**
 * A barra do lote: o que está selecionado, quanto vai custar, e o botão (RF-17).
 *
 * Desde o [ADR 0012] este é o **único** caminho de download em lote. Não há zip
 * por categoria para onde mandar quem selecionou 5.042 ícones, e por isso o
 * aviso aqui **informa em vez de redirecionar**: diz o tamanho e o tempo
 * estimado pela taxa medida, e deixa o botão habilitado. Bloquear seria decidir
 * pela pessoa que ela não quer esperar três minutos.
 *
 * O progresso não é enfeite: a categoria `item` leva ~31 s. Sem barra, meio
 * minuto de nada acontecendo é indistinguível de travado, e a aba fecha.
 *
 * **As miniaturas (T-47b)** mostram o que vai no zip sem abrir lista nenhuma: as
 * cinco primeiras e quantas faltam. São decorativas — a contagem já está escrita
 * ao lado, e é ela que o leitor de tela ouve.
 *
 * **No telefone (T-49)** os botões descem para uma linha própria, dividindo a
 * largura: lado a lado com as miniaturas e o resumo, "Baixar 10 como zip" saía
 * cortado da tela.
 */

import { useCallback, useRef, useState } from "react";

import type { Asset } from "@lol-assets/schema";

import { Botao } from "@/components/ui/botao";
import { Imagem } from "@/components/ui/imagem";
import { assetUrl, formatBytes, saveBlob } from "@/lib/asset-file";
import { aviso, duracao, nomeDoZip, resumir } from "@/lib/selecao";
import { montarZip, ZipCanceladoError, type Falha, type Progresso } from "@/lib/zip";

/** Quantas miniaturas a bandeja mostra antes de dizer "+N". */
const MINIATURAS = 5;

export interface BarraDeLoteProps {
  /** Os assets **selecionados**, já resolvidos. */
  readonly assets: readonly Asset[];
  /** Vira o nome do arquivo: "Jax" → `lol-assets-jax.zip`. */
  readonly rotulo?: string;
  readonly assetsBaseUrl?: string;
  readonly onLimpar: () => void;
  /** Injetáveis, como no `PainelDeAsset`: teste sem mock de módulo. */
  readonly montar?: typeof montarZip;
  readonly salvar?: (blob: Blob, nome: string) => void;
}

type Estado =
  | { fase: "parado" }
  | { fase: "montando"; progresso: Progresso }
  | { fase: "pronto"; arquivos: number; falhas: readonly Falha[] }
  | { fase: "erro"; motivo: string };

export function BarraDeLote({
  assets,
  rotulo,
  assetsBaseUrl,
  onLimpar,
  montar = montarZip,
  salvar = saveBlob,
}: BarraDeLoteProps) {
  const [estado, setEstado] = useState<Estado>({ fase: "parado" });
  const cancelamento = useRef<AbortController | null>(null);

  const baixar = useCallback(async () => {
    const controle = new AbortController();
    cancelamento.current = controle;
    setEstado({ fase: "montando", progresso: { feitos: 0, total: assets.length, falhas: 0 } });
    try {
      const resultado = await montar(assets, assetsBaseUrl, {
        sinal: controle.signal,
        onProgresso: (progresso) => setEstado({ fase: "montando", progresso }),
      });
      salvar(resultado.blob, nomeDoZip(rotulo, resultado.arquivos));
      setEstado({ fase: "pronto", arquivos: resultado.arquivos, falhas: resultado.falhas });
    } catch (erro) {
      if (erro instanceof ZipCanceladoError) setEstado({ fase: "parado" });
      else setEstado({ fase: "erro", motivo: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      cancelamento.current = null;
    }
  }, [assets, assetsBaseUrl, montar, rotulo, salvar]);

  if (assets.length === 0) return null;

  const resumo = resumir(assets);
  const montando = estado.fase === "montando";

  return (
    <section
      aria-label="Seleção"
      className="flex flex-none flex-col gap-1.5 border-t border-borda-forte bg-superficie-lote px-3.5 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <ul aria-hidden="true" className="flex flex-none -space-x-2">
          {assets.slice(0, MINIATURAS).map((asset) => (
            <li
              key={asset.id}
              data-miniatura=""
              className="size-8 overflow-hidden rounded-tecla border-2 border-superficie-lote bg-campo"
            >
              <Imagem
                src={assetUrl(asset, assetsBaseUrl)}
                alt=""
                erroCompacto
                classeDaCaixa="size-full"
                className="object-cover"
              />
            </li>
          ))}
          {assets.length > MINIATURAS && (
            <li className="grid size-8 place-items-center rounded-tecla border-2 border-superficie-lote bg-campo-alto font-mono text-10 text-texto-suave">
              +{assets.length - MINIATURAS}
            </li>
          )}
        </ul>
        <p className="min-w-0 flex-1 font-mono text-11 text-texto-suave">
          {resumo.arquivos} {resumo.arquivos === 1 ? "selecionado" : "selecionados"} ·{" "}
          {formatBytes(resumo.bytes)} · ~{duracao(resumo.segundos)}
        </p>
        <div className="ml-auto flex flex-none items-center gap-1.5 max-md:w-full">
          <Botao onClick={onLimpar} disabled={montando} className="max-md:flex-1 max-md:justify-center">
            Limpar seleção
          </Botao>
          <Botao
            variante="primario"
            onClick={() => void baixar()}
            disabled={montando}
            className="max-md:flex-1 max-md:justify-center"
          >
            Baixar {resumo.arquivos} como zip
          </Botao>
        </div>
      </div>

      {/* Critério 3: acima do limite avisa, e o botão continua habilitado. */}
      {resumo.pesada && (
        <p role="alert" className="text-11 leading-cartao text-acento-mais-claro">
          {aviso(resumo)}
        </p>
      )}

      {montando && (
        <div role="status" className="flex items-center gap-2.5">
          <progress
            value={estado.progresso.feitos}
            max={estado.progresso.total}
            className="h-1 flex-1 overflow-hidden rounded-min bg-campo [&::-webkit-progress-bar]:bg-campo [&::-webkit-progress-value]:bg-acento"
          />
          <p className="flex-none font-mono text-11 text-texto-suave">
            {estado.progresso.feitos} de {estado.progresso.total}
          </p>
          <Botao variante="fantasma" tamanho="md" onClick={() => cancelamento.current?.abort()}>
            Cancelar
          </Botao>
        </div>
      )}

      {estado.fase === "pronto" && (
        <p role="status" className="font-mono text-11 text-texto-suave">
          Zip com {estado.arquivos} {estado.arquivos === 1 ? "arquivo" : "arquivos"}.
          {estado.falhas.length > 0 &&
            ` ${estado.falhas.length} não ${estado.falhas.length === 1 ? "veio" : "vieram"} — a lista está no FALHAS.txt dentro do zip.`}
        </p>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className="text-11 text-acento-mais-claro">
          Falhou ao montar o zip: {estado.motivo}
        </p>
      )}
    </section>
  );
}
