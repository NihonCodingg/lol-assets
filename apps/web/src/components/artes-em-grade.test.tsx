import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Asset, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { BarraDeLote } from "./barra-de-lote";
import { ListaDeVariantes } from "./lista-de-variantes";
import { PainelDoCampeao } from "./painel-do-campeao";
import { ParDeDownload } from "./ui/par-de-download";

/**
 * As artes do painel do campeão — em grade no T-47b, em linhas desde o T-83 —,
 * a ampliação, o retorno do download e as miniaturas da bandeja.
 *
 * O que pode quebrar em silêncio: a ficha sumir para dentro de um clique (RF-09),
 * o ícone de 64 px aparecer esticado, e o `Escape` da ampliação fechar o painel
 * junto — que é o tipo de coisa que só se percebe usando.
 */

afterEach(cleanup);

function asset(type: string, extra: Partial<Asset> = {}): Asset {
  return {
    id: `${type}:c`,
    type,
    category: "champion",
    championKey: 24,
    championId: "Jax",
    names: { pt_BR: "Jax" },
    source: "ddragon",
    sourceUrl: `https://exemplo.invalido/${type}.png`,
    fileName: `Jax_${type}.png`,
    width: 64,
    height: 64,
    format: "png",
    hasAlpha: false,
    bytes: 1000,
    sha256: "0".repeat(64),
    ...extra,
  } as Asset;
}

const SPLASH = asset("splash_centered", {
  id: "splash_centered:24000",
  skinId: 24000,
  skinNum: 0,
  fileName: "Jax_000_splash_centered.jpg",
  format: "jpeg",
  width: 1280,
  height: 720,
});

const ARTES: Asset[] = [
  SPLASH,
  asset("tile", { id: "tile:24000", skinId: 24000, skinNum: 0, format: "jpeg", width: 380, height: 380 }),
  asset("square", { width: 128, height: 128 }),
  asset("ability_icon", { id: "ability_icon:24.Q" }),
];

function grade() {
  const baixar = vi.fn().mockResolvedValue(undefined);
  const onAmpliar = vi.fn();
  render(
    <ListaDeVariantes
      titulo="Artes de Jax"
      assets={ARTES}
      baixar={baixar}
      copiar={vi.fn().mockResolvedValue(undefined)}
      onAmpliar={onAmpliar}
    />,
  );
  return { baixar, onAmpliar };
}

// --- as variantes -------------------------------------------------------------------------

