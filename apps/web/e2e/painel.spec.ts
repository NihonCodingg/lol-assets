import type { Page } from "@playwright/test";

import { expect, test } from "./base";

/**
 * O painel do campeão como vitrine (T-47), num navegador de verdade.
 *
 * O jsdom não move a seleção de um grupo de rádios com as setas, e não carrega
 * imagem nenhuma: é aqui que se prova que o teclado troca de skin, que a vitrine
 * acompanha, e que sobrou um fechar só.
 */

async function abrirJax(page: Page) {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Campeões" })
    .getByRole("button", { name: /^Jax\b/ })
    .click();
  const painel = page.getByRole("region", { name: "Painel de Jax" });
  await expect(painel).toBeVisible();
  return painel;
}

test("as setas trocam de skin, e a vitrine e as artes acompanham", async ({ page }) => {
  await abrirJax(page);
  const base = page.getByRole("radio", { name: "Jax", exact: true });
  await expect(base).toBeChecked();

  await base.focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByRole("radio", { name: "Jax Deus da Guerra" })).toBeChecked();
  // O título da vitrine é o único `h2` com o nome da skin; os cartões das artes
  // repetem o nome em `h3`.
  await expect(
    page.getByRole("heading", { level: 2, name: "Jax Deus da Guerra", exact: true }),
  ).toBeVisible();
  await expect(page.locator('article[aria-label="Jax_007_splash_centered.jpg"]')).toBeVisible();
  await expect(page.locator('img[data-vitrine="splash"]')).toHaveAttribute(
    "src",
    /Jax_007_splash_centered/,
  );
});

test("sobrou um fechar só, e ele fecha", async ({ page }) => {
  const painel = await abrirJax(page);
  await expect(page.getByRole("button", { name: /fechar/i })).toHaveCount(1);

  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(painel).toBeHidden();
});

test("a prévia amplia a arte, e o Escape fecha só a ampliação (T-47b)", async ({ page }) => {
  const painel = await abrirJax(page);
  await page.getByRole("button", { name: "Ampliar Jax_000_splash_centered.jpg" }).click();

  const ampliacao = page.getByRole("dialog", { name: /^Ampliação de/ });
  await expect(ampliacao).toBeVisible();
  await expect(ampliacao.locator("img[data-ampliacao]")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(ampliacao).toBeHidden();
  await expect(painel).toBeVisible();
});

/**
 * O T-58. Medido na produção em 1440×900: a vitrine ocupava 455 px dos 900 do
 * painel, e sobravam **três** cartões à vista para dez artes — uma fileira.
 */
test("no computador, a vitrine divide o painel com as artes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const painel = await abrirJax(page);

  const vitrine = await painel.locator("div.aspect-video").first().boundingBox();
  expect(vitrine!.height).toBeLessThanOrEqual(0.42 * 900);

  // E o nome de cada skin na faixa cabe numa linha só, com o inteiro no title.
  const nome = painel.getByRole("radio", { name: "Jax Deus da Guerra" });
  await expect(nome).toBeAttached();
  const linhas = await painel
    .locator("[data-skin] span")
    .first()
    .evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
  expect(linhas).toBe(1);
});
