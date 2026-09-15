/**
 * As duas formas de baixar, lado a lado (T-45, [ADR 0001]).
 *
 * O ADR é explícito sobre a ordem e o peso: "o botão primário é o original, o
 * PNG é secundário", e os dois aparecem **antes** do download. Por isso é um par
 * visível e não um menu — esconder o PNG atrás de uma seta seria um clique a
 * mais no orçamento do RF-15 e uma opção que ninguém descobre.
 *
 * Asset que já é PNG não oferece conversão, e o botão **fica** — desabilitado,
 * dizendo "já é PNG" (RF-12). Um botão que some deixa a pessoa procurando.
 */

import { Download } from "lucide-react";

import { cn } from "@/lib/utils";

import { Botao } from "./botao";

export interface ParDeDownloadProps {
  /** `false` quando a origem já é PNG. */
  readonly podeConverter: boolean;
  /** Um download em andamento trava os dois: clicar de novo baixaria duas vezes. */
  readonly ocupado?: boolean;
  readonly onOriginal: () => void;
  readonly onPng: () => void;
  readonly className?: string;
}

export function ParDeDownload({
  podeConverter,
  ocupado = false,
  onOriginal,
  onPng,
  className,
}: ParDeDownloadProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Botao variante="primario" tamanho="md" disabled={ocupado} onClick={onOriginal}>
        <Download aria-hidden="true" className="size-3.5" />
        Baixar original
      </Botao>
      <Botao tamanho="md" disabled={ocupado || !podeConverter} onClick={onPng}>
        {podeConverter ? "Baixar PNG" : "já é PNG"}
      </Botao>
    </div>
  );
}
