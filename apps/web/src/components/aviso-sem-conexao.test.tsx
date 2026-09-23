import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvisoSemConexao } from "./aviso-sem-conexao";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("sem conexão (T-85)", () => {
  it("com conexão, a região existe e está vazia", () => {
    render(<AvisoSemConexao />);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("a conexão cai: avisa; volta: some", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(<AvisoSemConexao />);
    online.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status").textContent).toContain("Sem conexão.");
    online.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
