import type { Page } from "@playwright/test";

import { expect, test } from "./base";

/**
 * O que a pessoa sente na chegada, com número (T-59).
 *
 * Estes testes existem porque a medição na produção de 18/09/2026 mostrou o
 * contrário do que o código prometia: a home pintava o primeiro tile em 1,5 s e
 * **saltava 0,16** quando o catálogo chegava — a barra lateral nascia sem as
 * categorias e as empurrava para baixo 1,6 s depois.
 *
 * O `layout-shift` é observado antes de qualquer script da página; o teste falha
 * se alguém devolver o salto.
 */

declare global {
  interface Window {
    /** Soma dos saltos de layout desde a chegada, sem os que vieram de clique. */
    __saltos: number;
  }
}

const OBSERVAR_SALTOS = `
  window.__saltos = 0;
  new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__saltos += e.value;
  }).observe({ type: "layout-shift", buffered: true });
`;

async function chegar(page: Page) {
  await page.addInitScript(OBSERVAR_SALTOS);
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  // Um respiro para o catálogo chegar e a barra se completar: é justamente aí
  // que o salto acontecia.
  await page.waitForTimeout(1500);
}

test("a chegada não salta: a barra lateral já nasce com o lugar das categorias", async ({ page }) => {
  await chegar(page);
  const salto = await page.evaluate(() => window.__saltos);
  expect(salto, "a tela saltou na chegada").toBeLessThanOrEqual(0.02);
});

test("as categorias chegam sem empurrar o que está embaixo delas", async ({ page }) => {
  // O manifesto atrasa de propósito: é a janela em que a barra ficava vazia.
  await page.route("**/indice/manifest.json", async (rota) => {
    await new Promise((r) => setTimeout(r, 1200));
    await rota.continue();
  });
  await page.addInitScript(OBSERVAR_SALTOS);
  await page.goto("/", { waitUntil: "commit" });

  // O que fica **abaixo** da lista: as seções do projeto e, no computador, os
  // avisos da Riot. Era isso que descia 277 px quando o catálogo chegava.
  const topoDasSecoes = () =>
    page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Seções"]');
      return nav ? Math.round(nav.getBoundingClientRect().top) : null;
    });

  await expect.poll(topoDasSecoes).not.toBeNull();
  // Só mede depois do CSS: o teste começa no `commit`, e com a máquina
  // carregada (a suíte inteira em paralelo) a primeira leitura saía do layout
  // sem estilo — as seções a 77 px, numa tela que o navegador nunca pinta. O
  // salto que se vê é o do `__saltos`, que o navegador mede, logo abaixo.
  await page.waitForFunction(() => getComputedStyle(document.body).display === "grid");
  const antes = await topoDasSecoes();

  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  await page.waitForTimeout(800);
  const depois = await topoDasSecoes();

  expect(Math.abs((depois ?? 0) - (antes ?? 0)), `seções em ${antes}px e depois ${depois}px`).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.__saltos)).toBeLessThanOrEqual(0.02);
});

test("o esqueleto tem a mesma árvore da tela pronta", async ({ page }) => {
  await page.route("**/indice/manifest.json", async (rota) => {
    await new Promise((r) => setTimeout(r, 1000));
    await rota.continue();
  });
  await page.goto("/", { waitUntil: "commit" });

  // Carregando: a barra de filtro falsa mora dentro do bloco que rola, e o
  // bloco é o mesmo `[data-conteudo]` da tela pronta.
  const topoDoConteudoCarregando = page.locator("[data-conteudo]");
  await expect(topoDoConteudoCarregando).toBeVisible();
  const topoDoEsqueleto = await topoDoConteudoCarregando.evaluate((e) =>
    Math.round(e.getBoundingClientRect().top),
  );

  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  await page.waitForTimeout(600);
  const topoDoConteudo = await page.evaluate(() => {
    const conteudo = document.querySelector("#conteudo");
    return conteudo ? Math.round(conteudo.getBoundingClientRect().top) : null;
  });
  expect(topoDoConteudo).not.toBeNull();

  expect(topoDoEsqueleto).not.toBeNull();
  expect(Math.abs((topoDoConteudo ?? 0) - (topoDoEsqueleto ?? 0))).toBeLessThanOrEqual(2);
});

/**
 * T-61. A fatia de campeão chegava só depois do clique, e o painel abria vazio
 * esperando por ela — mediana de 816 ms do clique até a arte, medida na
 * produção. Agora ela vem no primeiro sinal de intenção. Desde o T-73 (ADR 0023)
 * cada campeão tem a sua fatia, e a intenção é por um campeão: o ponteiro que
 * para no cartão dele.
 */
test("parar o ponteiro num cartão adianta a fatia daquele campeão; só abrir a home, não", async ({
  page,
}) => {
  const pedidas: string[] = [];
  page.on("request", (requisicao) => pedidas.push(requisicao.url()));
  const deCampeao = () => pedidas.filter((url) => url.includes("index-champion"));

  await page.goto("/");
  const grade = page.getByRole("list", { name: "Campeões" });
  await expect(grade).toBeVisible();
  await page.waitForTimeout(500);
  // RNF-03: abrir a home não busca fatia nenhuma.
  expect(deCampeao()).toEqual([]);

  const jax = grade.getByRole("button", { name: /^Jax/ });
  await jax.hover();
  await expect.poll(deCampeao).toHaveLength(1);
  expect(deCampeao()[0]).toContain("index-champion-24-");

  // E o clique usa a mesma fatia: nenhum segundo pedido, e nada da Lux.
  await jax.click();
  await expect(page.getByRole("dialog", { name: "Painel de Jax" }).locator("article").first()).toBeVisible();
  expect(deCampeao()).toHaveLength(1);
});

