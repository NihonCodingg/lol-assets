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
 * As palavras são do usuário (Plano de Design, §3): "Splash centralizada",
 * "Square", "Tela de carregamento". O [ADR 0002] é medido e reverificado todo
 * dia pelos testes de contrato das fontes, e o mapeamento segue ele:
 *
 * | Tipo | Medido | Rótulo |
 * |---|---|---|
 * | `splash_centered` | 1280×720 | Splash centralizada |
 * | `splash_wide` | 1215×717 | Splash larga (o corte do cliente) |
 *
 * Sem o travessão de antes ("Splash — corte centralizado"): rótulo montado como
 * "palavra — fragmento" é um dos traços de template que o [ADR 0024] tirou.
 *
 * Tipo sem rótulo cai no próprio nome, que é feio mas honesto — melhor do que
 * sumir da tela porque ninguém lembrou de traduzir.
 */
export const ROTULO_DO_TIPO: Partial<Record<AssetType, string>> = {
  splash_centered: "Splash centralizada",
  splash_wide: "Splash larga",
  loading: "Tela de carregamento",
  loading_vintage: "Tela de carregamento antiga",
  tile: "Tile",
  chroma: "Chroma",
  square: "Square",
  passive_icon: "Passiva",
  ability_icon: "Habilidade",
  item_icon: "Ícone do item",
  rune_icon: "Ícone da runa",
  rune_tree_icon: "Ícone da árvore",
  stat_mod_icon: "Ícone de fragmento",
  summoner_spell_icon: "Ícone do feitiço",
  profile_icon: "Ícone de perfil",
  emote_icon: "Emote",
  ward_icon: "Ward",
  map_image: "Imagem do mapa",
  rank_emblem: "Emblema de elo",
};

export function rotuloDoTipo(tipo: AssetType): string {
  return ROTULO_DO_TIPO[tipo] ?? tipo;
}

/**
 * O nome de uma variante no painel do campeão (T-83): o tipo, nas palavras do
 * usuário; e, para passiva e habilidade, o nome dela com a tecla — "Q", "W", "E",
 * "R" ou "P" —, que é como quem joga as reconhece. Chroma leva o nome dela.
 */
export function nomeDaVariante(
  asset: Pick<Asset, "id" | "type" | "names">,
): { readonly nome: string; readonly tecla?: string } {
  if (asset.type === "ability_icon" || asset.type === "passive_icon") {
    const tecla = /\.([A-Z])$/.exec(asset.id)?.[1];
    return { nome: asset.names.pt_BR, tecla: asset.type === "passive_icon" ? "P" : tecla };
  }
  if (asset.type === "chroma") return { nome: asset.names.pt_BR };
  return { nome: rotuloDoTipo(asset.type) };
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
      ordemDaTecla(a.id) - ordemDaTecla(b.id) ||
      a.id.localeCompare(b.id),
  );
}

