import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { categoriasDisponiveis } from "@/lib/categorias";

import { ProvedorDeNavegacao, useNavegacao } from "./navegacao-context";
import { Rodape } from "./rodape";

/**
 * A barra lateral fora da home (T-50).
 *
 * Desde o T-41 as categorias moram na barra, e a barra está em toda página. Na
 * página Sobre, clicar em "Itens" marcava a categoria e deixava a pessoa na
 * Sobre — nada mudava na tela. Fora da home, cada categoria é um link para ela.
 */

const caminho = vi.hoisted(() => ({ atual: "/" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => caminho.atual }));

afterEach(() => {
  cleanup();
  caminho.atual = "/";
});

const SHARDS = [{ category: "champion" }, { category: "item", assets: 868 }, { category: "rune" }];

function Registra() {
  const { registrar } = useNavegacao();
  useEffect(() => registrar(categoriasDisponiveis(SHARDS), 173), [registrar]);
  return null;
}

function Aberta() {
  const { aberta } = useNavegacao();
  return <output aria-label="Aberta">{aberta ?? "campeões"}</output>;
}

function montar() {
  return render(
    <ProvedorDeNavegacao>
      <Registra />
      <Rodape />
      <Aberta />
    </ProvedorDeNavegacao>,
  );
}

describe("as categorias da barra", () => {
  it("na home, são botões que marcam a categoria", () => {
    montar();
    const nav = screen.getByRole("navigation", { name: "Categorias" });
    fireEvent.click(within(nav).getByRole("button", { name: "Itens" }));
    expect(within(nav).getByRole("button", { name: "Itens" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(nav).queryAllByRole("link")).toHaveLength(0);
  });

  it("fora da home, são links para ela, e o clique já escolhe a categoria", () => {
    caminho.atual = "/sobre";
    montar();
    const nav = screen.getByRole("navigation", { name: "Categorias" });
    expect(within(nav).queryAllByRole("button")).toHaveLength(0);

    const itens = within(nav).getByRole("link", { name: "Itens" });
    expect(itens.getAttribute("href")).toBe("/");
    fireEvent.click(itens);
    expect(screen.getByRole("status", { name: "Aberta" }).textContent).toBe("item");
  });

  it("fora da home, nenhuma categoria aparece marcada", () => {
    caminho.atual = "/sobre";
    montar();
    const nav = screen.getByRole("navigation", { name: "Categorias" });
    expect(nav.querySelector("[data-ativa]")).toBeNull();
  });
});

/**
 * T-94: quem abre a página Sobre direto via a barra com "Campeões" e mais nada —
 * a lista vinha do manifesto que só a home carregava. Fora da home, a barra
 * busca o manifesto sozinha.
 */
describe("a Sobre aberta direto", () => {
  const MANIFESTO = {
    currentVersion: "16.19.1",
    versions: [
      {
        gameVersion: "16.19.1",
        catalog: { champions: 173 },
        shards: [{ category: "item", assets: 870 }, { category: "rank", assets: 10 }, { category: "position", assets: 5 }],
      },
    ],
  };

  afterEach(() => vi.unstubAllGlobals());

  it("busca o manifesto e mostra cada categoria como link para a home", async () => {
    caminho.atual = "/sobre";
    const pedidos: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        pedidos.push(url);
        return { ok: true, json: async () => MANIFESTO };
      }),
    );
    render(
      <ProvedorDeNavegacao>
        <Rodape />
      </ProvedorDeNavegacao>,
    );
    const categorias = screen.getByRole("navigation", { name: "Categorias" });
    const rotas = await within(categorias).findByRole("link", { name: /Rotas/ });
    expect(rotas.getAttribute("href")).toBe("/");
    expect(within(categorias).getByRole("link", { name: /Ranks/ })).toBeTruthy();
    expect(within(categorias).getByRole("link", { name: /Itens/ })).toBeTruthy();
    expect(pedidos).toEqual(["/indice/manifest.json"]);
  });

  it("na home, não busca nada: quem registra é a página", () => {
    const busca = vi.fn();
    vi.stubGlobal("fetch", busca);
    montar();
    expect(busca).not.toHaveBeenCalled();
  });

  it("sem rede, fica como antes: só Campeões", async () => {
    caminho.atual = "/sobre";
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    render(
      <ProvedorDeNavegacao>
        <Rodape />
      </ProvedorDeNavegacao>,
    );
    await Promise.resolve();
    const categorias = screen.getByRole("navigation", { name: "Categorias" });
    expect(within(categorias).getAllByRole("link").map((l) => l.textContent)).toEqual(["Campeões"]);
  });
});
