/**
 * Busca — a parte do produto que decide se ele serve para alguma coisa.
 *
 * O objetivo do RF-01 é acertar **em primeiro lugar**, e a aposta do projeto é
 * que normalização mais uma tabela de apelidos mantida à mão resolve isso melhor
 * que busca difusa ([ADR 0009], [ADR 0011]). Fuse.js está fora por decisão, não
 * por esquecimento.
 *
 * Dois níveis, como manda o [ADR 0010]:
 *
 * - **Campeão casou → uma entrada de campeão.** Buscar "jax" devolve Jax, não as
 *   18 skins dele: as skins moram no painel do campeão. É por isso que as skins
 *   de um campeão que casou são suprimidas do resultado (RF-05).
 * - **Skin casou sem o campeão casar → entrada de skin**, rotulada com o campeão
 *   de origem. É o que faz "K/DA" devolver skins de campeões diferentes (RF-24).
 */
import { championAliases } from "@lol-assets/schema/aliases";
import type { Catalog, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

/** Nada de `\p{Diacritic}`: nem todo runtime que roda vitest tem a propriedade. */
const DIACRITICS = /[̀-ͯ]/g;
const NOT_ALPHANUMERIC = /[^a-z0-9]/g;

/**
 * `Kai'Sa` → `kaisa`, `Cho'Gath` → `chogath`, `Prestígio` → `prestigio`.
 *
 * É a mesma normalização das chaves do arquivo de apelidos. Se as duas
 * divergirem, apelido nenhum resolve — por isso mora numa função só.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NOT_ALPHANUMERIC, "");
}

export const SCORE = {
  /** Apelido é intenção declarada: ganha de tudo. */
  alias: 5,
  exactChampion: 4,
  exactSkin: 3,
  prefix: 2,
  substring: 1,
  none: 0,
} as const;

export interface ChampionHit {
  readonly kind: "champion";
  readonly score: number;
  readonly champion: CatalogChampion;
}

export interface SkinHit {
  readonly kind: "skin";
  readonly score: number;
  readonly skin: CatalogSkin;
  /** Rótulo do campeão de origem — sem ele "Prestígio" não diz de quem é. */
  readonly championName: string;
  readonly championId: string;
}

export type SearchHit = ChampionHit | SkinHit;

interface Entry {
  readonly needles: readonly string[];
  readonly exactScore: number;
}

interface ChampionEntry extends Entry {
  readonly champion: CatalogChampion;
}

interface SkinEntry extends Entry {
  readonly skin: CatalogSkin;
}

export interface SearchIndex {
  readonly champions: readonly ChampionEntry[];
  readonly skins: readonly SkinEntry[];
  /** Apelido normalizado → `championId`. */
  readonly aliases: Readonly<Record<string, string>>;
  /** `championKey` → campeão, para rotular a skin sem varrer a lista. */
  readonly byKey: ReadonlyMap<number, CatalogChampion>;
  readonly size: number;
}

function needlesOf(names: { pt_BR: string; en_US?: string }, ...extras: string[]): string[] {
  const todos = [names.pt_BR, names.en_US ?? "", ...extras].map(normalize).filter(Boolean);
  return [...new Set(todos)];
}

/**
 * Monta o índice uma vez, na carga do catálogo.
 *
 * São 173 campeões e 2.118 skins: normalizar na hora da consulta refaria ~2.300
 * `normalize` a cada tecla digitada.
 */
export function buildSearchIndex(
  catalog: Catalog,
  aliases: Readonly<Record<string, string>> = championAliases,
): SearchIndex {
  return {
    champions: catalog.champions.map((champion) => ({
      champion,
      needles: needlesOf(champion.names, champion.championId, ...(champion.aliases ?? [])),
      exactScore: SCORE.exactChampion,
    })),
    skins: catalog.skins.map((skin) => ({
      skin,
      needles: needlesOf(skin.names),
      exactScore: SCORE.exactSkin,
    })),
    aliases,
    byKey: new Map(catalog.champions.map((c) => [c.championKey, c])),
    size: catalog.champions.length + catalog.skins.length,
  };
}

function scoreOf(entry: Entry, query: string): number {
  let melhor: number = SCORE.none;
  for (const needle of entry.needles) {
    if (needle === query) return entry.exactScore;
    if (needle.startsWith(query)) melhor = Math.max(melhor, SCORE.prefix);
    else if (needle.includes(query)) melhor = Math.max(melhor, SCORE.substring);
  }
  return melhor;
}

/**
 * Resultados ordenados, com as skins do campeão que casou já suprimidas.
 *
 * `limit` existe para o render, não para a busca: a varredura é linear sobre
 * ~2.300 entradas e custa menos de um milissegundo.
 */