/** As habilidades na ordem do teclado de quem joga — Q, W, E, R —, e não do alfabeto (T-83). */
const TECLAS = ["Q", "W", "E", "R"];
function ordemDaTecla(id: string): number {
  const tecla = /\.([QWER])$/.exec(id)?.[1];
  return tecla ? TECLAS.indexOf(tecla) : -1;
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

/**
 * O vão entre os tiles da galeria, nas duas direções, em px.
 *
 * Eram 12 até o T-53. Painel de mídia — Bridge, Eagle, o painel de assets do
 * Figma — aperta o vão justamente para a arte encostar na arte: o que separa
 * dois assets é a imagem mudar, não a calha entre eles.
 */
export const VAO_DA_GALERIA = 8;

/**
 * O que o tile tem embaixo da prévia: o nome numa linha (18 px) e o respiro em
 * volta com a borda (22 px). Somado à prévia, é a altura do tile.
 *
 * Eram 72 px até o T-53, com a ficha em duas linhas fixas embaixo do nome. A
 * ficha passou para a faixa que aparece sobre a arte junto das ações — continua
 * antes de qualquer download (RF-09, [ADR 0001]) e devolve 32 px por tile.
 */
const TEXTO_DO_TILE = 40;

/**
 * A largura que as ações pedem quando têm rótulo: "Original", "PNG" e o copiar,
 * com o respiro. Tile mais estreito que isto quebraria os botões em duas linhas
 * — abaixo dele as ações viram ícones com dica (`acoesComRotulo`).
 */
const LARGURA_DAS_ACOES_COM_ROTULO = 176;

/**
 * A largura que as ações pedem como ícones: três alvos de 28 px, o vão entre
 * eles e o respiro da faixa.
 */
const LARGURA_DAS_ACOES_EM_ICONE = 104;

/**
 * Onde a arte deixa de mandar na largura do tile.
 *
 * Acima disto o tile acompanha a proporção da imagem; abaixo, seria o cromo
 * decidindo o tamanho da arte — que é o que o T-53 veio desfazer.
 */
export const LARGURA_COM_ROTULO = LARGURA_DAS_ACOES_COM_ROTULO;

export interface MedidasDaGaleria {
  /** A largura mínima do tile: é ela que decide quantas colunas cabem. */
  readonly larguraMinima: number;
  /** Se as ações cabem com rótulo escrito, ou se viram ícones com dica. */
  readonly acoesComRotulo: boolean;
  /** Largura ÷ altura mediana da lista: a forma que a prévia tenta ter. */
  readonly proporcao: number;
  /** O teto da prévia para esta categoria, antes de caber na coluna. */
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
  const proporcao = proporcoes[meio] ?? 1;
  const pelaArte = Math.ceil(altura * proporcao) + 16;
  const larguraMinima = Math.max(LARGURA_DAS_ACOES_EM_ICONE, pelaArte);
  return {
    larguraMinima,
    acoesComRotulo: larguraMinima >= LARGURA_DAS_ACOES_COM_ROTULO,
    proporcao,
    alturaDaPrevia: altura,
    alturaDoTile: altura + TEXTO_DO_TILE,
  };
}

/** Abaixo desta largura de lista — um telefone —, o tile encolhe para caberem mais colunas. */
const LISTA_ESTREITA = 480;
const MINIMA_NO_ESTREITO = 112;

/** Quantas colunas cabem na largura da lista; nunca menos que uma. */
export function colunasDaGaleria(largura: number, medidas: MedidasDaGaleria): number {
  const minima =
    largura < LISTA_ESTREITA
      ? Math.min(MINIMA_NO_ESTREITO, medidas.larguraMinima)
      : medidas.larguraMinima;
  return Math.max(1, Math.floor((largura + VAO_DA_GALERIA) / (minima + VAO_DA_GALERIA)));
}

/**
 * A altura da linha depois que as colunas estão decididas (T-53).
 *
 * O teto por categoria (`alturaDaPrevia`) diz o quanto a arte **pode** ocupar;
 * quem manda de fato é a coluna. Sem isto, uma ward de 460×550 num telefone
 * ficava numa caixa de 232 px de altura mostrando 134 px de arte — 98 px de
 * vazio por tile, multiplicados por 532 wards.
 *
 * A altura continua **uma só para a lista inteira**, que é o que o [ADR 0011]
 * pede para virtualizar por linha sem medir cada tile.
 */
export function medidasNaColuna(
  medidas: MedidasDaGaleria,
  larguraDaColuna: number,
): { readonly alturaDaPrevia: number; readonly alturaDoTile: number } {
  const cabeNaColuna = Math.round(larguraDaColuna / (medidas.proporcao || 1));
  const altura = Math.max(64, Math.min(medidas.alturaDaPrevia, cabeNaColuna));
  return { alturaDaPrevia: altura, alturaDoTile: altura + TEXTO_DO_TILE };
}

/** A largura de cada coluna, já descontados os vãos. */
export function larguraDaColuna(largura: number, colunas: number): number {
  return Math.floor((largura - (colunas - 1) * VAO_DA_GALERIA) / colunas);
}

// --- nomes que se repetem na mesma lista (T-56) ------------------------------------------

/**
 * O sufixo do arquivo que explica a variante, quando existe um conhecido.
 *
 * As wards são o caso grande: 532 arquivos, **todos** em pares — a arte e a
 * sombra dela, com o mesmo nome. Na tela, metade dos tiles parecia vazia e
 * repetida. Os feitiços têm o par Jade, do modo Arena.
 */
const VARIANTES: ReadonlyArray<readonly [RegExp, string]> = [
  [/-shadow$/i, "sombra"],
  [/_jade$/i, "Jade"],
];

function variante(fileName: string): string | undefined {
  const semExtensao = fileName.replace(/\.[^.]+$/, "");
  for (const [padrao, rotulo] of VARIANTES) {
    if (padrao.test(semExtensao)) return rotulo;
  }
  return undefined;
}

/**
 * Os rótulos de uma lista, com o que **diferencia** os nomes que se repetem.
 *
 * Medido no índice do patch 16.18.1: 532 wards em 266 pares de nome igual, 532
 * itens em 213 nomes repetidos (o `1004` do Rift e o `771004` do ARAM), 23
 * feitiços e 30 emotes. Dois tiles com o mesmo nome e artes diferentes é o
 * produto parecendo quebrado sem estar.
 *
 * Só quem repete ganha sufixo — acrescentar "· 1004" em tudo seria ruído em
 * 26.781 assets que não precisam. O sufixo é a variante conhecida (sombra,
 * Jade) ou, na falta dela, o `refId`, que é o número que aparece no nome do
 * arquivo que a pessoa vai salvar.
 */
export function rotulosDaLista(
  assets: readonly Pick<Asset, "id" | "type" | "refId" | "fileName" | "names">[],
): ReadonlyMap<string, string> {
  // Por tipo, e não pelo nome solto: no painel do campeão **todos** os assets se
  // chamam "Jax", e quem os separa é o tipo — "Splash", "Tile quadrado", "Ícone
  // do campeão". Marcar os dez seria ruído. Os pares que confundem de verdade
  // são os do mesmo tipo: duas wards, dois itens, dois emotes.
  const chaveDe = (asset: Pick<Asset, "type" | "names">) => `${asset.type}::${asset.names.pt_BR}`;
  const quantos = new Map<string, number>();
  for (const asset of assets) {
    quantos.set(chaveDe(asset), (quantos.get(chaveDe(asset)) ?? 0) + 1);
  }
  const rotulos = new Map<string, string>();
  for (const asset of assets) {
    const nome = asset.names.pt_BR;
    if ((quantos.get(chaveDe(asset)) ?? 0) < 2) continue;
    const sufixo =
      variante(asset.fileName) ?? asset.refId ?? asset.fileName.replace(/\.[^.]+$/, "");
    rotulos.set(asset.id, `${nome} · ${sufixo}`);
  }
  return rotulos;
}
