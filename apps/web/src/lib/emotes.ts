/**
 * Os emotes por emoção, e na ordem em que saíram (T-90).
 *
 * O dono edita vídeo e procura "um emote bravo" ou "um fofo" para um momento do
 * vídeo, não um nome. A emoção de cada emote vem da revisão à mão em
 * `emotes-classificacao.ts`; emote de patch novo, que ainda não passou pela
 * revisão, ganha um palpite pelo nome e pelo arquivo.
 *
 * A emoção entra no asset como etiqueta derivada, `emocao:<grupo>`, e daí em
 * diante é um filtro como os outros (`lib/categorias.ts`): conta, filtra e se
 * descreve no estado vazio sem código próprio. Este módulo só é importado pela
 * navegação por categoria, que chega depois da home: a tabela de 2.369 números
 * não pesa na chegada.
 */
import type { Asset } from "@lol-assets/schema";

import { CLASSIFICACAO } from "@/lib/emotes-classificacao";

export type Emocao = keyof typeof CLASSIFICACAO;

/** Os grupos na ordem da tela: as quatro emoções que o dono nomeou, e os símbolos no fim. */
export const EMOCOES: readonly Emocao[] = ["felizes", "fofos", "bravos", "tristes", "simbolos"];

/** O prefixo da etiqueta derivada. `lib/categorias.ts` tem os rótulos. */
export const GRUPO_DA_EMOCAO = "emocao";

let porId: Map<number, Emocao> | null = null;
function emocaoRevista(refId: number): Emocao | undefined {
  if (!porId) {
    porId = new Map();
    for (const emocao of EMOCOES) for (const id of CLASSIFICACAO[emocao]) porId.set(id, emocao);
  }
  return porId.get(refId);
}

/**
 * O palpite para um emote que a revisão ainda não viu, pelas palavras do nome e
 * do arquivo (`..._happy_smiling_inventory.png`). A ordem das perguntas importa:
 * evento e ranque primeiro ("Worlds 2030 T1 Emote" não é emoção), depois as
 * emoções mais marcadas. Sem pista nenhuma, "felizes": é o grupo mais comum.
 */
const PISTAS: readonly (readonly [Emocao, RegExp])[] = [
  [
    "simbolos",
    /\b(worlds|msi|split|season|tier|stage|iron|bronze|silver|gold|platinum|emerald|diamond|master|masters|grandmaster|challenger|esports|gaming|team|logo|crest|emblem|insignia|lck|lpl|lec|lcs|pcs|vcs|cblol|lla|ljl|lta|open|competitor|champions?|pride|anniversary|double up|hyper roll)\b/,
  ],
  [
    "tristes",
    /\b(sad|cry|crying|cries|tears?|teary|sob|sorry|shock|shocked|shook|surprised?|gasp|confused|dizzy|oops|whoops|huh|what|scared|afraid|help|sigh|stressed|facepalm|ugh+)\b|\?/,
  ],
  [
    "bravos",
    /\b(angry|anger|mad|rage|fury|furious|fuming|grr+|threat|taunt|mock|smug|evil|kill|crush|fight|challenge|dare|disapproves?|annoyed|tilted?|hmph|bleh|shush|shh+|silence|stare|glare|nope|no|toxic|revenge)\b/,
  ],
  [
    "fofos",
    /\b(love|loves|heart|hearts|cute|kiss|hugs?|uwu|owo|aww+|sweet|blush|adorable|cozy|smol|baby|pw\w+|friend|poro|kitty|cat|bunny|puppy)\b/,
  ],
];

export function palpiteDeEmocao(texto: string): Emocao {
  const palavras = texto.toLowerCase().replace(/[_\-.]+/g, " ");
  for (const [emocao, pista] of PISTAS) if (pista.test(palavras)) return emocao;
  return "felizes";
}

export function emocaoDe(asset: Pick<Asset, "refId" | "names" | "sourceUrl">): Emocao {
  const revista = asset.refId ? emocaoRevista(Number(asset.refId)) : undefined;
  if (revista) return revista;
  const arquivo = asset.sourceUrl.slice(asset.sourceUrl.lastIndexOf("/") + 1).replace(/\.\w+$/, "");
  return palpiteDeEmocao(`${asset.names.pt_BR} ${asset.names.en_US ?? ""} ${arquivo}`);
}

/** Os emotes com a etiqueta `emocao:<grupo>`, para o filtro. O resto do asset não muda. */
export function comEmocao(assets: readonly Asset[]): Asset[] {
  return assets.map((asset) => ({
    ...asset,
    tags: [
      ...(asset.tags ?? []).filter((tag) => !tag.startsWith(`${GRUPO_DA_EMOCAO}:`)),
      `${GRUPO_DA_EMOCAO}:${emocaoDe(asset)}`,
    ],
  }));
}

/**
 * Quando o emote saiu, como um número que cresce com o tempo.
 *
 * O `refId` quase serve: os ids abaixo de 10.000 crescem com os patches. Mas
 * desde 2025 a Riot numera uma segunda série a partir de 10.001, em paralelo à
 * primeira — o 10.124 saiu no mesmo patch que o 5.103. A conversa entre as duas
 * foi calibrada pelos patches escritos nos nomes de arquivo: cada id da série
 * nova vale 2,47 da antiga.
 */
export function ordemDeLancamento(refId: string | undefined): number {
  const id = Number(refId);
  if (!Number.isFinite(id)) return -1;
  return id < 10_000 ? id : 5103 + (id - 10_124) * 2.47;
}

export type Sentido = "recentes" | "antigos";

export function ordenarPorLancamento(assets: readonly Asset[], sentido: Sentido): Asset[] {
  const chave = new Map(assets.map((asset) => [asset, ordemDeLancamento(asset.refId)]));
  const ordem = sentido === "recentes" ? -1 : 1;
  return [...assets].sort(
    (a, b) =>
      ordem * (chave.get(a)! - chave.get(b)!) || ordem * (Number(a.refId) - Number(b.refId)),
  );
}
