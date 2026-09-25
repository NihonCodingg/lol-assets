/**
 * O tratamento próprio de cada categoria (T-84, §6 do Plano de Design).
 *
 * Uma galeria igual para tudo tratava 5 mapas como 5.042 ícones. Aqui cada
 * categoria diz o que muda na galeria dela:
 *
 * - **Runas** agrupadas por árvore, e sempre sobre o xadrez (têm alfa). O nome
 *   de cada árvore sai da própria fatia: é o nome do ícone dela.
 * - **Feitiços**: 34 ícones — tiles maiores, com o nome inteiro à vista.
 * - **Wards**: a arte e a sombra que ela projeta no chão viram **um** card com
 *   alternância, e não dois tiles com o mesmo nome. Substitui o filtro de
 *   "Imagem" do T-75, que existia para esconder metade da galeria.
 * - **Mapas**: tiles largos.
 * - Itens, ícones de perfil e emotes seguem a galeria densa virtualizada, com o
 *   filtro por texto no topo.
 */

import type { Asset, AssetCategory } from "@lol-assets/schema";

import { grupoDaTag, nomesPorRef, rotuloDaTag } from "@/lib/categorias";

export interface GrupoDaGaleria {
  readonly chave: string;
  readonly rotulo: string;
  readonly assets: readonly Asset[];
}

export interface Tratamento {
  /** A largura mínima do tile, quando a categoria pede tiles maiores que a arte. */
  readonly larguraMinima?: number;
  /** Divide a galeria em seções. */
  readonly agrupar?: (assets: readonly Asset[]) => GrupoDaGaleria[];
  /** O nome em duas linhas, para as categorias de nome longo (T-91). */
  readonly linhasDoNome?: 1 | 2;
}

/** Árvores de runa na ordem do cliente: Precisão, Dominação, Feitiçaria, Determinação, Inspiração. */
const ORDEM_DAS_ARVORES = ["8000", "8100", "8200", "8400", "8300"];

/**
 * As runas por árvore, na ordem do cliente; o que não tem árvore (os
 * fragmentos) vem por último. O ícone da árvore abre a seção dela.
 */
export function porArvore(assets: readonly Asset[]): GrupoDaGaleria[] {
  const nomes = nomesPorRef(assets);
  const grupos = new Map<string, Asset[]>();
  for (const asset of assets) {
    const tag = asset.tags?.find((t) => grupoDaTag(t) === "arvore") ?? "arvore:nenhuma";
    const lista = grupos.get(tag);
    if (lista) lista.push(asset);
    else grupos.set(tag, [asset]);
  }
  const posicao = (tag: string) => {
    const i = ORDEM_DAS_ARVORES.indexOf(tag.slice("arvore:".length));
    return i === -1 ? ORDEM_DAS_ARVORES.length : i;
  };
  return [...grupos]
    .sort(([a], [b]) => posicao(a) - posicao(b) || a.localeCompare(b))
    .map(([tag, lista]) => ({
      chave: tag,
      rotulo: rotuloDaTag(tag, nomes),
      assets: [...lista].sort(
        (a, b) => Number(b.type === "rune_tree_icon") - Number(a.type === "rune_tree_icon"),
      ),
    }));
}

export function tratamentoDe(categoria: AssetCategory): Tratamento {
  switch (categoria) {
    // Nome longo, em português ou em inglês: duas linhas (T-91).
    case "item":
    case "emote":
    case "ward":
      return { linhasDoNome: 2 };
    case "rune":
      return { agrupar: porArvore, linhasDoNome: 2 };
    case "summoner_spell":
      return { larguraMinima: 160 };
    case "map":
      return { larguraMinima: 300 };
    default:
      return {};
  }
}

// --- as wards: arte e sombra num card só ------------------------------------------------

export interface WardsEmPares {
  /** A galeria: uma entrada por ward — a arte, ou a sombra que ficou sem par. */
  readonly lista: readonly Asset[];
  /** A sombra de cada arte, pelo id da arte. */
  readonly sombraDe: ReadonlyMap<string, Asset>;
}

/**
 * Junta cada arte de ward com a sombra dela. O que as liga é o `refId` que o
 * indexador grava: `1` é a arte de `wardhero_1.png`, `1-shadow` a sombra de
 * `wardheroshadow_1.png` (T-75).
 */
export function wardsEmPares(assets: readonly Asset[]): WardsEmPares {
  const sombras = new Map<string, Asset>();
  for (const asset of assets) {
    if (asset.refId?.endsWith("-shadow")) sombras.set(asset.refId.slice(0, -"-shadow".length), asset);
  }
  const usadas = new Set<string>();
  const sombraDe = new Map<string, Asset>();
  const lista: Asset[] = [];
  for (const asset of assets) {
    if (asset.refId?.endsWith("-shadow")) continue;
    const sombra = asset.refId ? sombras.get(asset.refId) : undefined;
    if (sombra) {
      sombraDe.set(asset.id, sombra);
      usadas.add(sombra.id);
    }
    lista.push(asset);
  }
  // Sombra sem arte continua aparecendo: melhor sozinha do que sumida.
  for (const sombra of sombras.values()) if (!usadas.has(sombra.id)) lista.push(sombra);
  return { lista, sombraDe };
}
