import { describe, expect, it } from "vitest";

import type { Asset, CatalogChampion } from "@lol-assets/schema";

import {
  categoriasDisponiveis,
  descreverFiltro,
  etiquetasDe,
  filtrar,
  filtrarCampeoes,
  filtrosPadrao,
  funcoesDe,
  grupoDaTag,
  gruposDeFiltro,
  prepararLista,
  OPCOES_NA_BARRA,
  rotuloDaCategoria,
  rotuloDaTag,
  separarGrupos,
} from "./categorias";

/**
 * O filtro do RF-08, contra as etiquetas que o T-21 escreve de verdade.
 *
 * A fixture não é inventada: `compravel`, `mapa:sr`, `classe:*`, `arvore:*` e
 * `slot:*` são as etiquetas que saem do `item.json` e do `runesReforged.json`,
 * na mesma grafia. Se elas mudarem, é aqui que o teste vira vermelho.
 */

function asset(id: string, extra: Partial<Asset> = {}): Asset {
  return {
    id,
    type: "item_icon",
    category: "item",
    names: { pt_BR: id },
    source: "ddragon",
    sourceUrl: `https://exemplo.invalido/${id}.png`,
    fileName: `${id}.png`,
    width: 64,
    height: 64,
    format: "png",
    hasAlpha: true,
    bytes: 1000,
    sha256: "0".repeat(64),
    ...extra,
  } as Asset;
}

const ITENS: Asset[] = [
  asset("botas", {
    names: { pt_BR: "Botas de Velocidade", en_US: "Boots of Speed" },
    tags: ["compravel", "mapa:sr", "mapa:aram", "classe:boots"],
  }),
  asset("elmo", {
    names: { pt_BR: "Elmo de Aço", en_US: "Steel Helm" },
    tags: ["compravel", "mapa:sr", "classe:armor"],
  }),
  asset("poro-aram", {
    names: { pt_BR: "Petisco de Poro", en_US: "Poro Snax" },
    tags: ["compravel", "mapa:aram", "classe:consumable"],
  }),
  asset("missao", {
    names: { pt_BR: "Item de Missão" },
    tags: ["mapa:sr", "classe:damage"],
  }),
  asset("sem-etiqueta", { names: { pt_BR: "Órfão" } }),
];

// --- as categorias ----------------------------------------------------------------------

describe("categorias navegáveis", () => {
  it("são só as que o manifesto declara", () => {
    const tem = categoriasDisponiveis([
      { category: "item" },
      { category: "champion" },
      { category: "emote" },
    ]);
    expect(tem.map((c) => c.category)).toEqual(["item", "emote"]);
  });

  it("champion nunca aparece: a home inteira já é ela", () => {
    const tem = categoriasDisponiveis([{ category: "champion" }]);
    expect(tem).toEqual([]);
  });

  it("categoria desconhecida vira o próprio nome, não some", () => {
    expect(rotuloDaCategoria("item")).toBe("Itens");
    expect(rotuloDaCategoria("categoria_nova")).toBe("categoria_nova");
  });
});

// --- os grupos saem dos dados -------------------------------------------------------------

describe("grupos de filtro", () => {
  const grupos = gruposDeFiltro(ITENS);
  const porChave = new Map(grupos.map((g) => [g.chave, g]));

  it("um grupo por prefixo de etiqueta, e nada além do que existe", () => {
    expect([...porChave.keys()].sort()).toEqual(["classe", "compravel", "mapa"]);
  });

  it("etiqueta sem `:` vira grupo de uma opção só", () => {
    expect(porChave.get("compravel")?.opcoes).toHaveLength(1);
    expect(porChave.get("compravel")?.opcoes[0].total).toBe(3);
  });

  it("conta quantos assets têm cada etiqueta", () => {
    const mapa = new Map(porChave.get("mapa")?.opcoes.map((o) => [o.tag, o.total]));
    expect(mapa.get("mapa:sr")).toBe(3);
    expect(mapa.get("mapa:aram")).toBe(2);
  });

  it("a opção mais frequente vem primeiro", () => {
    expect(porChave.get("mapa")?.opcoes.map((o) => o.tag)).toEqual(["mapa:sr", "mapa:aram"]);
  });

  it("fatia sem etiqueta nenhuma não inventa grupo", () => {
    expect(gruposDeFiltro([asset("nada")])).toEqual([]);
  });

  it("o prefixo é o que vem antes do primeiro `:`", () => {
    expect(grupoDaTag("mapa:sr")).toBe("mapa");
    expect(grupoDaTag("compravel")).toBe("compravel");
  });
});

