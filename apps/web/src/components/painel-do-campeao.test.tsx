import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Asset, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { PainelDoCampeao } from "./painel-do-campeao";

/**
 * T-19, T-20 e T-47 no nível do componente.
 *
 * O que pode quebrar em silêncio aqui: chroma aparecendo na lista de skins
 * (RF-06), e trocar de skin sem trocar os assets — os dois passam por qualquer
 * teste de renderização ingênuo.
 *
 * **T-47:** o seletor deixou de ser `<select>` e virou uma faixa de rádios com o
 * *tile* de cada skin. O que os testes perguntam continua igual — que skins
 * aparecem, qual está marcada, o que muda ao trocar —, só a pergunta é feita ao
 * rádio: `value` do `<select>` virou o rádio marcado, e `change` virou clique.
 */

afterEach(cleanup);

function asset(tipo: string, extra: Partial<Asset> = {}): Asset {
  return {
    id: `${tipo}:${extra.skinId ?? 24}`,
    type: tipo as Asset["type"],
    category: "champion",
    championKey: 24,
    championId: "Jax",
    names: { pt_BR: "Jax" },
    source: "ddragon",
    sourceUrl: `https://exemplo.invalido/${tipo}.png`,
    fileName: `Jax_${tipo}.png`,
    width: 128,
    height: 128,
    format: "png",
    hasAlpha: false,
    bytes: 1000,
    sha256: "0".repeat(64),
    ...extra,
  } as Asset;
}

const ASSETS: Asset[] = [
  asset("square"),
  // `fileName` com o número da skin, como a convenção do §6.2 da Spec manda —
  // é ele que o painel usa como rótulo do cartão. A `sourceUrl` também leva o
  // número, para a vitrine poder ser conferida por ela.
  asset("splash_centered", {
    skinId: 24000,
    skinNum: 0,
    id: "splash_centered:24000",
    fileName: "Jax_000_splash_centered.jpg",
    sourceUrl: "https://exemplo.invalido/Jax_000_splash_centered.jpg",
  }),
  asset("splash_centered", {
    skinId: 24007,
    skinNum: 7,
    id: "splash_centered:24007",
    fileName: "Jax_007_splash_centered.jpg",
    sourceUrl: "https://exemplo.invalido/Jax_007_splash_centered.jpg",
  }),
  asset("chroma", {
    skinId: 24009,
    skinNum: 9,
    parentSkinNum: 7,
    id: "chroma:24009",
    fileName: "Jax_009_chroma.png",
  }),
  asset("chroma", { skinId: 24010, skinNum: 10, parentSkinNum: 7, id: "chroma:24010" }),
];

const SKINS: CatalogSkin[] = [
  {
    skinId: 24000,
    skinNum: 0,
    championKey: 24,
    names: { pt_BR: "Jax" },
    isBase: true,
    thumbnailUrl: "https://exemplo.invalido/Jax_000_tile.jpg",
  },
  {
    skinId: 24007,
    skinNum: 7,
    championKey: 24,
    names: { pt_BR: "Nemesis Jax" },
    isBase: false,
    chromaCount: 2,
    thumbnailUrl: "https://exemplo.invalido/Jax_007_tile.jpg",
  },
  { skinId: 99003, skinNum: 3, championKey: 99, names: { pt_BR: "Lux" }, isBase: false },
];

const JAX: CatalogChampion = {
  championKey: 24,
  championId: "Jax",
  names: { pt_BR: "Jax" },
  skinCount: 2,
  baseSkinId: 24000,
};

function abrir(props: Partial<Parameters<typeof PainelDoCampeao>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <PainelDoCampeao
      champion={JAX}
      skins={SKINS}
      assets={ASSETS}
      onClose={onClose}
      {...props}
    />,
  );
  return { onClose };
}

function seletor(): HTMLElement {
  return screen.getByRole("radiogroup", { name: "Selecionar skin" });
}

/** O `skinNum` da skin marcada — o que o `<select>` chamava de `value`. */
function skinMarcada(): string {
  const radios = within(seletor()).getAllByRole("radio") as HTMLInputElement[];
  return radios.find((radio) => radio.checked)?.value ?? "";
}

