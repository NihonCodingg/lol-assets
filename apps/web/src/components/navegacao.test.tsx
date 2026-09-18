import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Asset, Catalog, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { GradeDeCampeoes } from "./grade-de-campeoes";
import { PainelDoCampeao } from "./painel-do-campeao";
import { PaletaDeBusca } from "./paleta-de-busca";

/**
 * Os quatro caminhos do [ADR 0010], contados em cliques, e a escala em que a
 * navegação tem que aguentar: 173 campeões na grade e 2.118 skins na busca.
 *
 * O orçamento de 3 cliques fecha **exatamente** no ADR. Não é folga: qualquer
 * passo a mais estoura, e estourar é o tipo de coisa que só se percebe usando.
 */

afterEach(cleanup);

// --- um catálogo do tamanho do real ---------------------------------------------------

const CAMPEOES: CatalogChampion[] = Array.from({ length: 173 }, (_, i) => ({
  championKey: i + 1,
  championId: `Campeao${i + 1}`,
  names: { pt_BR: `Campeão ${i + 1}` },
  skinCount: 12,
  baseSkinId: (i + 1) * 1000,
}));

const SKINS: CatalogSkin[] = Array.from({ length: 2118 }, (_, i) => {
  const championKey = (i % 173) + 1;
  const skinNum = Math.floor(i / 173);
  return {
    skinId: championKey * 1000 + skinNum,
    skinNum,
    championKey,
    names: { pt_BR: skinNum === 0 ? `Campeão ${championKey}` : `Skin Prestígio ${i}` },
    isBase: skinNum === 0,
  };
});

const CATALOGO: Catalog = {
  schemaVersion: "1.1.0",
  gameVersion: "16.18.1",
  generatedAt: "2026-09-09T00:00:00Z",
  champions: CAMPEOES,
  skins: SKINS,
};

// --- a grade (critério 1) ---------------------------------------------------------------

describe("grade de campeões", () => {
  it("tem exatamente um cartão por campeão", () => {
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(173);
  });

  it("cada cartão conta skins", () => {
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(screen.getAllByText("12 skins")).toHaveLength(173);
  });

  it("nenhuma skin solta aparece na grade — foi o erro que o ADR 0010 corrigiu", () => {
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(screen.queryByText(/Skin Prestígio/)).toBeNull();
  });

  it("clicar num cartão abre aquele campeão", () => {
    const onAbrir = vi.fn();
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={onAbrir} />);
    fireEvent.click(screen.getByRole("button", { name: /Campeão 42/ }));

    expect(onAbrir).toHaveBeenCalledTimes(1);
    expect(onAbrir.mock.calls[0][0].championKey).toBe(42);
  });
});

// --- a virtualização (critério 7) ---------------------------------------------------------

describe("resultados de busca de skin", () => {
  function buscar(consulta: string) {
    render(<PaletaDeBusca catalog={CATALOGO} onChampion={vi.fn()} onSkin={vi.fn()} />);
    const campo = screen.getByRole("combobox");
    fireEvent.change(campo, { target: { value: consulta } });
    return document.querySelector("[data-resultados]") as HTMLElement;
  }

  it("acha todas as skins que casam", () => {
    const scroller = buscar("prestigio");
    expect(Number(scroller.dataset.resultados)).toBeGreaterThan(1000);
  });

  it("com milhares de resultados, o DOM fica na casa das dezenas", () => {
    const scroller = buscar("prestigio");
    const nos = document.querySelectorAll("[cmdk-item]").length;

    expect(Number(scroller.dataset.resultados)).toBeGreaterThan(1000);
    expect(nos).toBeLessThan(100);
    expect(scroller.dataset.virtual).toBe("true");
  });

  it("com poucos resultados, não paga o custo da virtualização", () => {
    const scroller = buscar("Campeão 42");
    expect(scroller.dataset.virtual).toBe("false");
  });

  /**
   * T-54: a busca escolhe skin ([ADR 0010]), e o que identifica uma skin é a
   * arte. A prévia mostra o item em destaque — o mesmo que as setas movem — em
   * tamanho grande, com a arte que o catálogo já traz (RNF-03: a home não busca
   * fatia de asset).
   */
  it("a prévia mostra o resultado em destaque, com arte e nome", () => {
    buscar("Campeão 42");
    const previa = document.querySelector("[data-previa-da-busca]") as HTMLElement;
    expect(previa).toBeTruthy();
    expect(previa.textContent).toContain("Campeão 42");
    // A arte é a do catálogo; no fixture, sem `thumbnailUrl`, sobra a caixa —
    // que é justamente o que não pode faltar, para a prévia não pular de
    // tamanho quando a imagem chega.
    expect(previa.querySelector("img, [aria-hidden='true']")).toBeTruthy();
  });

  it("sem consulta não há prévia — ela não é um cartão parado na tela", () => {
    render(<PaletaDeBusca catalog={CATALOGO} onChampion={vi.fn()} onSkin={vi.fn()} />);
    expect(document.querySelector("[data-previa-da-busca]")).toBeNull();
  });
});

