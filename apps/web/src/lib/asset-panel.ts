/**
 * A ordem em que os tipos aparecem no painel, e por quê.
 *
 * `splash_centered` vem primeiro por ser o maior corte ([ADR 0002]) — é o que a
 * maioria das jornadas da §2 da Spec quer. Depois dele, a ordem desce do maior
 * para o menor e termina nos ícones, que são o que se procura de propósito, não
 * por acaso.
 *
 * Tipo que não está no índice **não aparece**: o painel mostra o que existe, não
 * o que deveria existir (RF-20 morreu com o histórico, mas o princípio fica).
 */
import type { Asset, AssetType } from "@lol-assets/schema";

/**
 * Acima disto o painel vira scroller virtual ([ADR 0011]).
 *
 * O número é a fronteira entre os dois usos do painel: o de um campeão mostra
 * dezenas de cartões e não deve pagar scroller próprio; o de uma categoria
 * mostra 5.042 ícones de perfil e não pode não pagar. 200 fica com folga dos
 * dois lados — o campeão mais carregado do patch tem 18 skins.
 */
export const LIMITE_DE_VIRTUALIZACAO = 200;

export const TYPE_ORDER: readonly AssetType[] = [
  "splash_centered",
  "splash_wide",
  "loading",
  "loading_vintage",
  "tile",
  "chroma",
  "square",
  "passive_icon",
  "ability_icon",
  "item_icon",
  "rune_icon",
  "rune_tree_icon",
  "stat_mod_icon",
  "summoner_spell_icon",
  "profile_icon",
  "emote_icon",
  "ward_icon",
  "map_image",
  "rank_emblem",
];

/**
 * O nome legível de cada tipo, na tela.
 *
 * As palavras vêm do design; **o mapeamento foi corrigido**. O mock entregue em
 * 10/09 rotulava 1280×720 como "corte do cliente" e 1215×717 como "corte
 * centralizado" — o inverso do [ADR 0002], que é medido e reverificado todo dia
 * pelos testes de contrato das fontes. A divergência foi levantada e a decisão
 * foi manter as palavras no tipo certo:
 *
 * | Tipo | Medido | Rótulo |
 * |---|---|---|
 * | `splash_centered` | 1280×720 | Splash — corte centralizado |
 * | `splash_wide` | 1215×717 | Splash — corte do cliente |
 *
 * Tipo sem rótulo cai no próprio nome, que é feio mas honesto — melhor do que
 * sumir da tela porque ninguém lembrou de traduzir.
 */
export const ROTULO_DO_TIPO: Partial<Record<AssetType, string>> = {
  splash_centered: "Splash — corte centralizado",
  splash_wide: "Splash — corte do cliente",
  loading: "Tela de carregamento",
  loading_vintage: "Tela de carregamento — versão antiga",
  tile: "Tile quadrado",
  chroma: "Chroma",
  square: "Ícone do campeão",
  passive_icon: "Ícone da passiva",
  ability_icon: "Ícone de habilidade",
  item_icon: "Ícone do item",
  rune_icon: "Ícone da runa",
  rune_tree_icon: "Ícone da árvore",
  stat_mod_icon: "Ícone de fragmento",
  summoner_spell_icon: "Ícone do feitiço",
  profile_icon: "Ícone de perfil",
  emote_icon: "Emote",
  ward_icon: "Ward skin",
  map_image: "Imagem do mapa",
  rank_emblem: "Emblema de elo",
};

export function rotuloDoTipo(tipo: AssetType): string {
  return ROTULO_DO_TIPO[tipo] ?? tipo;
}

const POSICAO = new Map(TYPE_ORDER.map((tipo, indice) => [tipo, indice]));

/** Tipo desconhecido vai para o fim, em vez de sumir ou quebrar a ordenação. */
function posicaoDe(tipo: AssetType): number {
  return POSICAO.get(tipo) ?? TYPE_ORDER.length;
}

/**
 * Ordena por tipo e, dentro do tipo, por skin — base primeiro.
 *
 * Enquanto o seletor de skin não existe (T-19), o painel de um campeão mostra os
 * assets de todas as skins dele. Agrupar por tipo é o que mantém a promessa do
 * critério: `splash_centered` no topo, e não o square porque o campeão só tem um.
 */
export function orderAssets(assets: readonly Asset[]): Asset[] {
  return [...assets].sort(
    (a, b) =>
      posicaoDe(a.type) - posicaoDe(b.type) ||
      (a.skinNum ?? -1) - (b.skinNum ?? -1) ||
      a.id.localeCompare(b.id),
  );
}

/** Os tipos presentes, na ordem do painel. Nenhum inventado. */
export function availableTypes(assets: readonly Asset[]): AssetType[] {
  return [...new Set(orderAssets(assets).map((asset) => asset.type))];
}

// --- famílias: como o painel do campeão agrupa as artes (T-47b) ------------------------

/**
 * As famílias do painel do campeão, na ordem em que aparecem.
 *
 * Agrupar por **tipo** daria sete cabeçalhos para dez cartões — "Tile quadrado
 * (1)", "Ícone do campeão (1)" —, e cabeçalho que encabeça um cartão só é ruído.
 * A família junta o que se procura junto: a arte grande, os retratos, a passiva
 * e as habilidades, os chromas.
 */
