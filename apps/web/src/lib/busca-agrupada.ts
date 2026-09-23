/**
 * A busca agrupada por tipo (T-82, §6 do Plano de Design).
 *
 * A busca do topo passou a achar, além de campeão e skin, **item, runa e
 * feitiço**: "Gume do Infinito" e "Eletrocutar" são nomes que a pessoa tem na
 * cabeça, e antes davam zero. Os resultados vêm em grupos — Campeões, Skins,
 * Itens, Runas, Feitiços —, cada um com poucos itens à vista e "ver todos"
 * quando há mais.
 *
 * O ranking de campeão e skin não muda: é o `search()` de sempre ([ADR 0009],
 * [ADR 0010]). Os assets usam a mesma normalização e as mesmas regras (exato,
 * começo, meio), sobre o nome em português e em inglês. Os grupos saem na
 * ordem do melhor resultado de cada um: quem digita "gume" vê Itens em cima.
 *
 * As fatias de item, runa e feitiço só são pedidas quando alguém começa a
 * digitar (ver a paleta): a chegada da home continua sem fatia (RNF-03).
 */

import type { Asset } from "@lol-assets/schema";

import { hitId, normalize, SCORE, type SearchHit } from "@/lib/search";

export interface AssetHit {
  readonly kind: "asset";
  readonly score: number;
  readonly asset: Asset;
}

export type ResultadoDaBusca = SearchHit | AssetHit;

export type ChaveDoGrupo = "champion" | "skin" | "item" | "rune" | "summoner_spell";

export interface GrupoDaBusca {
  readonly chave: ChaveDoGrupo;
  readonly rotulo: string;
  /** A categoria cuja cor de etiqueta marca o grupo. */
  readonly etiqueta: string;
  /** O que aparece — os primeiros, ou todos se o grupo foi aberto. */
  readonly resultados: readonly ResultadoDaBusca[];
  readonly total: number;
}

/** Os tipos de asset que a busca do topo alcança, e o grupo de cada um. */
const GRUPO_DO_TIPO: Readonly<Record<string, ChaveDoGrupo>> = {
  item_icon: "item",
  rune_icon: "rune",
  rune_tree_icon: "rune",
  stat_mod_icon: "rune",
  summoner_spell_icon: "summoner_spell",
};

/** As categorias cujas fatias a busca pede. */
export const CATEGORIAS_DA_BUSCA = ["item", "rune", "summoner_spell"] as const;

const GRUPOS: readonly { chave: ChaveDoGrupo; rotulo: string; etiqueta: string }[] = [
  { chave: "champion", rotulo: "Campeões", etiqueta: "champion" },
  { chave: "skin", rotulo: "Skins", etiqueta: "champion" },
  { chave: "item", rotulo: "Itens", etiqueta: "item" },
  { chave: "rune", rotulo: "Runas", etiqueta: "rune" },
  { chave: "summoner_spell", rotulo: "Feitiços", etiqueta: "summoner_spell" },
];

/** Quantos resultados cada grupo mostra antes do "ver todos". */
export const POR_GRUPO = 4;
/** Aberto, um grupo mostra até isto; acima, pede-se para refinar a busca. */
export const TETO_DO_GRUPO = 60;

interface EntradaDeAsset {
  readonly asset: Asset;
  readonly agulhas: readonly string[];
}

export interface IndiceDeAssets {
  readonly entradas: readonly EntradaDeAsset[];
}

/**
 * Uma entrada por nome, em cada grupo. O "Gume do Infinito" tem três ícones no
 * índice — o da loja e os de outros modos de jogo, com ids como 3031, 223031 e
 * 773031 —, e três linhas iguais na busca eram uma pergunta sem resposta. Fica
 * o de id mais curto, o da loja; escolher abre a galeria filtrada pelo nome, e
 * lá estão os três.
 */
export function indexarAssets(assets: readonly Asset[]): IndiceDeAssets {
  const porNome = new Map<string, EntradaDeAsset>();
  for (const asset of assets) {
    const grupo = GRUPO_DO_TIPO[asset.type];
    if (!grupo) continue;
    const agulhas = [asset.names?.pt_BR, asset.names?.en_US]
      .filter((nome): nome is string => Boolean(nome))
      .map(normalize)
      .filter(Boolean);
    if (agulhas.length === 0) continue;
    const chave = `${grupo}:${agulhas[0]}`;
    const anterior = porNome.get(chave);
    if (!anterior || asset.id.length < anterior.asset.id.length) porNome.set(chave, { asset, agulhas });
  }
  return { entradas: [...porNome.values()] };
}

export function buscarAssets(indice: IndiceDeAssets, consulta: string): AssetHit[] {
  const q = normalize(consulta);
  if (!q) return [];
  const achados: AssetHit[] = [];
  for (const { asset, agulhas } of indice.entradas) {
    let score: number = SCORE.none;
    for (const agulha of agulhas) {
      if (agulha === q) score = Math.max(score, SCORE.exactSkin);
      else if (agulha.startsWith(q)) score = Math.max(score, SCORE.prefix);
      else if (agulha.includes(q)) score = Math.max(score, SCORE.substring);
    }
    if (score > SCORE.none) achados.push({ kind: "asset", score, asset });
  }
  return achados.sort((a, b) => b.score - a.score || nomeDoAsset(a.asset).localeCompare(nomeDoAsset(b.asset)));
}

export function nomeDoAsset(asset: Asset): string {
  return asset.names?.pt_BR ?? asset.names?.en_US ?? asset.fileName;
}

export function grupoDe(resultado: ResultadoDaBusca): ChaveDoGrupo {
  if (resultado.kind === "champion") return "champion";
  if (resultado.kind === "skin") return "skin";
  return GRUPO_DO_TIPO[resultado.asset.type] ?? "item";
}

export function idDoResultado(resultado: ResultadoDaBusca): string {
  return resultado.kind === "asset" ? `asset:${resultado.asset.id}` : hitId(resultado);
}

/**
 * Os grupos, na ordem do melhor resultado de cada um (empate: a ordem fixa,
 * campeão primeiro — é o nível de navegação do [ADR 0010]). Cada grupo mostra
 * `POR_GRUPO`; o `aberto` mostra até `TETO_DO_GRUPO`.
 */
export function agrupar(
  resultados: readonly ResultadoDaBusca[],
  aberto: ChaveDoGrupo | null = null,
): GrupoDaBusca[] {
  const porGrupo = new Map<ChaveDoGrupo, ResultadoDaBusca[]>();
  for (const r of resultados) {
    const chave = grupoDe(r);
    const lista = porGrupo.get(chave);
    if (lista) lista.push(r);
    else porGrupo.set(chave, [r]);
  }
  const melhor = (g: GrupoDaBusca) => porGrupo.get(g.chave)![0].score;
  const ordem = (g: GrupoDaBusca) => GRUPOS.findIndex((fixo) => fixo.chave === g.chave);
  return GRUPOS.flatMap((g) => {
    const todos = porGrupo.get(g.chave);
    if (!todos) return [];
    const limite = g.chave === aberto ? TETO_DO_GRUPO : POR_GRUPO;
    return [{ ...g, resultados: todos.slice(0, limite), total: todos.length }];
  }).sort((a, b) => melhor(b) - melhor(a) || ordem(a) - ordem(b));
}