// --- os quatro caminhos do ADR 0010 (critério 6) --------------------------------------------

function asset(tipo: string, extra: Partial<Asset> = {}): Asset {
  return {
    id: `${tipo}:${extra.skinId ?? 24}`,
    type: tipo as Asset["type"],
    category: "champion",
    championKey: 24,
    championId: "Jax",
    names: { pt_BR: "Jax" },
    source: "ddragon",
    sourceUrl: "https://exemplo.invalido/x.png",
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

const JAX: CatalogChampion = {
  championKey: 24,
  championId: "Jax",
  names: { pt_BR: "Jax" },
  skinCount: 2,
  baseSkinId: 24000,
};

const SKINS_DO_JAX: CatalogSkin[] = [
  { skinId: 24000, skinNum: 0, championKey: 24, names: { pt_BR: "Jax" }, isBase: true },
  {
    skinId: 24004,
    skinNum: 4,
    championKey: 24,
    names: { pt_BR: "Jax Deus da Guerra" },
    isBase: false,
  },
];

const ASSETS_DO_JAX: Asset[] = [
  asset("square", { id: "square:24" }),
  asset("splash_centered", {
    skinId: 24000,
    skinNum: 0,
    id: "splash_centered:24000",
    fileName: "Jax_000_splash_centered.jpg",
  }),
  asset("splash_centered", {
    skinId: 24004,
    skinNum: 4,
    id: "splash_centered:24004",
    fileName: "Jax_004_splash_centered.jpg",
  }),
];

const CATALOGO_DO_JAX: Catalog = { ...CATALOGO, champions: [JAX], skins: SKINS_DO_JAX };

/** Conta cliques de verdade: cada `fireEvent.click` passa por aqui. */
function contador() {
  let cliques = 0;
  return {
    clicar(elemento: Element) {
      cliques += 1;
      fireEvent.click(elemento);
    },
    get total() {
      return cliques;
    },
  };
}

describe("orçamento de 3 cliques", () => {
  it('buscar "deus da guerra" → skin → baixar = 2', () => {
    const cliques = contador();
    const onSkin = vi.fn();
    render(<PaletaDeBusca catalog={CATALOGO_DO_JAX} onChampion={vi.fn()} onSkin={onSkin} />);

    // Digitar não é clique.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "deus da guerra" } });
    cliques.clicar(document.querySelector("[cmdk-item]")!);
    expect(onSkin).toHaveBeenCalledTimes(1);
    expect(onSkin.mock.calls[0][0].skinNum).toBe(4);

    // O painel abre JÁ na skin certa — é o atalho que o ADR 0010 comprou.
    cleanup();
    render(
      <PainelDoCampeao
        champion={JAX}
        skins={SKINS_DO_JAX}
        assets={ASSETS_DO_JAX}
        skinInicial={4}
        onClose={vi.fn()}
      />,
    );
    const cartao = screen.getByLabelText("Jax_004_splash_centered.jpg");
    cliques.clicar(within(cartao).getByRole("button", { name: "Baixar original" }));

    expect(cliques.total).toBe(2);
  });

  it('buscar "jax" → campeão → baixar o square = 2', () => {
    const cliques = contador();
    const onChampion = vi.fn();
    render(<PaletaDeBusca catalog={CATALOGO_DO_JAX} onChampion={onChampion} onSkin={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "jax" } });
    cliques.clicar(document.querySelector("[cmdk-item]")!);
    expect(onChampion).toHaveBeenCalledTimes(1);

    cleanup();
    render(
      <PainelDoCampeao
        champion={JAX}
        skins={SKINS_DO_JAX}
        assets={ASSETS_DO_JAX}
        onClose={vi.fn()}
      />,
    );
    const cartao = screen.getByLabelText("Jax_square.png");
    cliques.clicar(within(cartao).getByRole("button", { name: "Baixar original" }));

    expect(cliques.total).toBe(2);
  });

  it('buscar "jax" → campeão → escolher a skin → baixar = 3', () => {
    const cliques = contador();
    render(<PaletaDeBusca catalog={CATALOGO_DO_JAX} onChampion={vi.fn()} onSkin={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "jax" } });
    cliques.clicar(document.querySelector("[cmdk-item]")!);

    cleanup();
    render(
      <PainelDoCampeao
        champion={JAX}
        skins={SKINS_DO_JAX}
        assets={ASSETS_DO_JAX}
        onClose={vi.fn()}
      />,
    );
    // Escolher a skin é um clique: no rádio com o tile dela (T-47). Com o
    // `<select>` eram dois eventos contados como um; agora é um só.
    cliques.clicar(screen.getByRole("radio", { name: "Jax Deus da Guerra" }));

    const cartao = screen.getByLabelText("Jax_004_splash_centered.jpg");
    cliques.clicar(within(cartao).getByRole("button", { name: "Baixar original" }));

    expect(cliques.total).toBe(3);
  });

  it("navegar sem digitar → campeão → escolher a skin → baixar = 3", () => {
    const cliques = contador();
    const onAbrir = vi.fn();
    render(<GradeDeCampeoes champions={[JAX]} onAbrir={onAbrir} />);

    cliques.clicar(screen.getByRole("button", { name: /Jax/ }));
    expect(onAbrir).toHaveBeenCalledTimes(1);

    cleanup();
    render(
      <PainelDoCampeao
        champion={JAX}
        skins={SKINS_DO_JAX}
        assets={ASSETS_DO_JAX}
        onClose={vi.fn()}
      />,
    );
    cliques.clicar(screen.getByRole("radio", { name: "Jax Deus da Guerra" }));

    const cartao = screen.getByLabelText("Jax_004_splash_centered.jpg");
    cliques.clicar(within(cartao).getByRole("button", { name: "Baixar original" }));

    expect(cliques.total).toBe(3);
  });
});

