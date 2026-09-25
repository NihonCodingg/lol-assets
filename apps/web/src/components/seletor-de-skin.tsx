"use client";

/**
 * A faixa de skins (T-47, redesenhada no T-83): uma fileira de *tiles* que rola
 * de lado, e não uma lista de nomes.
 *
 * Quem procura uma skin procura uma imagem — "a de armadura dourada" —, e o
 * `<select>` de texto obrigava a ler dezoito nomes para achá-la. Aqui cada skin é
 * o *tile* dela, com o nome embaixo.
 *
 * **A escolhida é inequívoca** (§6 do Plano de Design): contorno no destaque,
 * uma marca ✓ no canto e o nome em peso de leitura. A cor nunca diz sozinha.
 *
 * **Rádios de verdade, escondidos.** O grupo é de `<input type="radio">`: as setas
 * trocam de skin, o Tab entra e sai do grupo numa parada só, e o leitor de tela
 * anuncia "Nemesis Jax, rádio, 2 de 18" — de graça.
 */

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

import type { CatalogSkin } from "@lol-assets/schema";

import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import { nomeSemOCampeao } from "@/lib/champion-panel";
import { cn } from "@/lib/utils";

export interface SeletorDeSkinProps {
  /** Nome do grupo de rádios — um por campeão, para as setas não pularem de grupo. */
  readonly nome: string;
  /** O nome do campeão, que sai da frente de cada legenda (T-65). */
  readonly campeao: string;
  readonly skins: readonly CatalogSkin[];
  readonly valor: number;
  readonly onEscolher: (skinNum: number) => void;
  readonly assetsBaseUrl?: string;
}

export function SeletorDeSkin({
  nome,
  campeao,
  skins,
  valor,
  onEscolher,
  assetsBaseUrl,
}: SeletorDeSkinProps) {
  const faixa = useRef<HTMLDivElement>(null);

  // A skin escolhida — pela busca, pelo clique ou pelas setas — entra na parte
  // visível da faixa. Um campeão tem até 60 skins, e a 40ª abre fora da tela.
  useEffect(() => {
    faixa.current
      ?.querySelector<HTMLElement>(`[data-skin="${valor}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [valor]);

  return (
    <div
      ref={faixa}
      role="radiogroup"
      aria-label="Selecionar skin"
      // No telefone, uma faixa que rola de lado; no computador (T-89), todas as
      // skins à vista, em fileiras: nada escondido atrás de uma rolagem lateral.
      className="flex gap-2 overflow-x-auto px-4 pt-4 pb-3 md:flex-wrap md:gap-x-2 md:gap-y-3 md:overflow-visible md:px-6"
    >
      {skins.map((skin) => {
        const marcada = skin.skinNum === valor;
        const tile = thumbnailSrc(skin, assetsBaseUrl);
        return (
          <label
            key={skin.skinId}
            data-skin={skin.skinNum}
            className="group flex w-[76px] flex-none cursor-pointer flex-col gap-1.5"
          >
            <input
              type="radio"
              name={nome}
              value={skin.skinNum}
              checked={marcada}
              onChange={() => onEscolher(skin.skinNum)}
              // O nome inteiro, com o campeão: a legenda encurta, o leitor de
              // tela não precisa — ele não vê o painel em volta.
              aria-label={skin.names.pt_BR}
              className="peer sr-only"
            />
            {/* O anel do foco mora na caixa da arte: o rádio é invisível, e o
                foco precisa aparecer em algum lugar. */}
            <div
              className={cn(
                "relative size-[76px] overflow-hidden rounded-quadro border-2",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento",
                marcada ? "border-acento" : "border-transparent group-hover:border-linha-forte",
              )}
            >
              {tile ? (
                // Baixa prioridade: a prévia grande chega primeiro (T-89).
                <Imagem
                  src={tile}
                  alt=""
                  erroCompacto
                  fetchPriority="low"
                  classeDaCaixa="size-full"
                  className="object-cover"
                />
              ) : (
                <div aria-hidden="true" className="size-full bg-superficie" />
              )}
              {marcada && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-acento text-fundo"
                >
                  <Check strokeWidth={3} className="size-3" />
                </span>
              )}
            </div>
            {/* Em até duas linhas, com o lugar das duas guardado (T-91): numa só,
                "K/DA de Pr…" eram duas skins diferentes com o mesmo rótulo. O nome
                inteiro no `title` (T-58), sem o do campeão na frente (T-65). */}
            <span
              aria-hidden="true"
              title={skin.names.pt_BR}
              className={cn(
                "line-clamp-2 min-h-8 break-words text-12 leading-4",
                marcada ? "font-semibold text-texto" : "text-texto-suave group-hover:text-texto",
              )}
            >
              {nomeSemOCampeao(skin.names.pt_BR, campeao)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
