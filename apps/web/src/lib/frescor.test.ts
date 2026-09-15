import { describe, expect, it } from "vitest";

import type { IndexManifest } from "@lol-assets/schema";
import { examples } from "@lol-assets/schema/examples";

import { LIMITE_DE_IDADE_HORAS, medirFrescor } from "./frescor";

/**
 * T-51 — o aviso mede a última verificação, não a última mudança ([ADR 0018]).
 *
 * Em 14/09/2026 o site dizia "a indexação automática pode ter parado" com o
 * workflow rodando a cada ~5 h sem falhar: o índice não mudava porque a Riot não
 * tinha lançado patch, e o aviso media justamente a mudança. Os testes do limite
 * em si continuam em `aviso-de-indice-velho.test.tsx`.
 */

const AGORA = new Date("2026-09-14T12:00:00Z");

function horasAtras(horas: number): string {
  return new Date(AGORA.getTime() - horas * 3_600_000).toISOString();
}

function manifesto(geradoHa: number, conferidoHa?: number): IndexManifest {
  return {
    ...examples.manifest,
    generatedAt: horasAtras(geradoHa),
    ...(conferidoHa === undefined ? {} : { checkedAt: horasAtras(conferidoHa) }),
  } as IndexManifest;
}

describe("o aviso mede a última verificação", () => {
  it("índice de 4 dias conferido há 5 horas não avisa — o caso de 14/09/2026", () => {
    expect(medirFrescor(manifesto(96, 5), AGORA).velho).toBe(false);
  });

  it("sem verificação há mais que o limite, avisa", () => {
    expect(medirFrescor(manifesto(200, LIMITE_DE_IDADE_HORAS + 1), AGORA).velho).toBe(true);
  });

  it("com a verificação exatamente no limite, ainda sem aviso", () => {
    expect(medirFrescor(manifesto(200, LIMITE_DE_IDADE_HORAS), AGORA).velho).toBe(false);
  });

  it("manifesto sem carimbo cai no generatedAt, como antes do contrato 1.3.0", () => {
    expect(medirFrescor(manifesto(LIMITE_DE_IDADE_HORAS + 1), AGORA).velho).toBe(true);
    expect(medirFrescor(manifesto(LIMITE_DE_IDADE_HORAS - 1), AGORA).velho).toBe(false);
  });

  it("carimbo mais antigo que a geração não envelhece o índice", () => {
    expect(medirFrescor(manifesto(5, 200), AGORA).velho).toBe(false);
  });
});

describe("o texto do aviso continua falando da geração", () => {
  it("idade e data vêm do generatedAt, mesmo com carimbo recente", () => {
    const frescor = medirFrescor(manifesto(96, 5), AGORA);
    expect(frescor.horas).toBeCloseTo(96, 5);
    expect(frescor.geradoEm.toISOString()).toBe(horasAtras(96));
  });

  it("quando avisa, a geração tem pelo menos a idade da verificação", () => {
    // O aviso escreve "gerado há N dias": com o índice parado, N nunca fica
    // abaixo do limite, porque a geração nunca é mais nova que o carimbo.
    const frescor = medirFrescor(manifesto(LIMITE_DE_IDADE_HORAS + 30, LIMITE_DE_IDADE_HORAS + 1), AGORA);
    expect(frescor.velho).toBe(true);
    expect(frescor.horas).toBeGreaterThan(LIMITE_DE_IDADE_HORAS);
  });
});
