"use client";

/**
 * A prévia da skin escolhida, 16:9, no topo do painel (T-47, redesenhada no T-83).
 *
 * É o quadro do [ADR 0024]: marcas de corte nos cantos, do lado de fora, sobre a
 * superfície do painel; e, a um clique, a **guia de área segura 16:9** — as
 * margens de 5% (ação) e 10% (título) que o editor usa para saber se o rosto do
 * campeão sobrevive a uma thumbnail (a tarefa T8 do Plano de Design).
 *
 * **Duas camadas.** Embaixo, o *tile* da skin, desfocado: ele vem do catálogo e
 * existe desde o primeiro quadro, antes de a fatia de assets chegar. Por cima, a
 * splash centralizada, que entra quando carrega. Se a splash falhar, o *tile*
 * continua ali — a prévia nunca fica preta.
 *
 * O nome saiu de cima da arte (T-83): ele está no cabeçalho do painel, e a arte
 * fica inteira à vista.
 *
 * Arrastar a splash entrega o arquivo em resolução total (`DownloadURL`, Chrome
 * e Edge), como o tile da grade.
 */

import { Frame } from "lucide-react";
import { useEffect, useState } from "react";

import { MarcasDeCorte } from "@/components/ui/quadro";
import { arrastarArquivo } from "@/lib/download-rapido";
import { cn } from "@/lib/utils";

export interface VitrineDaSkinProps {
  /** O nome da skin: é o `alt` da splash. */
  readonly titulo: string;
  /** A splash centralizada da skin, quando a fatia já chegou. */
  readonly splash?: string;
  /** O arquivo da splash, para o arrasto levar o nome certo. */
  readonly arquivo?: { readonly nome: string; readonly formato: string };
  /** O *tile* 380×380 do catálogo: a prévia enquanto a splash não chega. */
  readonly tile?: string;
}

export function VitrineDaSkin({ titulo, splash, arquivo, tile }: VitrineDaSkinProps) {
  const [pronta, setPronta] = useState(false);
  const [guia, setGuia] = useState(false);
  // Trocar de skin troca a splash: a nova entra do zero, sobre o tile dela.
  useEffect(() => setPronta(false), [splash]);

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-6">
      {/* Até 42% da altura da tela, para sobrar ao menos uma fileira de variantes
          à vista (T-58); a largura acompanha, sempre em 16:9. */}
      <div className="relative mx-auto aspect-video w-full max-w-[calc(42vh*16/9)] md:max-w-none">
        <MarcasDeCorte lado="fora" />
        <div className="relative size-full overflow-hidden rounded-quadro bg-superficie">
          {tile && (
            // eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012)
            <img
              src={tile}
              alt=""
              aria-hidden="true"
              data-vitrine="tile"
              draggable={false}
              className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
            />
          )}
          {splash && (
            // eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012)
            <img
              key={splash}
              src={splash}
              // A splash é o conteúdo, não enfeite: é a arte que o editor veio buscar.
              alt={`Splash de ${titulo}`}
              data-vitrine="splash"
              // A prévia é o que a pessoa veio ver: primeiro da fila (T-89).
              fetchPriority="high"
              onLoad={() => setPronta(true)}
              onDragStart={(evento) => {
                if (arquivo) arrastarArquivo(evento, splash, arquivo.nome, arquivo.formato);
              }}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-200 ease-saida",
                pronta ? "opacity-100" : "opacity-0",
              )}
            />
          )}
          {guia && (
            <div
              aria-hidden="true"
              data-area-segura=""
              className="pointer-events-none absolute inset-0 mix-blend-difference"
            >
              <div className="absolute inset-[5%] border border-dashed border-texto" />
              <div className="absolute inset-[10%] border border-dashed border-texto" />
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[calc(42vh*16/9)] justify-end md:max-w-none">
        <button
          type="button"
          aria-pressed={guia}
          onClick={() => setGuia((ligada) => !ligada)}
          className={cn(
            "inline-flex h-controle-sm cursor-pointer items-center gap-1.5 rounded-controle border px-2 text-13",
            guia
              ? "border-acento bg-acento-suave text-texto"
              : "border-linha-forte text-texto-suave hover:text-texto",
          )}
        >
          <Frame aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Área segura 16:9
        </button>
      </div>
    </div>
  );
}
