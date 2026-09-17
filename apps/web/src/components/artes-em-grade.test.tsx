import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Asset, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { BarraDeLote } from "./barra-de-lote";
import { PainelDeAsset } from "./painel-de-asset";
import { PainelDoCampeao } from "./painel-do-campeao";
import { ParDeDownload } from "./ui/par-de-download";

/**
 * O T-47b: as artes do painel do campeão em grade, a ampliação, o retorno do
 * download e as miniaturas da bandeja.
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
  asset("ability_icon", { id: "ability_icon:q" }),
];

function grade() {
  const baixar = vi.fn().mockResolvedValue(undefined);
  const onAmpliar = vi.fn();
  render(
    <PainelDeAsset
      titulo="Artes de Jax"
      assets={ARTES}
      onClose={() => {}}
      baixar={baixar}
      copiar={vi.fn().mockResolvedValue(undefined)}
      embutido
      grade
      onAmpliar={onAmpliar}
    />,
  );
  return { baixar, onAmpliar };
}

// --- a grade ------------------------------------------------------------------------------

describe("a grade do painel do campeão", () => {
  it("agrupa as artes por família, cada uma com o seu cabeçalho", () => {
    grade();
    expect(screen.getByRole("heading", { level: 3, name: /Splash e tela de carregamento/ })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: /Retratos/ })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: /Passiva e habilidades/ })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(ARTES.length);
  });

  it("uma família só não ganha cabeçalho — seria o nome da lista repetido", () => {
    render(
      <PainelDeAsset
        titulo="Chromas de Jax"
        assets={[asset("chroma", { id: "chroma:9", skinNum: 9 })]}
        onClose={() => {}}
        embutido
        grade
      />,
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("a ficha está à vista antes de qualquer clique (RF-09)", () => {
    grade();
    const cartao = screen.getByLabelText("Jax_000_splash_centered.jpg");
    expect(within(cartao).getByText(/1280×720/)).toBeTruthy();
  });

  it("ícone menor que a caixa não é esticado: a prévia para no tamanho do arquivo", () => {
    grade();
    const icone = screen
      .getByLabelText("Jax_ability_icon.png")
      .querySelector("img[data-previa]") as HTMLImageElement;
    // O menor entre a caixa e o arquivo: cabe inteira, e nunca passa de 64 px.
    expect(icone.style.maxWidth).toBe("min(100%, 64px)");
    expect(icone.style.maxHeight).toBe("min(100%, 64px)");
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
    expect(screen.getByRole("dialog", { name: /^Ampliação de Jax/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /^Ampliação de/ })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
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