describe("as variantes do painel do campeão (T-83)", () => {
  it("agrupa as artes por família, cada uma com o seu cabeçalho", () => {
    grade();
    expect(screen.getByRole("heading", { level: 3, name: /Splash e tela de carregamento/ })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: /Retratos/ })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: /Passiva e habilidades/ })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(ARTES.length);
  });

  it("uma família só não ganha cabeçalho — seria o nome da lista repetido", () => {
    render(<ListaDeVariantes titulo="Chromas de Jax" assets={[asset("chroma", { id: "chroma:9", skinNum: 9 })]} />);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("a ficha está à vista antes de qualquer clique (RF-09)", () => {
    grade();
    const cartao = screen.getByLabelText("Jax_000_splash_centered.jpg");
    expect(within(cartao).getByText(/1280×720/)).toBeTruthy();
  });

  it("cada linha diz o nome nas palavras do usuário, e a habilidade leva a tecla", () => {
    grade();
    expect(within(screen.getByLabelText("Jax_000_splash_centered.jpg")).getByText("Splash centralizada")).toBeTruthy();
    const habilidade = screen.getByLabelText("Jax_ability_icon.png");
    expect(within(habilidade).getByText("Q")).toBeTruthy();
  });

  it("o glifo de proporção acompanha a resolução, e o formato e o peso vêm em colunas", () => {
    grade();
    const linha = screen.getByLabelText("Jax_000_splash_centered.jpg");
    expect(linha.querySelector("[data-glifo='1280x720']")).not.toBeNull();
    expect(within(linha).getAllByText("JPEG").length).toBeGreaterThan(0);
    // Sem ponto médio entre os dados (ADR 0024).
    expect(linha.textContent).not.toContain("·");
  });

  it("arquivo com alfa aparece sobre o xadrez; sem alfa, não", () => {
    render(
      <ListaDeVariantes
        titulo="Artes"
        assets={[asset("square", { hasAlpha: true }), asset("tile", { id: "tile:1", hasAlpha: false })]}
      />,
    );
    const comAlfa = screen.getByLabelText("Jax_square.png").querySelector("img[data-previa]")!.parentElement!;
    const semAlfa = screen.getByLabelText("Jax_tile.png").querySelector("img[data-previa]")!.parentElement!;
    expect(comAlfa.className).toContain("xadrez");
    expect(semAlfa.className).not.toContain("xadrez");
  });

  it("\"Baixar PNG\" é a ação primária, e o arquivo que já é PNG tem um botão só", () => {
    grade();
    const splash = screen.getByLabelText("Jax_000_splash_centered.jpg");
    const png = within(splash).getByRole("button", { name: "Baixar PNG" });
    expect(png.className).toContain("bg-acento");
    expect(within(splash).getByRole("button", { name: "Baixar original" })).toBeTruthy();
    const square = screen.getByLabelText("Jax_square.png");
    expect(within(square).getAllByRole("button", { name: /^Baixar/ }).map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Baixar PNG"]);
  });

  it("copiar mostra a dica do Radix, que abre sozinha", async () => {
    render(<ListaDeVariantes titulo="Artes" assets={[asset("square")]} copiar={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(screen.getByRole("tooltip").textContent).toBe("Link copiado"));
  });

  it("a prévia é o botão da ampliação", () => {
    const { onAmpliar } = grade();
    fireEvent.click(screen.getByRole("button", { name: "Ampliar Jax_000_splash_centered.jpg" }));
    expect(onAmpliar).toHaveBeenCalledWith(SPLASH);
  });

  it("baixar avisa que baixou, no próprio cartão — e o botão não troca de nome", async () => {
    grade();
    const cartao = screen.getByLabelText("Jax_000_splash_centered.jpg");
    fireEvent.click(within(cartao).getByRole("button", { name: "Baixar original" }));

    await waitFor(() => expect(within(cartao).getByRole("status").textContent).toBe("Arquivo baixado"));
    const botao = within(cartao).getByRole("button", { name: "Baixar original" });
    expect(botao.querySelector("[data-icone='baixado']")).not.toBeNull();
  });
});

// --- o par de download dá retorno ------------------------------------------------------------

describe("o retorno do download", () => {
  it("o botão em andamento gira; o que terminou mostra ✓; o texto fica", () => {
    render(
      <ParDeDownload podeConverter baixando="png" baixado={null} onOriginal={() => {}} onPng={() => {}} />,
    );
    const png = screen.getByRole("button", { name: "Baixar PNG" });
    expect(png.querySelector("[data-icone='baixando']")).not.toBeNull();
    expect(png.getAttribute("aria-busy")).toBe("true");

    cleanup();
    render(
      <ParDeDownload podeConverter baixando={null} baixado="original" onOriginal={() => {}} onPng={() => {}} />,
    );
    const original = screen.getByRole("button", { name: "Baixar original" });
    expect(original.querySelector("[data-icone='baixado']")).not.toBeNull();
  });
});

// --- a ampliação, dentro do painel ---------------------------------------------------------

describe("a ampliação", () => {
  const SKINS: CatalogSkin[] = [
    { skinId: 24000, skinNum: 0, championKey: 24, names: { pt_BR: "Jax" }, isBase: true },
  ];
  const JAX: CatalogChampion = {
    championKey: 24,
    championId: "Jax",
    names: { pt_BR: "Jax" },
    skinCount: 1,
    baseSkinId: 24000,
  };

  it("abre pela prévia, e o Escape fecha a ampliação antes do painel", () => {
    const onClose = vi.fn();
    render(<PainelDoCampeao champion={JAX} skins={SKINS} assets={ARTES} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Ampliar Jax_000_splash_centered.jpg" }));
    expect(screen.getByRole("dialog", { name: /^Ampliação de Splash centralizada de Jax/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /^Ampliação de/ })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * T-53. Em tela de toque a faixa de ações do tile deixou de aparecer sozinha
   * por cima da arte, e o caminho passou a ser a ampliação: por isso ela precisa
   * ter a ficha e as duas formas de baixar, e não só a arte grande.
   */
  it("traz a ficha e as duas formas de baixar", () => {
    render(<PainelDoCampeao champion={JAX} skins={SKINS} assets={ARTES} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar Jax_000_splash_centered.jpg" }));

    const ampliacao = screen.getByRole("dialog", { name: /^Ampliação de Splash centralizada de Jax/ });
    expect(within(ampliacao).getByText(/1280×720/)).toBeTruthy();
    expect(within(ampliacao).getByRole("button", { name: "Baixar original" })).toBeTruthy();
    expect(within(ampliacao).getByRole("button", { name: "Baixar PNG" })).toBeTruthy();
    expect(within(ampliacao).getByRole("button", { name: "Copiar link" })).toBeTruthy();
  });
});

// --- as miniaturas da bandeja ----------------------------------------------------------------

describe("a bandeja mostra o que foi selecionado", () => {
  function lote(quantos: number) {
    const assets = Array.from({ length: quantos }, (_, i) =>
      asset("tile", { id: `tile:${i}`, fileName: `t${i}.jpg`, sourceUrl: `https://exemplo.invalido/t${i}.jpg` }),
    );
    return render(<BarraDeLote assets={assets} onLimpar={() => {}} />);
  }

  it("uma miniatura por arquivo selecionado", () => {
    const { container } = lote(3);
    expect(container.querySelectorAll("[data-miniatura]")).toHaveLength(3);
  });

  it("acima de cinco, as cinco primeiras e quantas faltam", () => {
    const { container } = lote(8);
    expect(container.querySelectorAll("[data-miniatura]")).toHaveLength(5);
    expect(screen.getByText("+3")).toBeTruthy();
  });
});
