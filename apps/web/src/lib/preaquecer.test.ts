import { afterEach, describe, expect, it, vi } from "vitest";

import type { Asset } from "@lol-assets/schema";

import { adiantarSplash, devePreaquecer } from "./preaquecer";

/**
 * O pré-aquecimento da fatia de campeão (T-61) respeita quem pediu para
 * economizar: com `saveData` ou em 2G, a fatia espera o clique, como antes.
 */
describe("devePreaquecer", () => {
  it("sem informação da conexão, adianta — é o caso da maioria dos navegadores", () => {
    expect(devePreaquecer(undefined)).toBe(true);
  });

  it("em conexão boa, adianta", () => {
    expect(devePreaquecer({ effectiveType: "4g" })).toBe(true);
    expect(devePreaquecer({ effectiveType: "3g" })).toBe(true);
  });

  it("com economia de dados ligada, não adianta nada", () => {
    expect(devePreaquecer({ saveData: true, effectiveType: "4g" })).toBe(false);
  });

  it("em 2G, espera o clique", () => {
    expect(devePreaquecer({ effectiveType: "2g" })).toBe(false);
    expect(devePreaquecer({ effectiveType: "slow-2g" })).toBe(false);
  });
});

function splash(skinNum: number, url: string): Asset {
  return {
    id: `splash_centered:${skinNum}`,
    type: "splash_centered",
    category: "champion",
    championKey: 103,
    championId: "Ahri",
    skinNum,
    names: { pt_BR: "Ahri" },
    source: "cdragon",
    sourceUrl: url,
    fileName: `Ahri_${skinNum}.jpg`,
    width: 1280,
    height: 720,
    format: "jpeg",
    hasAlpha: false,
    bytes: 155_000,
    sha256: "0".repeat(64),
  } as Asset;
}

/**
 * A splash que o painel abre vem junto com a fatia adiantada (T-89): o dono
 * achou o painel lento para mostrar as artes, e a prévia é a primeira que ele
 * procura.
 */
describe("adiantarSplash", () => {
  const pedidas: string[] = [];
  vi.stubGlobal(
    "Image",
    class {
      decoding = "";
      set src(url: string) {
        pedidas.push(url);
      }
    },
  );
  afterEach(() => {
    pedidas.length = 0;
  });

  it("pede a splash centralizada da skin que o painel vai abrir, e só ela", () => {
    const fatia = [splash(0, "https://x.invalido/ahri-0.jpg"), splash(1, "https://x.invalido/ahri-1.jpg")];
    expect(adiantarSplash(fatia, 0)).toBe("https://x.invalido/ahri-0.jpg");
    expect(pedidas).toEqual(["https://x.invalido/ahri-0.jpg"]);
  });

  it("não pede duas vezes a mesma: parar no cartão de novo não baixa de novo", () => {
    const fatia = [splash(2, "https://x.invalido/ahri-2.jpg")];
    adiantarSplash(fatia, 2);
    adiantarSplash(fatia, 2);
    expect(pedidas).toEqual(["https://x.invalido/ahri-2.jpg"]);
  });

  it("sem a splash na fatia, não pede nada", () => {
    expect(adiantarSplash([splash(0, "https://x.invalido/a.jpg")], 9)).toBeUndefined();
    expect(pedidas).toEqual([]);
  });
});
