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
    expect(nav.querySelector(".bg-superficie-alta")).toBeNull();
  });
});
