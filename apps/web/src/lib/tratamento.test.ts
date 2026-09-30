import { describe, expect, it } from "vitest";

import type { Asset } from "@lol-assets/schema";

import { porArvore, porElo, porRota, tratamentoDe, wardsEmPares } from "./tratamento";

/** O tratamento próprio de cada categoria (T-84). */

function asset(id: string, extra: Partial<Asset> = {}): Asset {
  return { id, type: "rune_icon", names: { pt_BR: id }, tags: [], ...extra } as unknown as Asset;
}

describe("as runas por árvore", () => {
  const DOMINACAO = asset("rune_tree_icon:8100", { type: "rune_tree_icon", refId: "8100", names: { pt_BR: "Dominação" }, tags: ["arvore:8100"] });
  const PRECISAO = asset("rune_tree_icon:8000", { type: "rune_tree_icon", refId: "8000", names: { pt_BR: "Precisão" }, tags: ["arvore:8000"] });
  const ELETROCUTAR = asset("rune_icon:8112", { refId: "8112", tags: ["arvore:8100"] });
  const CONQUISTADOR = asset("rune_icon:8010", { refId: "8010", tags: ["arvore:8000"] });
  const FRAGMENTO = asset("stat_mod_icon:5001", { type: "stat_mod_icon", refId: "5001", tags: ["arvore:nenhuma"] });

  it("uma seção por árvore, na ordem do cliente, com o nome que a fatia dá", () => {
    const grupos = porArvore([ELETROCUTAR, FRAGMENTO, CONQUISTADOR, DOMINACAO, PRECISAO]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Precisão", "Dominação", "Sem árvore"]);
  });

  it("o ícone da árvore abre a seção dela", () => {
    const [precisao] = porArvore([CONQUISTADOR, PRECISAO]);
    expect(precisao.assets.map((a) => a.id)).toEqual([PRECISAO.id, CONQUISTADOR.id]);
  });
});

describe("as wards em pares", () => {
  const ward = (ref: string) => asset(`ward_icon:${ref}`, { type: "ward_icon", refId: ref });

  it("a arte e a sombra viram um card só, pela arte", () => {
    const { lista, sombraDe } = wardsEmPares([ward("0"), ward("0-shadow"), ward("1"), ward("1-shadow")]);
    expect(lista.map((a) => a.refId)).toEqual(["0", "1"]);
    expect(sombraDe.get("ward_icon:0")?.refId).toBe("0-shadow");
  });

  it("arte sem sombra fica sozinha, e sombra sem arte continua aparecendo", () => {
    const { lista, sombraDe } = wardsEmPares([ward("2"), ward("9-shadow")]);
    expect(lista.map((a) => a.refId)).toEqual(["2", "9-shadow"]);
    expect(sombraDe.size).toBe(0);
  });
});

describe("o tratamento de cada categoria", () => {
  it("feitiços e mapas pedem tiles maiores; runas, seções", () => {
    expect(tratamentoDe("summoner_spell").larguraMinima).toBeGreaterThan(0);
    expect(tratamentoDe("map").larguraMinima).toBeGreaterThan(tratamentoDe("summoner_spell").larguraMinima!);
    expect(tratamentoDe("rune").agrupar).toBe(porArvore);
    expect(tratamentoDe("profile_icon")).toEqual({});
  });

  it("as categorias de nome longo mostram o nome em duas linhas (T-91)", () => {
    for (const categoria of ["item", "rune", "ward", "emote"] as const) {
      expect(tratamentoDe(categoria).linhasDoNome, categoria).toBe(2);
    }
    // Ícone de perfil tem número por nome; feitiço e mapa já têm tile largo.
    for (const categoria of ["profile_icon", "summoner_spell", "map"] as const) {
      expect(tratamentoDe(categoria).linhasDoNome, categoria).toBeUndefined();
    }
  });
});

describe("os emblemas de elo (T-92)", () => {
  const elo = (refId: string) => ({ id: `rank_emblem:${refId}`, refId }) as unknown as Asset;

  it("vêm na ordem do jogo, de Ferro a Desafiante, e elo desconhecido vai para o fim", () => {
    const ordem = ["challenger", "iron", "novo", "gold", "emerald", "bronze"].map(elo);
    expect(porElo(ordem).map((a) => a.refId)).toEqual(["iron", "bronze", "gold", "emerald", "challenger", "novo"]);
  });

  it("a categoria pede tile de 220 px, prévia aproximada e a ordem do jogo", () => {
    const tratamento = tratamentoDe("rank");
    expect(tratamento.larguraDoTile).toBe(220);
    expect(tratamento.zoomDaPrevia).toBeGreaterThan(1);
    expect(tratamento.ordenar).toBe(porElo);
  });
});

describe("as rotas (T-93)", () => {
  it("vêm de cima para baixo no mapa", () => {
    const rota = (refId: string) => ({ id: `position_icon:${refId}`, refId }) as unknown as Asset;
    const ordem = ["utility", "bottom", "top", "middle", "jungle"].map(rota);
    expect(porRota(ordem).map((a) => a.refId)).toEqual(["top", "jungle", "middle", "bottom", "utility"]);
    expect(tratamentoDe("position").ordenar).toBe(porRota);
  });
});