// --- rótulos ---------------------------------------------------------------------------

describe("rótulo da etiqueta", () => {
  it("traduz só o vocabulário que o indexador inventou", () => {
    expect(rotuloDaTag("mapa:sr")).toBe("Summoner's Rift");
    expect(rotuloDaTag("arvore:nenhuma")).toBe("Sem árvore");
  });

  // Mudou no T-48, de propósito: até ali a classe de item saía crua, e a tela
  // mostrava `abilityhaste` num site em português. Ver o topo de `categorias.ts`.
  it("classe de item sai com a palavra da loja do jogo (T-48)", () => {
    expect(rotuloDaTag("classe:damage")).toBe("Dano de ataque");
    expect(rotuloDaTag("classe:nonbootsmovement")).toBe("Velocidade de movimento");
    expect(rotuloDaTag("classe:abilityhaste")).toBe("Aceleração de habilidade");
  });

  it("classe que a tabela não conhece continua saindo crua, em vez de sumir", () => {
    expect(rotuloDaTag("classe:novidade")).toBe("novidade");
    // Nome de propriedade de objeto não é rótulo.
    expect(rotuloDaTag("constructor")).toBe("Sim");
  });

  it("o slot da runa diz qual é a linha", () => {
    expect(rotuloDaTag("slot:0")).toBe("Principal");
    expect(rotuloDaTag("slot:2")).toBe("Slot 2");
  });

  it("`arvore:8000` vira o nome da árvore lendo o próprio ícone dela", () => {
    const runas: Asset[] = [
      asset("8000", {
        type: "rune_tree_icon",
        category: "rune",
        refId: "8000",
        names: { pt_BR: "Precisão" },
        tags: ["arvore:8000"],
      }),
      asset("8005", {
        type: "rune_icon",
        category: "rune",
        refId: "8005",
        names: { pt_BR: "Ataque Letal" },
        tags: ["arvore:8000", "slot:0"],
      }),
    ];
    const grupos = gruposDeFiltro(runas);
    const arvore = grupos.find((g) => g.chave === "arvore");
    expect(arvore?.rotulo).toBe("Árvore de runa");
    expect(arvore?.opcoes[0].rotulo).toBe("Precisão");
  });
});

// --- o filtro padrão do item (§B.1.6 do KICKOFF) --------------------------------------

describe("filtro padrão", () => {
  const grupos = gruposDeFiltro(ITENS);

  it("item abre em comprável e no SR", () => {
    expect([...filtrosPadrao("item", grupos)].sort()).toEqual(["compravel", "mapa:sr"]);
  });

  it("nenhuma outra categoria abre filtrada", () => {
    expect(filtrosPadrao("profile_icon", grupos).size).toBe(0);
    expect(filtrosPadrao("emote", grupos).size).toBe(0);
  });

  it("sem a etiqueta na fatia, não marca o que não existe", () => {
    expect(filtrosPadrao("item", gruposDeFiltro([asset("nada")])).size).toBe(0);
  });
});

// --- aplicar -----------------------------------------------------------------------------

describe("filtrar", () => {
  const lista = prepararLista(ITENS);

  it("sem filtro e sem texto, devolve tudo", () => {
    expect(filtrar(lista, new Set())).toHaveLength(5);
  });

  it("uma etiqueta reduz a lista", () => {
    expect(filtrar(lista, new Set(["compravel"])).map((a) => a.id)).toEqual([
      "botas",
      "elmo",
      "poro-aram",
    ]);
  });

  it("duas etiquetas do mesmo grupo são OU", () => {
    const ids = filtrar(lista, new Set(["mapa:sr", "mapa:aram"])).map((a) => a.id);
    expect(ids).toEqual(["botas", "elmo", "poro-aram", "missao"]);
  });

  it("etiquetas de grupos diferentes são E", () => {
    expect(filtrar(lista, new Set(["compravel", "mapa:aram"])).map((a) => a.id)).toEqual([
      "botas",
      "poro-aram",
    ]);
  });

  it("três grupos combinados continuam certos", () => {
    const ids = filtrar(lista, new Set(["compravel", "mapa:sr", "classe:armor"])).map((a) => a.id);
    expect(ids).toEqual(["elmo"]);
  });

  it("asset sem etiqueta some assim que qualquer filtro é marcado", () => {
    expect(filtrar(lista, new Set(["compravel"])).some((a) => a.id === "sem-etiqueta")).toBe(false);
  });

  it("combinação sem resultado devolve vazio, não tudo", () => {
    expect(filtrar(lista, new Set(["classe:boots", "compravel", "mapa:arena"]))).toEqual([]);
  });
});

