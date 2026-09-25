/**
 * As duas formas de baixar, lado a lado (T-45, [ADR 0001], emendado no T-83).
 *
 * **"Baixar PNG" é a ação primária** desde o Plano de Design (§5, §6): é o que o
 * editor quer na pasta, com transparência preservada e sem pensar em formato.
 * "Original" — os bytes da fonte, sem reencode — é a secundária, sempre à vista
 * ao lado, nunca num menu. Os dois aparecem **antes** do download.
 *
 * Asset que já é PNG tem um botão só: "Baixar PNG" entrega o arquivo original,
 * sem conversão nenhuma (a regra 4 do ADR 0001). Um segundo botão baixaria o
 * mesmo arquivo, e um botão desabilitado dizendo "já é PNG" ao lado do primário
 * era uma pergunta sem resposta. É a emenda do RF-12.
 *
 * **O retorno (T-47b).** O botão do download em andamento troca o ícone por um
 * que gira, e o que acabou de dar certo mostra ✓ por um instante. O **texto** não
 * muda: o nome do botão é o jeito de achá-lo, para gente e para teste.
 *
 * **Compacto (T-48)** e **ícone (T-53)**: no tile estreito o texto encurta ou vira
 * só ícone com dica; o nome acessível continua o inteiro.
 */

import { Check, Download, FileImage, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Botao } from "./botao";
import { BotaoIcone } from "./botao-icone";

export type QualDownload = "original" | "png";

export interface ParDeDownloadProps {
  /** `false` quando a origem já é PNG: um botão só, que entrega o original. */
  readonly podeConverter: boolean;
  /** Um download em andamento trava os dois: clicar de novo baixaria duas vezes. */
  readonly ocupado?: boolean;
  /** O download em andamento: o botão dele ganha o ícone que gira. */
  readonly baixando?: QualDownload | null;
  /** O que acabou de dar certo: o botão dele mostra ✓ por um instante. */
  readonly baixado?: QualDownload | null;
  /** Texto curto, nome inteiro: o par dentro do tile da galeria. */
  readonly compacto?: boolean;
  /** Só os ícones, com dica: o par dentro de um tile estreito. */
  readonly icone?: boolean;
  /** A primária em tom calmo, para listas em que ela se repete (T-89). */
  readonly tonal?: boolean;
  /**
   * Guarda o lugar do "Original" quando o arquivo já é PNG (T-91). Numa lista,
   * sem isto o "Baixar PNG" pulava 70 px de uma linha para a outra — e é o
   * botão que a pessoa aperta em sequência.
   */
  readonly alinhado?: boolean;
  readonly onOriginal: () => void;
  readonly onPng: () => void;
  readonly className?: string;
}

/** O ícone de um dos dois botões, conforme o que está acontecendo com ele. */
function IconeDoBotao({
  qual,
  baixando,
  baixado,
  padrao,
}: {
  qual: QualDownload;
  baixando: QualDownload | null;
  baixado: QualDownload | null;
  padrao?: ReactNode;
}) {
  if (baixando === qual) {
    return <LoaderCircle aria-hidden="true" data-icone="baixando" className="size-3.5 animate-spin" />;
  }
  if (baixado === qual) return <Check aria-hidden="true" data-icone="baixado" className="size-3.5" />;
  return <>{padrao}</>;
}

export function ParDeDownload({
  podeConverter,
  ocupado = false,
  baixando = null,
  baixado = null,
  compacto = false,
  icone = false,
  tonal = false,
  alinhado = false,
  onOriginal,
  onPng,
  className,
}: ParDeDownloadProps) {
  // O PNG de um asset que já é PNG é o próprio original.
  const qualDoPng: QualDownload = podeConverter ? "png" : "original";
  const baixarPng = podeConverter ? onPng : onOriginal;

  if (icone) {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <BotaoIcone
          rotulo="Baixar PNG"
          dicaLeve
          variante="primario"
          disabled={ocupado}
          aria-busy={baixando === qualDoPng || undefined}
          icone={
            <IconeDoBotao
              qual={qualDoPng}
              baixando={baixando}
              baixado={baixado}
              padrao={<Download aria-hidden="true" className="size-3.5" />}
            />
          }
          onClick={baixarPng}
        />
        {podeConverter && (
          <BotaoIcone
            rotulo="Baixar original"
            dicaLeve
            disabled={ocupado}
            aria-busy={baixando === "original" || undefined}
            className="bg-superficie/80"
            icone={
              <IconeDoBotao
                qual="original"
                baixando={baixando}
                baixado={baixado}
                padrao={<FileImage aria-hidden="true" className="size-3.5" />}
              />
            }
            onClick={onOriginal}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", compacto ? "gap-1" : "gap-1.5", className)}>
      <Botao
        variante={tonal ? "tonal" : "primario"}
        tamanho="md"
        disabled={ocupado}
        aria-busy={baixando === qualDoPng || undefined}
        aria-label={compacto ? "Baixar PNG" : undefined}
        className={cn(compacto && "px-2")}
        onClick={baixarPng}
      >
        <IconeDoBotao
          qual={qualDoPng}
          baixando={baixando}
          baixado={baixado}
          padrao={compacto ? undefined : <Download aria-hidden="true" className="size-3.5" />}
        />
        {compacto ? "PNG" : "Baixar PNG"}
      </Botao>
      {podeConverter && (
        <Botao
          tamanho="md"
          disabled={ocupado}
          aria-busy={baixando === "original" || undefined}
          // "Original" à vista; o nome inteiro para quem procura "Baixar original".
          aria-label="Baixar original"
          className={cn(compacto && "bg-superficie/80 px-2")}
          onClick={onOriginal}
        >
          <IconeDoBotao qual="original" baixando={baixando} baixado={baixado} />
          Original
        </Botao>
      )}
      {!podeConverter && alinhado && (
        // Invisível e desabilitado: ocupa o lugar, não recebe foco nem é lido.
        <Botao tamanho="md" disabled tabIndex={-1} aria-hidden="true" className="invisible">
          Original
        </Botao>
      )}
    </div>
  );
}