function escolher(nome: string) {
  fireEvent.click(screen.getByRole("radio", { name: nome }));
}

function tiposVisiveis(): string[] {
  const painel = screen.getAllByRole("article");
  return painel.map((c) => c.dataset.tipo ?? "");
}

function srcDaVitrine(camada: "splash" | "tile"): string | null {
  return document.querySelector(`img[data-vitrine="${camada}"]`)?.getAttribute("src") ?? null;
}

// --- o seletor de skin (T-19, vestido no T-47) --------------------------------------

describe("seletor de skin", () => {
  it("lista as skins do campeão, com a base primeiro", () => {
    abrir();
    const radios = within(seletor()).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual(["Jax", "Nemesis Jax"]);
  });

  it("a legenda não repete o campeão, e o rádio continua com o nome inteiro (T-65)", () => {
    const [base, outra] = SKINS.filter((s) => s.championKey === JAX.championKey);
    const deusDaGuerra = { ...outra!, names: { ...outra!.names, pt_BR: "Jax Deus da Guerra" } };
    abrir({ skins: [base!, deusDaGuerra] });

    const radio = screen.getByRole("radio", { name: "Jax Deus da Guerra" });
    expect(radio.closest("label")?.textContent).toBe("Deus da Guerra");
    // A base se chama só "Jax": fica "Jax".
    expect(screen.getByRole("radio", { name: "Jax" }).closest("label")?.textContent).toBe("Jax");
  });

  it("não lista skin de outro campeão", () => {
    abrir();
    expect(within(seletor()).queryByText("Lux")).toBeNull();
  });

  it("abre na skin base quando ninguém pediu outra", () => {
    abrir();
    expect(skinMarcada()).toBe("0");
  });

  it("abre na skin que a busca pediu", () => {
    abrir({ skinInicial: 7 });
    expect(skinMarcada()).toBe("7");
    expect(screen.getByRole("heading", { name: "Nemesis Jax" })).toBeTruthy();
  });

  it("trocar de skin troca os assets exibidos", () => {
    abrir();
    const idsNaBase = screen.getAllByRole("article").map((c) => c.getAttribute("aria-label"));

    escolher("Nemesis Jax");
    const idsNaOutra = screen.getAllByRole("article").map((c) => c.getAttribute("aria-label"));

    expect(skinMarcada()).toBe("7");
    expect(idsNaOutra).not.toEqual(idsNaBase);
  });

  it("o asset do campeão sobrevive à troca de skin", () => {
    abrir();
    expect(tiposVisiveis()).toContain("square");
    escolher("Nemesis Jax");
    expect(tiposVisiveis()).toContain("square");
  });

  it("cada skin é um rádio do mesmo grupo — é o que faz as setas trocarem de skin", () => {
    abrir();
    const nomes = within(seletor())
      .getAllByRole("radio")
      .map((r) => (r as HTMLInputElement).name);
    expect(new Set(nomes)).toEqual(new Set(["skin-24"]));
  });
});

// --- a vitrine (T-47) ----------------------------------------------------------------------

