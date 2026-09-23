import { describe, expect, it, vi } from "vitest";

import type { CatalogChampion } from "@lol-assets/schema";

import { arrastarArquivo, baixarSquare, dadosDeArrasto, nomeDoSquare } from "./download-rapido";

const JAX = {
  championKey: 24,
  championId: "Jax",
  thumbnailUrl: "https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/Jax.png",
} as CatalogChampion;

describe("o download rápido do square (T-81)", () => {
  it("dá ao arquivo o nome que o índice dá ao square", () => {
    expect(nomeDoSquare(JAX)).toBe("Jax_square.png");
  });

  it("baixa o square do catálogo, salva com o nome e avisa com ele", async () => {
    const blob = new Blob(["png"]);
    // Uma resposta de mentira: `new Response(blob)` com o Blob do jsdom passa no
    // Windows e falha no Linux da CI — o Blob do jsdom não é o nativo.
    const buscar = vi.fn(async () => ({ ok: true, status: 200, blob: async () => blob }) as unknown as Response);
    const salvar = vi.fn();
    const avisar = vi.fn();
    expect(await baixarSquare(JAX, undefined, { buscar, salvar, avisar })).toBe(true);
    expect(buscar).toHaveBeenCalledWith(JAX.thumbnailUrl);
    expect(salvar.mock.calls[0][1]).toBe("Jax_square.png");
    expect(avisar).toHaveBeenCalledWith("Baixado: Jax_square.png");
  });

  it("quando a fonte falha, avisa a falha — e não diz que baixou", async () => {
    const avisar = vi.fn();
    const salvar = vi.fn();
    const buscar = async () => ({ ok: false, status: 503 }) as unknown as Response;
    expect(await baixarSquare(JAX, undefined, { buscar, salvar, avisar })).toBe(false);
    expect(salvar).not.toHaveBeenCalled();
    expect(avisar.mock.calls[0][0]).toMatch(/^Não deu para baixar Jax_square\.png/);
    expect(avisar.mock.calls[0][1]).toBe("falha");
  });
});

describe("o arrasto", () => {
  it("monta o DownloadURL do Chrome e do Edge: tipo, nome e URL", () => {
    expect(dadosDeArrasto(JAX.thumbnailUrl!, "Jax_square.png", "png")).toBe(
      `image/png:Jax_square.png:${JAX.thumbnailUrl}`,
    );
    expect(dadosDeArrasto("https://x/a.jpg", "a.jpg", "jpeg")).toMatch(/^image\/jpeg:/);
  });

  it("põe o arquivo e a URL no arrasto", () => {
    const dados = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "all",
      setData: (tipo: string, valor: string) => dados.set(tipo, valor),
    } as unknown as DataTransfer;
    arrastarArquivo({ dataTransfer }, JAX.thumbnailUrl!, "Jax_square.png", "png");
    expect(dados.get("DownloadURL")).toContain("Jax_square.png");
    expect(dados.get("text/uri-list")).toBe(JAX.thumbnailUrl);
    expect(dataTransfer.effectAllowed).toBe("copy");
  });
});