describe("filtrar por texto", () => {
  const lista = prepararLista(ITENS);

  it("acha sem acento e sem caixa", () => {
    expect(filtrar(lista, new Set(), "ELMO DE ACO").map((a) => a.id)).toEqual(["elmo"]);
    expect(filtrar(lista, new Set(), "orfao").map((a) => a.id)).toEqual(["sem-etiqueta"]);
  });

  it("acha pelo nome em inglês", () => {
    expect(filtrar(lista, new Set(), "poro snax").map((a) => a.id)).toEqual(["poro-aram"]);
  });

  it("acha pelo nome do arquivo", () => {
    expect(filtrar(lista, new Set(), "missao.png").map((a) => a.id)).toEqual(["missao"]);
  });

  it("texto combina com etiqueta", () => {
    expect(filtrar(lista, new Set(["mapa:aram"]), "botas").map((a) => a.id)).toEqual(["botas"]);
    expect(filtrar(lista, new Set(["mapa:arena"]), "botas")).toEqual([]);
  });

  it("só espaço não filtra nada", () => {
    expect(filtrar(lista, new Set(), "   ")).toHaveLength(5);
  });
});

// --- o estado vazio (critério 4) ---------------------------------------------------------

describe("descrever o filtro", () => {
  const grupos = gruposDeFiltro(ITENS);

  it("diz o grupo e a opção de cada etiqueta marcada", () => {
    expect(descreverFiltro(new Set(["compravel", "mapa:aram"]), "", grupos)).toEqual([
      "Comprável: Sim",
      "Mapa: ARAM",
    ]);
  });

  it("inclui o texto digitado", () => {
    expect(descreverFiltro(new Set(), "poro", grupos)).toEqual(["Texto: “poro”"]);
  });

  it("sem nada marcado, não descreve nada", () => {
    expect(descreverFiltro(new Set(), "  ", grupos)).toEqual([]);
  });
});

// --- função do campeão (a parte do RF-08 que sobrevive fora das categorias) ------------

function campeao(id: string, tags: string[]): CatalogChampion {
  return {
    championKey: id.length,
    championId: id,
    names: { pt_BR: id },
    tags,
    skinCount: 1,
    baseSkinId: 1,
  };
}

const CAMPEOES: CatalogChampion[] = [
  campeao("Jax", ["Fighter", "Assassin"]),
  campeao("Lux", ["Mage", "Support"]),
  campeao("Nunu", ["Tank", "Fighter"]),
  campeao("Ashe", ["Marksman", "Support"]),
];

describe("funções do campeão", () => {
  it("saem do catálogo, com a contagem de cada uma", () => {
    expect(funcoesDe(CAMPEOES)).toEqual([
      { tag: "Assassin", rotulo: "Assassino", total: 1 },
      { tag: "Marksman", rotulo: "Atirador", total: 1 },
      { tag: "Fighter", rotulo: "Lutador", total: 2 },
      { tag: "Mage", rotulo: "Mago", total: 1 },
      { tag: "Support", rotulo: "Suporte", total: 2 },
      { tag: "Tank", rotulo: "Tanque", total: 1 },
    ]);
  });

  it("função nova da Riot aparece crua em vez de sumir", () => {
    expect(funcoesDe([campeao("Novo", ["Specialist"])])[0]).toEqual({
      tag: "Specialist",
      rotulo: "Specialist",
      total: 1,
    });
  });

  it("sem filtro, a grade é a grade inteira", () => {
    expect(filtrarCampeoes(CAMPEOES, new Set())).toHaveLength(4);
  });

  it("uma função reduz a grade", () => {
    expect(filtrarCampeoes(CAMPEOES, new Set(["Fighter"])).map((c) => c.championId)).toEqual([
      "Jax",
      "Nunu",
    ]);
  });

  it("duas funções são OU, e ninguém aparece duas vezes", () => {
    const ids = filtrarCampeoes(CAMPEOES, new Set(["Fighter", "Assassin"])).map(
      (c) => c.championId,
    );
    expect(ids).toEqual(["Jax", "Nunu"]);
  });

  it("função sem ninguém devolve grade vazia", () => {
    expect(filtrarCampeoes(CAMPEOES, new Set(["Especialista"]))).toEqual([]);
  });
});

