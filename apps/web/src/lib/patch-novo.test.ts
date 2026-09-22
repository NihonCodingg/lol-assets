import { afterEach, describe, expect, it, vi } from "vitest";

import {
  URL_DAS_VERSOES,
  VALIDADE_MS,
  buscarVersaoMaisNova,
  dispensar,
  eMaisNova,
  foiDispensado,
  versaoMaisNova,
} from "./patch-novo";

afterEach(() => window.localStorage.clear());

const lista = (...versoes: string[]) => async () => new Response(JSON.stringify(versoes), { status: 200 });

describe("o patch mais novo (T-77)", () => {
  it("é a primeira versão de verdade da lista do ddragon", () => {
    expect(versaoMaisNova(["16.19.1", "16.18.1", "lolpatch_7.20"])).toBe("16.19.1");
    expect(versaoMaisNova(["lolpatch_7.20", "16.18.1"])).toBe("16.18.1");
    expect(versaoMaisNova({ nada: 1 })).toBeUndefined();
  });

  it("compara número a número, e não como texto", () => {
    expect(eMaisNova("16.19.1", "16.18.1")).toBe(true);
    expect(eMaisNova("16.10.1", "16.9.1")).toBe(true);
    expect(eMaisNova("16.18.1", "16.18.1")).toBe(false);
    expect(eMaisNova("16.17.1", "16.18.1")).toBe(false);
  });

  it("pede a lista uma vez a cada 6 horas: é a objeção do ADR 0018", async () => {
    const buscar = vi.fn(lista("16.19.1", "16.18.1"));
    const agora = Date.parse("2026-09-22T12:00:00Z");

    expect(await buscarVersaoMaisNova(buscar, agora)).toBe("16.19.1");
    expect(await buscarVersaoMaisNova(buscar, agora + VALIDADE_MS - 1)).toBe("16.19.1");
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledWith(URL_DAS_VERSOES);

    await buscarVersaoMaisNova(buscar, agora + VALIDADE_MS + 1);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("falha de rede é silêncio, e não guarda nada", async () => {
    const quebrado = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await buscarVersaoMaisNova(quebrado)).toBeUndefined();
    expect(await buscarVersaoMaisNova(async () => new Response("x", { status: 503 }))).toBeUndefined();
    expect(window.localStorage.length).toBe(0);
  });

  it("dispensar vale para aquele patch, e o próximo avisa de novo", () => {
    dispensar("16.19.1");
    expect(foiDispensado("16.19.1")).toBe(true);
    expect(foiDispensado("16.20.1")).toBe(false);
  });
});
