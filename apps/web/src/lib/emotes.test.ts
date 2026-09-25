import { describe, expect, it } from "vitest";

import type { Asset } from "@lol-assets/schema";

import { CLASSIFICACAO } from "./emotes-classificacao";
import {
  comEmocao,
  emocaoDe,
  EMOCOES,
  ordemDeLancamento,
  ordenarPorLancamento,
  palpiteDeEmocao,
} from "./emotes";

function emote(refId: string, nome = "Emote", arquivo = `${refId}_inventory.png`): Asset {
  return {
    id: `emote_icon:${refId}`,
    type: "emote_icon",
    category: "emote",
    refId,
    names: { pt_BR: nome },
    source: "cdragon",
    sourceUrl: `https://exemplo.invalido/summoneremotes/${arquivo}`,
    fileName: `Emote_${refId}.png`,
    width: 256,
    height: 256,
    format: "png",
    hasAlpha: true,
    bytes: 1000,
    sha256: "0".repeat(64),
  } as Asset;
}

/**
 * A emoção de cada emote (T-90): a revisão à mão manda; o palpite só cobre o
 * emote que a revisão ainda não viu.
 */
describe("a revisão", () => {
  it("cobre os 2.369 emotes do patch 16.19, cada um num grupo só", () => {
    const todos = EMOCOES.flatMap((emocao) => [...CLASSIFICACAO[emocao]]);
    expect(todos).toHaveLength(2369);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("vale mais que o nome: 'Kiss The Ring' é provocação, não amor", () => {
    expect(emocaoDe(emote("4300", "Kiss The Ring"))).toBe("bravos");
  });

  it("dá a emoção de emotes conhecidos", () => {
    expect(emocaoDe(emote("997", "Cup-Yay!"))).toBe("felizes");
    expect(emocaoDe(emote("3427", "All Love"))).toBe("fofos");
    expect(emocaoDe(emote("3457", "How Dare You!"))).toBe("bravos");
    expect(emocaoDe(emote("3757", "Teary Teadore"))).toBe("tristes");
    expect(emocaoDe(emote("3359", "Worlds 2019 Emote"))).toBe("simbolos");
  });
});

describe("o palpite, para o emote de um patch novo", () => {
  it("evento, ranque e time são símbolos, antes de qualquer emoção", () => {
    expect(palpiteDeEmocao("Worlds 2030 T1 Emote")).toBe("simbolos");
    expect(palpiteDeEmocao("2031 - Split 1 - Challenger")).toBe("simbolos");
  });

  it("lê o nome e o arquivo", () => {
    expect(palpiteDeEmocao("So Many Tears")).toBe("tristes");
    expect(palpiteDeEmocao("Wait, What?")).toBe("tristes");
    expect(palpiteDeEmocao("I'm Fuming")).toBe("bravos");
    expect(palpiteDeEmocao("Poro Hugs")).toBe("fofos");
    expect(emocaoDe(emote("20001", "Watch Out", "20001_em_gwen_angry_inventory.png"))).toBe("bravos");
  });

  it("sem pista nenhuma, felizes — o grupo mais comum", () => {
    expect(palpiteDeEmocao("Let's Dance")).toBe("felizes");
  });
});

describe("comEmocao", () => {
  it("põe a etiqueta da emoção e mantém as outras", () => {
    const [um] = comEmocao([{ ...emote("3457"), tags: ["evento:x"] }]);
    expect(um.tags).toEqual(["evento:x", "emocao:bravos"]);
  });

  it("não duplica a etiqueta ao passar duas vezes", () => {
    const [um] = comEmocao(comEmocao([emote("3457")]));
    expect(um.tags).toEqual(["emocao:bravos"]);
  });
});

describe("a ordem de lançamento", () => {
  it("abaixo de 10.000, o próprio id", () => {
    expect(ordemDeLancamento("5000")).toBe(5000);
  });

  it("a série nova, a partir de 10.001, corre em paralelo: o 10.124 saiu junto do 5.103", () => {
    expect(ordemDeLancamento("10124")).toBeCloseTo(5103);
    expect(ordemDeLancamento("10001")).toBeLessThan(ordemDeLancamento("5000"));
  });

  it("mais recentes primeiro, ou mais antigos primeiro", () => {
    const lista = [emote("997"), emote("10145"), emote("4000"), emote("5200")];
    const ids = (sentido: "recentes" | "antigos") =>
      ordenarPorLancamento(lista, sentido).map((a) => a.refId);
    expect(ids("recentes")).toEqual(["5200", "10145", "4000", "997"]);
    expect(ids("antigos")).toEqual(["997", "4000", "10145", "5200"]);
  });
});
