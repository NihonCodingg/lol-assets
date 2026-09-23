"use client";

/**
 * O seletor de skin como vitrine (T-47): uma faixa de *tiles*, e não uma lista
 * de nomes.
 *
 * Quem procura uma skin procura uma imagem — "a de armadura dourada" —, e o
 * `<select>` de texto obrigava a ler dezoito nomes para achá-la. Aqui cada skin é
 * o *tile* dela, com o nome embaixo.
 *
 * **Rádios de verdade, escondidos.** O grupo é de `<input type="radio">`: as setas
 * trocam de skin, o Tab entra e sai do grupo numa parada só, e o leitor de tela
 * anuncia "Nemesis Jax, rádio, 2 de 18" — de graça, sem reescrever o que o
 * navegador já sabe fazer.
 */

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
      className="flex gap-2.5 overflow-x-auto px-3.5 pt-3 pb-2"
    >
      {skins.map((skin) => {
        const marcada = skin.skinNum === valor;
        const tile = thumbnailSrc(skin, assetsBaseUrl);
        return (
          <label
            key={skin.skinId}
            data-skin={skin.skinNum}
            className="group flex w-[72px] flex-none cursor-pointer flex-col gap-1.5"
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
                "size-[72px] overflow-hidden rounded-quadro border-2 transition-colors duration-150 ease-saida",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento",
                marcada ? "border-acento" : "border-transparent group-hover:border-linha-forte",
              )}
            >
              {tile ? (
                <Imagem src={tile} alt="" erroCompacto classeDaCaixa="size-full" className="object-cover" />
              ) : (
                <div aria-hidden="true" className="size-full bg-superficie-alta" />
              )}
            </div>
            {/* Numa linha, com o nome inteiro no `title`: em duas, a faixa ficava
                serrilhada — umas com uma linha, outras com duas — e crescia 14 px
                por causa do nome mais comprido (T-58). Sem o nome do campeão na
                frente (T-65): dentro do painel do Jax, o "Jax" de cada legenda
                era o que empurrava o resto para as reticências. */}
            <span
              aria-hidden="true"
              title={skin.names.pt_BR}
              className={cn(
                "truncate text-11 leading-cartao",
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
