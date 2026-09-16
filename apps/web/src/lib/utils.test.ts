import { describe, expect, it } from "vitest";

import { cn } from "./utils";

/**
 * O `cn` precisa conhecer o vocabulário do tema. Quando não conhece, ou descarta
 * a classe errada (T-28: `text-12` apagando `text-superficie`), ou mantém as duas
 * e deixa a ordem do CSS decidir (T-48: `h-controle-lg` com `h-controle-md`).
 */
describe("cn", () => {
  it("tamanho de texto e cor de texto não são o mesmo grupo", () => {
    expect(cn("text-superficie text-12", "text-13")).toBe("text-superficie text-13");
  });

  it("a altura com nome de fora vence a de dentro", () => {
    expect(cn("h-controle-lg w-full", "h-controle-md")).toBe("w-full h-controle-md");
    expect(cn("h-controle-md w-controle-md", "h-controle-sm w-controle-sm")).toBe(
      "h-controle-sm w-controle-sm",
    );
  });

  it("classe que não conflita fica", () => {
    expect(cn("h-controle-md px-2.5", "gap-1")).toBe("h-controle-md px-2.5 gap-1");
  });
});
