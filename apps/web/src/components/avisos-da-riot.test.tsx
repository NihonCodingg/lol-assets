import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import NaoEncontrada from "@/app/not-found";
import { siteConfig } from "@/lib/site-config";

import { AvisosDaRiot, AvisosNoFim } from "./avisos-da-riot";
import { Rodape } from "./rodape";

/**
 * RF-21 depois do T-49: os dois avisos saíram da faixa do topo do telefone e
 * foram para o fim de cada página. O jsdom não aplica CSS — quem prova qual cópia
 * aparece em cada largura é o `e2e/celular.spec.ts`. Aqui se prova que as duas
 * cópias são as mesmas, literais, e que nenhuma página ficou sem.
 */

afterEach(cleanup);

function avisos(raiz: ParentNode) {
  return {
    riot: raiz.querySelector("[data-aviso='riot']"),
    jibber: raiz.querySelector("[data-aviso='jibber-jabber']"),
  };
}

describe("os avisos da Riot", () => {
  it("vêm literais e em inglês, em qualquer lugar onde apareçam", () => {
    const { container } = render(<AvisosDaRiot />);
    const { riot, jibber } = avisos(container);
    expect(riot?.textContent).toBe(siteConfig.riotLegalNotice);
    expect(jibber?.textContent).toBe(siteConfig.riotJibberJabberNotice);
    expect(riot?.getAttribute("lang")).toBe("en");
    expect(jibber?.getAttribute("lang")).toBe("en");
  });

  it("a cópia do fim da página é só do telefone; a da barra lateral, só do computador", () => {
    const { container: fim } = render(<AvisosNoFim />);
    expect(fim.firstElementChild?.className).toMatch(/\bmd:hidden\b/);
    cleanup();

    const { container: barra } = render(<Rodape />);
    const rodape = barra.querySelector("[data-aviso='riot']")?.closest("footer");
    expect(rodape?.className).toMatch(/\bhidden\b/);
    expect(rodape?.className).toMatch(/\bmd:block\b/);
  });

  it("a página que não existe também os tem, e leva de volta ao catálogo", () => {
    const { container } = render(<NaoEncontrada />);
    const { riot, jibber } = avisos(container);
    expect(riot).not.toBeNull();
    expect(jibber).not.toBeNull();
    expect(screen.getByRole("link", { name: "Voltar ao catálogo" }).getAttribute("href")).toBe("/");
  });
});
