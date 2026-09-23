/**
 * A cor de etiqueta de cada categoria, como as *label colors* de um editor de
 * vídeo ([ADR 0024]).
 *
 * As oito têm a mesma luminosidade e só mudam de matiz. Aparecem **só** como
 * marcador pequeno e **sempre** ao lado do nome da categoria: a cor nunca diz
 * nada sozinha, e o marcador é decorativo para o leitor de tela.
 */

import type { AssetCategory } from "@lol-assets/schema";

import { cn } from "@/lib/utils";

/** `champion` é a grade de campeões; categoria nova cai no cinza do texto secundário. */
export const COR_DA_ETIQUETA: Readonly<Record<string, string>> = {
  champion: "bg-etiqueta-campeoes",
  item: "bg-etiqueta-itens",
  rune: "bg-etiqueta-runas",
  summoner_spell: "bg-etiqueta-feiticos",
  profile_icon: "bg-etiqueta-icones",
  emote: "bg-etiqueta-emotes",
  ward: "bg-etiqueta-wards",
  map: "bg-etiqueta-mapas",
};

export function MarcadorDeCategoria({
  categoria,
  className,
}: {
  readonly categoria: AssetCategory | "champion" | string;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-etiqueta={categoria}
      className={cn("inline-block size-2 flex-none rounded-full", COR_DA_ETIQUETA[categoria] ?? "bg-texto-suave", className)}
    />
  );
}