export function search(index: SearchIndex, rawQuery: string, limit = 50): SearchHit[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const apelidado = index.aliases[query];
  const campeoes: ChampionHit[] = [];
  const casados = new Set<number>();

  for (const entry of index.champions) {
    const score =
      apelidado !== undefined && entry.champion.championId === apelidado
        ? SCORE.alias
        : scoreOf(entry, query);
    if (score === SCORE.none) continue;
    campeoes.push({ kind: "champion", score, champion: entry.champion });
    casados.add(entry.champion.championKey);
  }

  const skins: SkinHit[] = [];
  for (const entry of index.skins) {
    // RF-05: a skin de um campeão que casou vive no painel dele, não na lista.
    if (casados.has(entry.skin.championKey)) continue;
    const score = scoreOf(entry, query);
    if (score === SCORE.none) continue;
    const dono = index.byKey.get(entry.skin.championKey);
    skins.push({
      kind: "skin",
      score,
      skin: entry.skin,
      championName: dono?.names.pt_BR ?? String(entry.skin.championKey),
      championId: dono?.championId ?? "",
    });
  }

  return [...campeoes, ...skins]
    .sort(
      (a, b) =>
        b.score - a.score ||
        ordemEstavel(a) - ordemEstavel(b) ||
        rotulo(a).localeCompare(rotulo(b)),
    )
    .slice(0, limit);
}

/**
 * Distância de edição entre duas palavras, contando a troca de duas letras
 * vizinhas como um erro só ("yasou" → "yasuo"). Para no `teto`: acima dele, o
 * número exato não interessa, e sair cedo é o que mantém isto barato.
 */
export function distancia(a: string, b: string, teto: number): number {
  if (Math.abs(a.length - b.length) > teto) return teto + 1;
  let anterior2: number[] = [];
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    let menorDaLinha = i;
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(anterior[j]! + 1, atual[j - 1]! + 1, anterior[j - 1]! + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, anterior2[j - 2]! + 1);
      }
      atual.push(d);
      menorDaLinha = Math.min(menorDaLinha, d);
    }
    if (menorDaLinha > teto) return teto + 1;
    anterior2 = anterior;
    anterior = atual;
  }
  return anterior[b.length]!;
}

/**
 * Os campeões parecidos com o que se digitou, para quando a busca não acha
 * **nada** (T-69).
 *
 * Não é busca difusa — o [ADR 0009] continua valendo: o ranking é normalização
 * mais apelidos, e isto não entra nele. É o vazio que ensina: "yasou",
 * "kattarina", "ezrael" são erro de dedo, não apelido, e davam zero resultados.
 * Só nomes, ids e apelidos dos campeões (173, é o nível de navegação do [ADR
 * 0010]); até 1 erro em consulta de até 5 letras, até 2 acima disso. Abaixo de
 * 4 letras, nada: com 3, quase tudo fica a um erro de alguma coisa.
 */
export function parecidos(index: SearchIndex, rawQuery: string, max = 3): ChampionHit[] {
  const query = normalize(rawQuery);
  if (query.length < 4) return [];
  const teto = query.length <= 5 ? 1 : 2;

  const porId = new Map<string, number>();
  for (const [apelido, id] of Object.entries(index.aliases)) {
    const d = distancia(query, apelido, teto);
    if (d <= teto) porId.set(id, Math.min(porId.get(id) ?? d, d));
  }

  const achados: { champion: CatalogChampion; d: number }[] = [];
  for (const entry of index.champions) {
    let d = porId.get(entry.champion.championId) ?? teto + 1;
    for (const needle of entry.needles) d = Math.min(d, distancia(query, needle, teto));
    if (d <= teto) achados.push({ champion: entry.champion, d });
  }

  return achados
    .sort((a, b) => a.d - b.d || a.champion.names.pt_BR.localeCompare(b.champion.names.pt_BR))
    .slice(0, max)
    .map(({ champion }) => ({ kind: "champion", score: SCORE.none, champion }));
}

/** Empate de pontuação favorece campeão: é o nível de navegação (ADR 0010). */
function ordemEstavel(hit: SearchHit): number {
  return hit.kind === "champion" ? 0 : 1;
}

export function rotulo(hit: SearchHit): string {
  return hit.kind === "champion" ? hit.champion.names.pt_BR : hit.skin.names.pt_BR;
}

/** Chave estável para `key` do React e para o `value` do cmdk. */
export function hitId(hit: SearchHit): string {
  return hit.kind === "champion"
    ? `champion:${hit.champion.championKey}`
    : `skin:${hit.skin.skinId}`;
}
