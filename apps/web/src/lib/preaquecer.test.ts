import { describe, expect, it } from "vitest";

import { devePreaquecer } from "./preaquecer";

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