export const FAMILIAS: readonly {
  readonly chave: string;
  readonly rotulo: string;
  readonly tipos: readonly AssetType[];
}[] = [
  {
    chave: "splash",
    rotulo: "Splash e tela de carregamento",
    tipos: ["splash_centered", "splash_wide", "loading", "loading_vintage"],
  },
  { chave: "retrato", rotulo: "Retratos", tipos: ["tile", "square"] },
  { chave: "habilidade", rotulo: "Passiva e habilidades", tipos: ["passive_icon", "ability_icon"] },
  { chave: "chroma", rotulo: "Chromas", tipos: ["chroma"] },
];

export interface GrupoDeArtes {
  readonly chave: string;
  readonly rotulo: string;
  readonly assets: readonly Asset[];
}

const FAMILIA_DO_TIPO = new Map(
  FAMILIAS.flatMap((familia) => familia.tipos.map((tipo) => [tipo, familia] as const)),
);
const ORDEM_DA_FAMILIA = new Map(FAMILIAS.map((familia, indice) => [familia.chave, indice]));

/**
 * Os assets agrupados por família: as famílias na ordem de `FAMILIAS`, e dentro
 * de cada uma a ordem do `orderAssets`. Tipo sem família vira um grupo com o
 * próprio rótulo, no fim — aparece, em vez de sumir. Família sem asset não vira
 * grupo nenhum.
 */
export function agruparPorFamilia(assets: readonly Asset[]): GrupoDeArtes[] {
  const grupos = new Map<string, { chave: string; rotulo: string; assets: Asset[] }>();
  for (const asset of orderAssets(assets)) {
    const familia = FAMILIA_DO_TIPO.get(asset.type);
    const chave = familia?.chave ?? asset.type;
    const grupo = grupos.get(chave) ?? {
      chave,
      rotulo: familia?.rotulo ?? rotuloDoTipo(asset.type),
      assets: [],
    };
    grupo.assets.push(asset);
    grupos.set(chave, grupo);
  }
  const posicao = (chave: string) => ORDEM_DA_FAMILIA.get(chave) ?? FAMILIAS.length;
  return [...grupos.values()].sort((a, b) => posicao(a.chave) - posicao(b.chave));
}

// --- a galeria das categorias (T-48) ----------------------------------------------------

/** O vão entre os tiles da galeria, nas duas direções, em px. */
export const VAO_DA_GALERIA = 12;

/**
 * O que o tile tem embaixo da prévia: o nome (20 px), a ficha em duas linhas
 * (32 px), o respiro em volta (18 px) e a borda (2 px). Somado à prévia, é a
 * altura do tile.
 */
const TEXTO_DO_TILE = 72;

/**
 * A largura que as ações do tile pedem: "Original", "PNG" e o copiar, com o
 * respiro. Tile mais estreito que isto quebra os botões em duas linhas.
 */
const LARGURA_DAS_ACOES = 176;

export interface MedidasDaGaleria {
  /** A largura mínima do tile: é ela que decide quantas colunas cabem. */
  readonly larguraMinima: number;
  readonly alturaDaPrevia: number;
  /** A mesma na lista inteira: é o que deixa virtualizar por linha sem medir ([ADR 0011]). */
  readonly alturaDoTile: number;
}

/**
 * A altura da prévia pelo tamanho típico do arquivo. Ícone de 64 px numa caixa
 * de 136 fica perdido no meio; emote de 256 numa de 96 vira selo.
 */
function alturaDaPrevia(lado: number): number {
  if (lado < 200) return 96; // ícones de 64 px: itens, runas, feitiços
  if (lado < 480) return 136; // 256 a 300 px: emotes, ícones de perfil
  return 232; // arte grande: wards e mapas
}

/**
 * As medidas do tile para uma lista.
 *
 * Pela **mediana**, não pelo maior: um item de 512 px entre 865 de 64 não pode
 * decidir o tamanho dos outros 865. A largura mínima é a que cabe a imagem
 * inteira na proporção dela, com 8 px de cada lado — e nunca menos que as ações.
 */
export function medidasDaGaleria(
  assets: readonly Pick<Asset, "width" | "height">[],
): MedidasDaGaleria {
  const meio = Math.floor(assets.length / 2);
  const lados = assets.map((a) => Math.max(a.width, a.height)).sort((x, y) => x - y);
  const proporcoes = assets.map((a) => a.width / a.height).sort((x, y) => x - y);
  const altura = alturaDaPrevia(lados[meio] ?? 0);
  return {
    larguraMinima: Math.max(LARGURA_DAS_ACOES, Math.ceil(altura * (proporcoes[meio] ?? 1)) + 16),
    alturaDaPrevia: altura,
    alturaDoTile: altura + TEXTO_DO_TILE,
  };
}

/** Abaixo desta largura de lista — um telefone —, o tile encolhe para caberem duas colunas. */
const LISTA_ESTREITA = 480;
const MINIMA_NO_ESTREITO = 160;

/** Quantas colunas cabem na largura da lista; nunca menos que uma. */
export function colunasDaGaleria(largura: number, medidas: MedidasDaGaleria): number {
  const minima =
    largura < LISTA_ESTREITA
      ? Math.min(MINIMA_NO_ESTREITO, medidas.larguraMinima)
      : medidas.larguraMinima;
  return Math.max(1, Math.floor((largura + VAO_DA_GALERIA) / (minima + VAO_DA_GALERIA)));
}
