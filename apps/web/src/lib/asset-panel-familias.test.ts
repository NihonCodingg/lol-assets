import { describe, expect, it } from "vitest";

import type { Asset } from "@lol-assets/schema";

import { agruparPorFamilia, orderAssets } from "./asset-panel";

/**
 * As famílias do painel do campeão (T-47b): o que aparece junto, e em que ordem.
 */

function asset(type: string, id: string = type): Asset {
  return {
    id,
    type,
    category: "champion",
    names: { pt_BR: id },
    source: "ddragon",
    sourceUrl: `https://exemplo.invalido/${id}.png`,
    fileName: `${id}.png`,
    width: 64,
    height: 64,
    format: "png",
    hasAlpha: false,
    bytes: 1,
  } as unknown as Asset;
}

describe("as famílias do painel do campeão (T-47b)", () => {
  it("junta o que se procura junto, na ordem do painel", () => {
    const grupos = agruparPorFamilia([
      asset("ability_icon", "q"),
      asset("square"),
      asset("splash_wide"),
      asset("splash_centered"),
      asset("passive_icon"),
      asset("tile"),
      asset("loading"),
    ]);

    expect(grupos.map((g) => g.rotulo)).toEqual([
      "Splash e tela de carregamento",
      "Retratos",
      "Passiva e habilidades",
    ]);
    expect(grupos[0].assets.map((a) => a.type)).toEqual(["splash_centered", "splash_wide", "loading"]);
    expect(grupos[1].assets.map((a) => a.type)).toEqual(["tile", "square"]);
    expect(grupos[2].assets.map((a) => a.type)).toEqual(["passive_icon", "ability_icon"]);
  });

  it("família sem asset não vira grupo vazio", () => {
    expect(agruparPorFamilia([asset("square")]).map((g) => g.chave)).toEqual(["retrato"]);
  });

  it("tipo sem família aparece no fim, com o próprio rótulo — não some", () => {
    const grupos = agruparPorFamilia([asset("emote_icon"), asset("splash_centered")]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Splash e tela de carregamento", "Emote"]);
  });
});

describe("as habilidades na ordem do teclado (T-83)", () => {
  it("Q, W, E, R — e não E, Q, R, W", () => {
    const habilidade = (tecla: string) =>
      ({ id: `ability_icon:24.${tecla}`, type: "ability_icon", names: { pt_BR: tecla } }) as unknown as Asset;
    const ordem = orderAssets(["E", "R", "W", "Q"].map(habilidade)).map((a) => a.id.slice(-1));
    expect(ordem).toEqual(["Q", "W", "E", "R"]);
  });
});
