import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatalogChampion } from "@lol-assets/schema";

import { GradeDeCampeoes } from "./grade-de-campeoes";

/**
 * O tile do T-81: hover parado, download rápido do square, tecla D e arrasto. O
 * hover mora numa sobreposição só para a grade inteira (`acoes-do-tile.tsx`).
 */

const baixarSquare = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/download-rapido", async (original) => ({
  ...(await original<typeof import("@/lib/download-rapido")>()),
  baixarSquare,
}));

afterEach(() => {
  cleanup();
  baixarSquare.mockClear();
});

const JAX = {
  championKey: 24,
  championId: "Jax",
  names: { pt_BR: "Jax", en_US: "Jax" },
  skinCount: 18,
  baseSkinId: 24000,
  thumbnailUrl: "https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/Jax.png",
  tags: ["Fighter"],
} as unknown as CatalogChampion;

function montar() {
  const onAbrir = vi.fn();
  const { container } = render(<GradeDeCampeoes champions={[JAX]} onAbrir={onAbrir} />);
  const tile = within(screen.getByRole("list", { name: "Campeões" })).getByRole("listitem");
  const cartao = within(tile).getByRole("button", { name: /^Jax/ });
  return { onAbrir, tile, cartao, container };
}

/** O ponteiro do mouse para em cima do tile. */
function passarPorCima(cartao: HTMLElement) {
  fireEvent.pointerEnter(cartao, { pointerType: "mouse" });
}

describe("o tile", () => {
  it("no hover, surge o download rápido do square, com nome que diz o que baixa", () => {
    const { cartao, onAbrir } = montar();
    expect(screen.queryByRole("button", { name: /^Baixar o square/ })).toBeNull();
    passarPorCima(cartao);
    fireEvent.click(screen.getByRole("button", { name: "Baixar o square de Jax (PNG)" }));
    expect(baixarSquare).toHaveBeenCalledTimes(1);
    expect(onAbrir).not.toHaveBeenCalled();
  });

  it("o download rápido não é parada de Tab: a grade continua uma parada só", () => {
    const { cartao } = montar();
    passarPorCima(cartao);
    expect(screen.getByRole("button", { name: /^Baixar o square/ }).tabIndex).toBe(-1);
  });

  it("uma sobreposição só: o hover não cria nada dentro dos tiles", () => {
    const { tile, cartao, container } = montar();
    passarPorCima(cartao);
    expect(container.querySelectorAll("[data-acoes-do-tile]")).toHaveLength(1);
    expect(tile.querySelector("[data-acoes-do-tile]")).toBeNull();
  });

  it("sair da grade com o ponteiro esconde a sobreposição", () => {
    const { cartao, container } = montar();
    passarPorCima(cartao);
    fireEvent.pointerLeave(container.querySelector("[data-grade-com-acoes]")!, { pointerType: "mouse" });
    expect(container.querySelector("[data-acoes-do-tile]")).toBeNull();
  });

  it("a tecla D no tile focado baixa o square; o clique abre", () => {
    const { cartao, onAbrir } = montar();
    expect(cartao.getAttribute("aria-keyshortcuts")).toBe("D");
    fireEvent.keyDown(cartao, { key: "d" });
    expect(baixarSquare).toHaveBeenCalledTimes(1);
    fireEvent.click(cartao);
    expect(onAbrir).toHaveBeenCalledWith(JAX);
  });

  it("Ctrl+D não é o download rápido: é do navegador", () => {
    const { cartao } = montar();
    fireEvent.keyDown(cartao, { key: "d", ctrlKey: true });
    expect(baixarSquare).not.toHaveBeenCalled();
  });

  it("arrastar o tile entrega o square pelo DownloadURL", () => {
    const { cartao } = montar();
    const dados = new Map<string, string>();
    const dataTransfer = { setData: (t: string, v: string) => dados.set(t, v), effectAllowed: "all" };
    fireEvent.dragStart(cartao, { dataTransfer });
    expect(dados.get("DownloadURL")).toBe(`image/png:Jax_square.png:${JAX.thumbnailUrl}`);
  });

  it("o foco do teclado mostra as marcas de corte, como o hover", () => {
    const { cartao, container } = montar();
    expect(container.querySelector("[data-marcas-de-corte]")).toBeNull();
    fireEvent.focus(cartao);
    expect(container.querySelector("[data-marcas-de-corte='dentro']")!.getAttribute("aria-hidden")).toBe("true");
  });
});