// --- a arte do cartão (T-46) ------------------------------------------------------------

describe("a arte do cartão (T-46)", () => {
  const COM_SQUARE: CatalogChampion = {
    ...JAX,
    thumbnailUrl: "https://exemplo.invalido/Jax_square.png",
  };
  const BASE_COM_TILE: CatalogSkin = {
    ...SKINS_DO_JAX[0],
    thumbnailUrl: "https://exemplo.invalido/Jax_000_tile.jpg",
  };

  it("é o tile 380×380 da skin base, não o square de 128 esticado", () => {
    render(<GradeDeCampeoes champions={[COM_SQUARE]} skins={[BASE_COM_TILE]} onAbrir={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Jax" }).getAttribute("src")).toBe(
      BASE_COM_TILE.thumbnailUrl,
    );
  });

  it("sem a skin base no catálogo, o square fica de reserva", () => {
    render(<GradeDeCampeoes champions={[COM_SQUARE]} onAbrir={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Jax" }).getAttribute("src")).toBe(
      COM_SQUARE.thumbnailUrl,
    );
  });
});

// --- densidade (T-40, fechado no T-46) ---------------------------------------------------
//
// O jsdom não faz layout, então aqui se prova a largura-alvo e a memória. As
// colunas, contadas de verdade, estão no e2e `densidade.spec.ts`.

describe("densidade da grade (T-40)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  const lista = () => screen.getByRole("list", { name: "Campeões" });

  it("abre densa, e alternar troca a largura-alvo do cartão", () => {
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(lista().dataset.densidade).toBe("densa");
    expect(lista().className).toContain("--spacing-alvo-cartao-denso");

    fireEvent.click(screen.getByRole("button", { name: "Grade confortável" }));
    expect(lista().dataset.densidade).toBe("confortavel");
    expect(lista().className).toContain("--spacing-alvo-cartao-confortavel");
    expect(
      screen.getByRole("button", { name: "Grade confortável" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Grade densa" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("a escolha sobrevive a montar de novo — que é o que recarregar faz", () => {
    const { unmount } = render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade confortável" }));
    unmount();

    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(lista().dataset.densidade).toBe("confortavel");
  });

  /**
   * T-55: o terceiro passo. O "denso" dava 7 colunas numa tela de 1440 e as
   * mesmas 2 do confortável num telefone — o controle aparecia e não mudava
   * nada lá.
   */
  it("a compacta é um terceiro passo, e também sobrevive a recarregar", () => {
    const { unmount } = render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade compacta" }));
    expect(lista().dataset.densidade).toBe("compacta");
    expect(lista().className).toContain("--spacing-alvo-cartao-compacto");
    unmount();

    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(lista().dataset.densidade).toBe("compacta");
  });

  it("valor estranho no localStorage volta para a densa", () => {
    window.localStorage.setItem("biblioteca:densidade", "gigante");
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(lista().dataset.densidade).toBe("densa");
  });

  it("sem localStorage — o modo privado lança —, abre densa e nada quebra", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<GradeDeCampeoes champions={CAMPEOES} onAbrir={vi.fn()} />);
    expect(lista().dataset.densidade).toBe("densa");

    // A escolha vale até recarregar.
    fireEvent.click(screen.getByRole("button", { name: "Grade confortável" }));
    expect(lista().dataset.densidade).toBe("confortavel");
  });
});

// --- a busca flutua sobre a grade (T-46) --------------------------------------------------

describe("a busca flutuante (T-46)", () => {
  function digitar(consulta: string) {
    render(<PaletaDeBusca catalog={CATALOGO_DO_JAX} onChampion={vi.fn()} onSkin={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: consulta } });
  }
  const lista = () => document.querySelector("[data-aberta]") as HTMLElement;
  const campo = () => screen.getByRole("combobox") as HTMLInputElement;

  it("cada resultado diz o que é: campeão com as skins, skin com o dono (RF-24)", () => {
    digitar("jax");
    expect(screen.getByText("Campeão · 2 skins")).toBeTruthy();
    cleanup();
    digitar("deus da guerra");
    expect(screen.getByText("Skin · Jax")).toBeTruthy();
  });

  it("escolher fecha a lista e limpa o campo para o próximo nome", () => {
    digitar("jax");
    expect(lista().dataset.aberta).toBe("true");
    fireEvent.click(document.querySelector("[cmdk-item]")!);
    expect(lista().dataset.aberta).toBe("false");
    expect(campo().value).toBe("");
  });

  it("o primeiro Escape fecha a lista; o segundo apaga o que foi digitado", () => {
    digitar("jax");
    fireEvent.keyDown(campo(), { key: "Escape" });
    expect(lista().dataset.aberta).toBe("false");
    expect(campo().value).toBe("jax");

    fireEvent.keyDown(campo(), { key: "Escape" });
    expect(campo().value).toBe("");
  });

  it("clicar fora fecha", () => {
    digitar("jax");
    fireEvent.pointerDown(document.body);
    expect(lista().dataset.aberta).toBe("false");
  });

  it("nada encontrado ensina o que dá para digitar", () => {
    digitar("zzzz");
    expect(screen.getByText("Nada para “zzzz”.")).toBeTruthy();
    expect(screen.getByText(/um apelido como mf ou j4/)).toBeTruthy();
  });
});
