/**
 * Contrato do índice de assets, lado TypeScript.
 *
 * O JSON Schema em `schemas/` é a fonte de verdade; os tipos abaixo são
 * escritos à mão por enquanto e passam a ser gerados no ticket da etapa 6.
 */
export const SCHEMA_VERSION = "2.0.0";

export type AssetCategory =
  | "champion"
  | "item"
  | "profile_icon"
  | "rune"
  | "summoner_spell"
  | "emote"
  | "ward"
  | "map"
  | "rank"
  | "misc";

/** Nomes canônicos do ADR 0002 — nunca os nomes das fontes. */
export type AssetType =
  | "square"
  | "splash_centered"
  | "splash_wide"
  | "loading"
  | "loading_vintage"
  | "tile"
  | "chroma"
  | "ability_icon"
  | "passive_icon"
  | "item_icon"
  | "profile_icon"
  | "rune_icon"
  | "rune_tree_icon"
  | "stat_mod_icon"
  | "summoner_spell_icon"
  | "emote_icon"
  | "ward_icon"
  | "map_image"
  | "rank_emblem";

export type AssetSource = "ddragon" | "cdragon" | "riot_static" | "wiki";

/**
 * As fontes que entregam, para a mesma URL, os bytes que o indexador mediu — as
 * únicas em que o `sha256` do índice confere o download (ADR 0019).
 *
 * O cdragon fica de fora por medição: ele passa pelo Cloudflare Polish, e a
 * mesma URL entrega o arquivo de origem ou uma recompressão dele conforme o
 * cache da borda. Fora daqui, o que o índice garante é formato e dimensões.
 * Fonte nova só entra depois de ter a entrega medida.
 */
export const BYTE_STABLE_SOURCES: ReadonlySet<AssetSource> = new Set<AssetSource>(["ddragon"]);

/** Se o `sha256` do índice serve para conferir o que o navegador baixou. */
export function isByteStable(source: AssetSource): boolean {
  return BYTE_STABLE_SOURCES.has(source);
}

export interface LocalizedName {
  pt_BR: string;
  en_US?: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  category: AssetCategory;
  championKey?: number;
  championId?: string;
  skinId?: number;
  skinNum?: number;
  isBaseSkin?: boolean;
  parentSkinNum?: number;
  itemId?: number;
  refId?: string;
  names: LocalizedName;
  aliases?: string[];
  tags?: string[];
  source: AssetSource;
  sourceUrl: string;
  /** Ausente em versões sem assets copiados: use `sourceUrl`. */
  storageKey?: string;
  fileName: string;
  width: number;
  height: number;
  format: "png" | "jpeg";
  /** Quando true, o asset nunca pode ser convertido para JPEG (ADR 0001). */
  hasAlpha: boolean;
  /** O arquivo que o indexador recebeu. No cdragon, o entregue pode ser menor (ADR 0019). */
  bytes: number;
  /** Dos bytes que o indexador recebeu. Confere o download só se `isByteStable(source)`. */
  sha256: string;
}

/**
 * Catálogo — as duas projeções que o front carrega antes de qualquer asset.
 * Navegação opera em `champions` (173); busca opera em `skins` (2.149). Ver ADR 0010.
 */
/** Onde está a fatia de um campeão (ADR 0023, contrato 2.0.0). */
export interface ChampionShardRef {
  url: string;
  assets: number;
  bytes: number;
}

export interface CatalogChampion {
  championKey: number;
  championId: string;
  names: LocalizedName;
  title?: LocalizedName;
  tags?: string[];
  aliases?: string[];
  /** Exibido no cartão da grade. Conta skins, não chromas. */
  skinCount: number;
  chromaCount?: number;
  baseSkinId: number;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  /**
   * A fatia com os assets deste campeão (ADR 0023). Obrigatória no contrato;
   * opcional no tipo para que os testes do front montem campeões sem índice.
   */
  shard?: ChampionShardRef;
}

export interface CatalogSkin {
  skinId: number;
  skinNum: number;
  /** Junção com CatalogChampion — o rótulo do campeão no resultado vem daqui. */
  championKey: number;
  names: LocalizedName;
  isBase: boolean;
  chromaCount?: number;
  thumbnailKey?: string;
  thumbnailUrl?: string;
}

export interface Catalog {
  schemaVersion: string;
  gameVersion: string;
  generatedAt: string;
  assetsBaseUrl?: string;
  champions: CatalogChampion[];
  skins: CatalogSkin[];
}

/** Carregada sob demanda, não na abertura do site (ADR 0010). */
export interface IndexShard {
  schemaVersion: string;
  gameVersion: string;
  category: AssetCategory;
  /** Só nas fatias de campeão (ADR 0023): de quem é a fatia. */
  championKey?: number;
  generatedAt: string;
  assetsBaseUrl?: string;
  assets: Asset[];
}

/** T-38: o que o indexador produziria diferente hoje, mesmo no mesmo patch. */
export interface Generation {
  indexer: number;
  categories: string[];
}

export interface IndexManifest {
  schemaVersion: string;
  generatedAt: string;
  /**
   * Última vez que a indexação automática conferiu que o índice ainda é o do
   * patch atual (ADR 0018). Ausente num manifesto recém-gerado e nos anteriores
   * ao 1.3.0: aí vale o `generatedAt`.
   */
  checkedAt?: string;
  assetsBaseUrl?: string;
  currentVersion: string;
  /** Ausente nos índices gerados antes do T-38. */
  generation?: Generation;
  versions: Array<{
    gameVersion: string;
    indexedAt: string;
    assetsCopied: boolean;
    catalog: {
      url: string;
      champions: number;
      skins: number;
      bytes: number;
      sha256?: string;
    };
    totalAssets?: number;
    totalBytes?: number;
    shards: Array<{
      category: string;
      url: string;
      assets: number;
      bytes: number;
      sha256?: string;
    }>;
    zips?: Array<{
      category: string;
      url: string;
      bytes: number;
      assets?: number;
      sha256?: string;
    }>;
  }>;
}