describe("vitrine", () => {
  it("mostra a splash centralizada da skin escolhida", () => {
    abrir();
    expect(srcDaVitrine("splash")).toBe("https://exemplo.invalido/Jax_000_splash_centered.jpg");

    escolher("Nemesis Jax");
    expect(srcDaVitrine("splash")).toBe("https://exemplo.invalido/Jax_007_splash_centered.jpg");
  });

  it("antes de a fatia chegar, já mostra o tile da skin, que vem do catálogo", () => {
    abrir({ assets: null, skinInicial: 7 });
    expect(srcDaVitrine("tile")).toBe("https://exemplo.invalido/Jax_007_tile.jpg");
    expect(srcDaVitrine("splash")).toBeNull();
  });

  it("a skin vem em destaque, e o campeão embaixo (ADR 0008)", () => {
    abrir({ skinInicial: 7 });
    expect(screen.getByRole("heading", { name: "Nemesis Jax" })).toBeTruthy();
    expect(screen.getByText("Jax, 2 skins")).toBeTruthy();
  });

  it("na skin base, o nome da skin já é o do campeão, e o subtítulo diz quantas skins há", () => {
    abrir();
    expect(screen.getByText("2 skins")).toBeTruthy();
  });

  it("há um fechar só, e ele fecha", () => {
    const { onClose } = abrir({ skinInicial: 7 });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar 2 chromas/ }));

    // Com a lista e os chromas abertos, que antes traziam um "fechar" cada.
    const fechar = screen.getAllByRole("button", { name: /fechar/i });
    expect(fechar).toHaveLength(1);
    fireEvent.click(fechar[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// --- chroma atrás de toggle (T-20 / RF-06) ---------------------------------------------

describe("chromas", () => {
  it("não aparecem sem alguém pedir", () => {
    abrir({ skinInicial: 7 });
    expect(tiposVisiveis()).not.toContain("chroma");
  });

  it("o controle revela exatamente os da skin selecionada", () => {
    abrir({ skinInicial: 7 });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar 2 chromas/ }));

    const chromas = screen.getAllByRole("article").filter((c) => c.dataset.tipo === "chroma");
    expect(chromas).toHaveLength(2);
  });

  it("a contagem revelada bate com o chromaCount do catálogo", () => {
    abrir({ skinInicial: 7 });
    const doCatalogo = SKINS.find((s) => s.skinNum === 7)?.chromaCount;
    expect(screen.getByRole("button", { name: new RegExp(`Mostrar ${doCatalogo} chromas`) })).toBeTruthy();
  });

  it("skin sem chroma não mostra o controle", () => {
    abrir({ skinInicial: 0 });
    expect(screen.queryByRole("button", { name: /chroma/ })).toBeNull();
  });

  it("o chroma revelado baixa com o fileName do índice", () => {
    abrir({ skinInicial: 7 });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar 2 chromas/ }));
    expect(screen.getByLabelText("Jax_009_chroma.png")).toBeTruthy();
  });

  it("trocar de skin fecha os chromas da anterior", () => {
    abrir({ skinInicial: 7 });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar 2 chromas/ }));
    expect(screen.getAllByRole("article").some((c) => c.dataset.tipo === "chroma")).toBe(true);

    escolher("Jax");
    expect(screen.queryByRole("button", { name: /chroma/ })).toBeNull();
  });
});

// --- estados ------------------------------------------------------------------------------

describe("estados do painel", () => {
  it("sem a fatia carregada, avisa em vez de mostrar vazio", () => {
    abrir({ assets: null });
    expect(screen.getByText("Carregando as artes…")).toBeTruthy();
  });

  it("com erro, mostra o erro e não finge que carregou", () => {
    abrir({ assets: null, erro: "HTTP 500" });
    expect(screen.getByRole("alert").textContent).toContain("HTTP 500");
    expect(screen.queryByText("Carregando as artes…")).toBeNull();
  });

  it("com erro, diz em português o que houve e oferece tentar de novo (T-50)", () => {
    const onTentarDeNovo = vi.fn();
    abrir({ assets: null, erro: "Failed to fetch", onTentarDeNovo });
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("Não deu para carregar as artes de Jax");
    // O motivo técnico fica, pequeno, para quem precisa relatar.
    expect(alerta.textContent).toContain("Failed to fetch");
    fireEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it("o seletor existe mesmo antes de a fatia chegar", () => {
    abrir({ assets: null });
    expect(seletor()).toBeTruthy();
  });
});

describe("a barra de ação do telefone (T-87)", () => {
  it("sem escolha, age sobre a primeira da lista — a splash centralizada", () => {
    abrir();
    const barra = screen.getByRole("region", { name: "Ação da variante escolhida" });
    expect(barra.textContent).toContain("Splash centralizada");
  });

  it("tocar numa variante a escolhe para a barra", () => {
    abrir();
    const [, segunda] = screen.getAllByRole("button", { name: /^Escolher / });
    fireEvent.click(segunda);
    expect(segunda.getAttribute("aria-pressed")).toBe("true");
    const barra = screen.getByRole("region", { name: "Ação da variante escolhida" });
    expect(barra.textContent).toContain(segunda.getAttribute("aria-label")!.replace("Escolher ", ""));
  });
});
