/**
 * As duas formas de baixar, lado a lado (T-45, [ADR 0001]).
 *
 * O ADR é explícito sobre a ordem e o peso: "o botão primário é o original, o
 * PNG é secundário", e os dois aparecem **antes** do download. Por isso é um par
 * visível e não um menu — esconder o PNG atrás de uma seta seria um clique a
 * mais no orçamento do RF-15 e uma opção que ninguém descobre.
 *
 * Asset que já é PNG não oferece conversão, e o botão **fica** — desabilitado,
 * dizendo "Já é PNG" (RF-12). Um botão que some deixa a pessoa procurando.
 *
 * **O retorno (T-47b).** O botão do download em andamento troca o ícone por um
 * que gira, e o do que acabou de dar certo mostra ✓ por um instante. O **texto**
 * não muda: o nome do botão é o jeito de achá-lo, para gente e para teste.
 *
 * **Compacto (T-48).** No tile da galeria, "Baixar original" e "Baixar PNG" não
 * cabem lado a lado. O texto encurta para "Original" e "PNG", e o nome
 * acessível continua o inteiro: é por ele que o botão é achado, e o que está
 * escrito continua dentro do nome — quem comanda por voz diz o que vê.
 */

import { Check, Download, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Botao } from "./botao";

export type QualDownload = "original" | "png";

export interface ParDeDownloadProps {
  /** `false` quando a origem já é PNG. */
  readonly podeConverter: boolean;
  /** Um download em andamento trava os dois: clicar de novo baixaria duas vezes. */
  readonly ocupado?: boolean;
  /** O download em andamento: o botão dele ganha o ícone que gira. */
  readonly baixando?: QualDownload | null;
  /** O que acabou de dar certo: o botão dele mostra ✓ por um instante. */
  readonly baixado?: QualDownload | null;
  /** Texto curto, nome inteiro: o par dentro do tile da galeria. */
  readonly compacto?: boolean;
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
  onOriginal,
  onPng,
  className,
}: ParDeDownloadProps) {
  const nomeDoPng = podeConverter ? "Baixar PNG" : "Já é PNG";
  return (
    <div className={cn("inline-flex items-center", compacto ? "gap-1" : "gap-1.5", className)}>
      <Botao
        variante="primario"
        tamanho="md"
        disabled={ocupado}
        aria-busy={baixando === "original" || undefined}
        aria-label={compacto ? "Baixar original" : undefined}
        className={cn(compacto && "px-2")}
        onClick={onOriginal}
      >
        <IconeDoBotao
          qual="original"
          baixando={baixando}
          baixado={baixado}
          padrao={compacto ? undefined : <Download aria-hidden="true" className="size-3.5" />}
        />
        {compacto ? "Original" : "Baixar original"}
      </Botao>
      <Botao
        tamanho="md"
        disabled={ocupado || !podeConverter}
        aria-busy={baixando === "png" || undefined}
        aria-label={compacto ? nomeDoPng : undefined}
        className={cn(compacto && "bg-superficie/80 px-2")}
        onClick={onPng}
      >
        <IconeDoBotao qual="png" baixando={baixando} baixado={baixado} />
        {compacto ? "PNG" : nomeDoPng}
      </Botao>
    </div>
  );
}
