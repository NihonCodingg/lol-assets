import { describe, expect, it } from "vitest";

import { BYTE_STABLE_SOURCES, SCHEMA_VERSION, isByteStable } from "./index";

it("expõe a versão do contrato", () => {
  expect(SCHEMA_VERSION).toBeTruthy();
});

describe("quando o sha256 do índice confere o download (ADR 0019)", () => {
  it("o ddragon entrega os bytes que o indexador mediu", () => {
    expect(isByteStable("ddragon")).toBe(true);
  });

  it("o cdragon não: o Cloudflare Polish troca os bytes conforme o cache", () => {
    expect(isByteStable("cdragon")).toBe(false);
  });

  it("fonte cuja entrega ninguém mediu fica de fora", () => {
    expect(isByteStable("riot_static")).toBe(false);
    expect(isByteStable("wiki")).toBe(false);
    expect([...BYTE_STABLE_SOURCES]).toEqual(["ddragon"]);
  });
});