// --- T-48: sinônimos e a barra de filtros --------------------------------------------

describe("duas etiquetas da Riot para a mesma coisa", () => {
  // No índice real: 99 itens com `SpellBlock`, 33 com `MagicResist`, 23 com as duas.
  const RESISTENCIA: Asset[] = [
    asset("so-spellblock", { tags: ["classe:spellblock"] }),
    asset("so-magicresist", { tags: ["classe:magicresist"] }),
    asset("as-duas", { tags: ["classe:spellblock", "classe:magicresist"] }),
  ];

  it("viram uma opção só, contando cada asset uma vez", () => {
    const classe = gruposDeFiltro(RESISTENCIA).find((g) => g.chave === "classe");
    expect(classe?.opcoes).toEqual([
      { tag: "classe:spellblock", rotulo: "Resistência mágica", total: 3 },
    ]);
  });

  it("e a opção filtra os três", () => {
    const ids = filtrar(prepararLista(RESISTENCIA), new Set(["classe:spellblock"])).map((a) => a.id);
    expect(ids).toEqual(["so-spellblock", "so-magicresist", "as-duas"]);
  });

  it("asset sem sinônimo devolve as próprias etiquetas", () => {
    const tags = ["compravel", "mapa:sr"];
    expect(etiquetasDe({ tags })).toBe(tags);
  });
});

describe("a barra de filtros", () => {
  function grupo(chave: string, opcoes: number) {
    return {
      chave,
      rotulo: chave,
      opcoes: Array.from({ length: opcoes }, (_, i) => ({ tag: `${chave}:${i}`, rotulo: `${i}`, total: 1 })),
    };
  }

  it("grupo pequeno fica na barra; grande vai para 'Mais filtros'", () => {
    const { naBarra, maisFiltros } = separarGrupos([
      grupo("mapa", 3),
      grupo("arvore", OPCOES_NA_BARRA),
      grupo("classe", 32),
    ]);
    expect(naBarra.map((g) => g.chave)).toEqual(["mapa", "arvore"]);
    expect(maisFiltros.map((g) => g.chave)).toEqual(["classe"]);
  });
});

// --- T-75: a ward é arte ou sombra --------------------------------------------------------

describe("arte e sombra das wards (T-75)", () => {
  // Como o índice grava: a arte com `refId` "1", a sombra com "1-shadow".
  const ward = (ref: string) =>
    asset(`ward_icon:${ref}`, { type: "ward_icon", category: "ward", refId: ref, fileName: `Ward_${ref}.png` });
  const WARDS = [ward("0"), ward("0-shadow"), ward("1"), ward("1-shadow"), ward("2")];

  it("a barra ganha o grupo Imagem, com Arte e Sombra e as contagens", () => {
    const imagem = gruposDeFiltro(WARDS).find((g) => g.chave === "imagem");
    expect(imagem?.rotulo).toBe("Imagem");
    expect(imagem?.opcoes.map((o) => [o.rotulo, o.total])).toEqual([
      ["Arte", 3],
      ["Sombra", 2],
    ]);
  });

  it("marcar Arte esconde as sombras", () => {
    const soArte = filtrar(prepararLista(WARDS), new Set(["imagem:arte"]));
    expect(soArte.map((a) => a.refId)).toEqual(["0", "1", "2"]);
  });

  it("a categoria abre sem o filtro: nada some sem a pessoa pedir", () => {
    expect(filtrosPadrao("ward", gruposDeFiltro(WARDS)).size).toBe(0);
  });

  it("asset que não é ward não ganha a etiqueta", () => {
    expect(etiquetasDe(asset("3031", { tags: ["compravel"] }))).toEqual(["compravel"]);
  });
});
