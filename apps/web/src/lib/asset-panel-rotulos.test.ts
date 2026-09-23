import { describe, expect, it } from "vitest";

import type { AssetType } from "@lol-assets/schema";

import { rotulosDaLista } from "./asset-panel";

/**
 * Os nomes que se repetem na mesma lista (T-56).
 *
 * Medido no índice do patch 16.18.1: **todas** as 532 wards vêm em pares de nome
 * igual — a arte e a sombra dela —, e 532 itens repetem nome em 213 pares. Dois
 * tiles com o mesmo nome e artes diferentes é o produto parecendo quebrado sem
 * estar.
 */

const asset = (
  id: string,
  nome: string,
  fileName: string,
  refId?: string,
  type: AssetType = "ward_icon",
) => ({ id, type, refId, fileName, names: { pt_BR: nome } });

describe("rotulosDaLista", () => {
  it("nome que não repete fica como está — sem rótulo nenhum", () => {
    const rotulos = rotulosDaLista([
      asset("a", "Botas", "Item_1001.png", "1001"),
      asset("b", "Adaga", "Item_1042.png", "1042"),
    ]);
    expect(rotulos.size).toBe(0);
  });

  it("a ward e a sombra dela deixam de ter o mesmo nome", () => {
    const rotulos = rotulosDaLista([
      asset("w1", "Default Ward", "Ward_0.png", "0"),
      asset("w2", "Default Ward", "Ward_0-shadow.png", "0"),
    ]);
    expect(rotulos.get("w1")).toBe("Default Ward (0)");
    expect(rotulos.get("w2")).toBe("Default Ward (sombra)");
  });

  it("o feitiço Jade também se separa pelo nome do arquivo", () => {
    const rotulos = rotulosDaLista([
      asset("s1", "Barreira", "Summoner_SummonerBarrier.png", "SummonerBarrier"),
      asset("s2", "Barreira", "Summoner_SummonerBarrier_Jade.png", "SummonerBarrierJade"),
    ]);
    expect(rotulos.get("s2")).toBe("Barreira (Jade)");
  });

  it("sem variante conhecida, o que diferencia é o id — o número do arquivo", () => {
    const rotulos = rotulosDaLista([
      asset("i1", "Amuleto da Fada", "Item_1004.png", "1004"),
      asset("i2", "Amuleto da Fada", "Item_771004.png", "771004"),
    ]);
    expect(rotulos.get("i1")).toBe("Amuleto da Fada (1004)");
    expect(rotulos.get("i2")).toBe("Amuleto da Fada (771004)");
  });

  it("sem id nenhum, sobra o nome do arquivo, que é o que a pessoa vai salvar", () => {
    const rotulos = rotulosDaLista([
      asset("e1", "So Lame", "Emote_3176.png"),
      asset("e2", "So Lame", "Emote_3185.png"),
    ]);
    expect(rotulos.get("e2")).toBe("So Lame (Emote_3185)");
  });

  /**
   * No painel do campeão todos os assets se chamam "Jax": o que os separa é o
   * tipo, que já está escrito no cartão. Marcar os dez seria ruído.
   */
  it("mesmo nome em tipos diferentes não vira rótulo — o tipo já separa", () => {
    const rotulos = rotulosDaLista([
      asset("j1", "Jax", "Jax_square.png", "24", "square"),
      asset("j2", "Jax", "Jax_000_splash_centered.jpg", "24", "splash_centered"),
      asset("j3", "Jax", "Jax_000_tile.jpg", "24", "tile"),
    ]);
    expect(rotulos.size).toBe(0);
  });

  it("lista vazia não quebra", () => {
    expect(rotulosDaLista([]).size).toBe(0);
  });
});
