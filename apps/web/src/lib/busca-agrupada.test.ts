import { describe, expect, it } from "vitest";

import type { Asset, CatalogChampion } from "@lol-assets/schema";

import {
  agrupar,
  buscarAssets,
  idDoResultado,
  indexarAssets,
  POR_GRUPO,
  TETO_DO_GRUPO,
  type ResultadoDaBusca,
} from "./busca-agrupada";
import { SCORE } from "./search";

function asset(id: string, type: string, pt: string, en?: string): Asset {
  return {
    id,
    type,
    category: type.startsWith("item") ? "item" : type.startsWith("summoner") ? "summoner_spell" : "rune",
    names: { pt_BR: pt, ...(en ? { en_US: en } : {}) },
    fileName: `${id}.png`,
    sourceUrl: `https://exemplo/${id}.png`,
    width: 64,
    height: 64,
    format: "png",
    bytes: 1000,
    source: "ddragon",
  } as unknown as Asset;
}

const GUME = asset("item_icon:3031", "item_icon", "Gume do Infinito", "Infinity Edge");
const ELETRO = asset("rune_icon:8112", "rune_icon", "Eletrocutar", "Electrocute");
const FLASH = asset("summoner_spell_icon:SummonerFlash", "summoner_spell_icon", "Flash", "Flash");
const MAPA = asset("map_image:map11", "map_image", "map11");

describe("a busca de itens, runas e feitiços (T-82)", () => {
  const indice = indexarAssets([GUME, ELETRO, FLASH, MAPA, GUME]);

  it("acha pelo nome em português e em inglês, sem acento nem caixa", () => {
    expect(buscarAssets(indice, "gume do infinito").map((h) => h.asset.id)).toEqual([GUME.id]);
    expect(buscarAssets(indice, "infinity edge")[0].asset.id).toBe(GUME.id);
    expect(buscarAssets(indice, "ELETROCUTAR")[0].score).toBe(SCORE.exactSkin);
  });

  it("começo e meio do nome também contam, com peso menor", () => {
    expect(buscarAssets(indice, "gume")[0].score).toBe(SCORE.prefix);
    expect(buscarAssets(indice, "infinito")[0].score).toBe(SCORE.substring);
  });

  it("mapa não entra: o nome dele no índice é um código (map11), não um nome", () => {
    expect(buscarAssets(indice, "map11")).toEqual([]);
  });

  it("o mesmo asset duas vezes na lista entra uma vez só", () => {
    expect(indice.entradas.filter((e) => e.asset.id === GUME.id)).toHaveLength(1);
  });

  it("homônimos do mesmo grupo viram uma linha só: fica o da loja, de id mais curto", () => {
    const arena = asset("item_icon:223031", "item_icon", "Gume do Infinito", "Infinity Edge");
    const achados = buscarAssets(indexarAssets([arena, GUME]), "gume do infinito");
    expect(achados.map((h) => h.asset.id)).toEqual([GUME.id]);
  });
});

describe("os grupos", () => {
  const campeao = (n: number, score: number = SCORE.prefix): ResultadoDaBusca => ({
    kind: "champion",
    score,
    champion: { championKey: n, names: { pt_BR: `C${n}` } } as unknown as CatalogChampion,
  });

  it("cada grupo mostra poucos, e diz quantos tem", () => {
    const grupos = agrupar(Array.from({ length: 9 }, (_, i) => campeao(i)));
    expect(grupos).toHaveLength(1);
    expect(grupos[0].resultados).toHaveLength(POR_GRUPO);
    expect(grupos[0].total).toBe(9);
  });

  it("o grupo aberto mostra todos, até o teto", () => {
    const muitos = Array.from({ length: TETO_DO_GRUPO + 10 }, (_, i) => campeao(i));
    expect(agrupar(muitos, "champion")[0].resultados).toHaveLength(TETO_DO_GRUPO);
  });

  it("o grupo do melhor resultado vem primeiro: 'gume' mostra Itens antes", () => {
    const itemExato: ResultadoDaBusca = { kind: "asset", score: SCORE.exactSkin, asset: GUME };
    const grupos = agrupar([campeao(1, SCORE.substring), itemExato]);
    expect(grupos.map((g) => g.chave)).toEqual(["item", "champion"]);
    expect(grupos[0].rotulo).toBe("Itens");
  });

  it("no empate, campeão vem antes — é o nível de navegação (ADR 0010)", () => {
    const item: ResultadoDaBusca = { kind: "asset", score: SCORE.prefix, asset: GUME };
    expect(agrupar([item, campeao(1)]).map((g) => g.chave)).toEqual(["champion", "item"]);
  });

  it("o id do resultado de asset não colide com campeão nem skin", () => {
    expect(idDoResultado({ kind: "asset", score: 1, asset: GUME })).toBe("asset:item_icon:3031");
  });
});
