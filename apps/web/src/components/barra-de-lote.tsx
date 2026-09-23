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
 * **O resumo (T-86)**: quantidade em destaque, peso estimado e tempo, sem ponto
 * médio; e o zip pronto avisa no canto com o nome real do arquivo.
 *
 * **No telefone (T-49)** os botões descem para uma linha própria, dividindo a
 * largura: lado a lado com as miniaturas e o resumo, "Baixar 10 como zip" saía
 * cortado da tela.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { Asset } from "@lol-assets/schema";

import { Botao } from "@/components/ui/botao";
import { confirmar } from "@/components/ui/confirmacoes";
import { Imagem } from "@/components/ui/imagem";
import { assetUrl, formatBytes, saveBlob } from "@/lib/asset-file";
import { aviso, duracao, nomeDoZip, resumir } from "@/lib/selecao";
import { montarZip, ZipCanceladoError, type Falha, type Progresso } from "@/lib/zip";

/** Quantas miniaturas a bandeja mostra antes de dizer "+N". */
const MINIATURAS = 5;

/**
 * O que o leitor de tela ouve enquanto o zip monta (T-68): o começo e cada
 * quarto do caminho. Antes a região viva era a linha inteira do progresso — com
 * o botão dentro —, e cada arquivo virava um anúncio: "3 de 10 Cancelar", "4 de
 * 10 Cancelar"… Com 5.042 ícones, cinco mil anúncios. O texto depende só do
 * quarto em que se está, e por isso só muda quatro vezes.
 */
export function anuncioDoProgresso(feitos: number, total: number): string {
  const quarto = total > 0 ? Math.floor((feitos / total) * 4) : 0;
  if (quarto <= 0) return `Montando o zip com ${total} ${total === 1 ? "arquivo" : "arquivos"}.`;
  if (quarto === 1) return "Um quarto do zip pronto.";
  if (quarto === 2) return "Metade do zip pronta.";
  if (quarto === 3) return "Três quartos do zip prontos.";
  return "Zip quase pronto.";
}

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
  const botaoDoZip = useRef<HTMLButtonElement>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);
  /**
   * O foco acompanha o zip (T-68). O botão que se apertou fica desabilitado
   * enquanto monta, e o navegador joga o foco de um botão desabilitado no
   * `body`: quem usa teclado perdia o lugar e voltava ao topo da página. Agora o
   * foco vai para o Cancelar, que é a única coisa a fazer enquanto monta, e
   * volta para o botão do zip quando acaba — só se estava na bandeja.
   */
  const focoNaBandeja = useRef(false);
  const montandoAgora = estado.fase === "montando";
  useEffect(() => {
    if (!focoNaBandeja.current) return;
    if (montandoAgora) botaoCancelar.current?.focus();
    else {
      botaoDoZip.current?.focus();
      focoNaBandeja.current = false;
    }
  }, [montandoAgora]);

  const baixar = useCallback(async () => {
    const controle = new AbortController();
    cancelamento.current = controle;
    const ativo = document.activeElement;
    focoNaBandeja.current = ativo === botaoDoZip.current;
    setEstado({ fase: "montando", progresso: { feitos: 0, total: assets.length, falhas: 0 } });
    try {
      const resultado = await montar(assets, assetsBaseUrl, {
        sinal: controle.signal,
        onProgresso: (progresso) => setEstado({ fase: "montando", progresso }),
      });
      const nome = nomeDoZip(rotulo, resultado.arquivos);
      salvar(resultado.blob, nome);
      confirmar(`Baixado: ${nome}`);
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
      className="flex flex-none flex-col gap-1.5 border-t border-linha-forte bg-superficie-alta px-4 py-2.5 md:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <ul aria-hidden="true" className="flex flex-none -space-x-2">
          {assets.slice(0, MINIATURAS).map((asset) => (
            <li
              key={asset.id}
              data-miniatura=""
              className="size-8 overflow-hidden rounded-controle border-2 border-superficie-alta bg-superficie-alta"
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
            <li className="grid size-8 place-items-center rounded-controle border-2 border-superficie-alta bg-campo tabular-nums text-11 text-texto">
              +{assets.length - MINIATURAS}
            </li>
          )}
        </ul>
        {/* Quantidade, peso estimado e tempo, em colunas de texto, sem o ponto
            médio (ADR 0024). A quantidade vai em destaque: é ela que se confere. */}
        <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 text-12 tabular-nums text-texto-suave">
          <span className="font-semibold text-texto">
            {resumo.arquivos} {resumo.arquivos === 1 ? "selecionado" : "selecionados"}
          </span>
          <span>{formatBytes(resumo.bytes)}</span>
          <span>~{duracao(resumo.segundos)}</span>
        </p>
        <div className="ml-auto flex flex-none items-center gap-1.5 max-md:w-full">
          <Botao onClick={onLimpar} disabled={montando} className="max-md:flex-1 max-md:justify-center">
            Limpar seleção
          </Botao>
          <Botao
            ref={botaoDoZip}
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
        <p role="alert" className="text-11 leading-cartao text-acento">
          {aviso(resumo)}
        </p>
      )}

      {montando && (
        <p role="status" className="sr-only">
          {anuncioDoProgresso(estado.progresso.feitos, estado.progresso.total)}
        </p>
      )}
      {montando && (
        <div className="flex items-center gap-2.5">
          <progress
            value={estado.progresso.feitos}
            max={estado.progresso.total}
            className="h-1 flex-1 overflow-hidden rounded-quadro bg-superficie-alta [&::-webkit-progress-bar]:bg-superficie-alta [&::-webkit-progress-value]:bg-acento"
          />
          <p className="flex-none tabular-nums text-11 text-texto-suave">
            {estado.progresso.feitos} de {estado.progresso.total}
          </p>
          <Botao
            ref={botaoCancelar}
            variante="fantasma"
            tamanho="md"
            onClick={() => cancelamento.current?.abort()}
          >
            Cancelar
          </Botao>
        </div>
      )}

      {estado.fase === "pronto" && (
        <p role="status" className="text-11 text-texto-suave">
          Zip com {estado.arquivos} {estado.arquivos === 1 ? "arquivo" : "arquivos"}.
          {estado.falhas.length > 0 &&
            ` ${estado.falhas.length} não ${estado.falhas.length === 1 ? "veio" : "vieram"} — a lista está no FALHAS.txt dentro do zip.`}
        </p>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className="text-11 text-acento">
          Não deu para montar o zip ({estado.motivo}). Tente de novo.
        </p>
      )}
    </section>
  );
}
