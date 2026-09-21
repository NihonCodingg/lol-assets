import type { Page } from "@playwright/test";

import { expect, test } from "./base";

/**
 * T-70: o botão Voltar fecha a camada de cima, em vez de sair do site.
 *
 * Medido na produção em 21/09/2026: com o painel do campeão, uma categoria ou
 * uma ampliação aberta, Voltar levava para fora do site. No telefone o painel
 * ocupa a tela inteira, e Voltar é o gesto de fechar.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function chegar(page: Page) {
  // Uma página antes do site: é para onde um Voltar a mais levaria.
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
}

const noSite = (page: Page) => expect(page).not.toHaveURL("about:blank");

test("Voltar fecha o painel do campeão, e o próximo Voltar sai do site", async ({ page }) => {
  await chegar(page);
  await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
  const painel = page.getByRole("dialog", { name: "Painel de Jax" });
  await expect(painel).toBeVisible();

  await page.goBack();
  await expect(painel).toBeHidden();
  await noSite(page);
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("about:blank");
});

test("com a ampliação aberta no painel, Voltar fecha só a ampliação", async ({ page }) => {
  await chegar(page);
  await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
  const painel = page.getByRole("dialog", { name: "Painel de Jax" });
  await painel.getByRole("button", { name: /^Ampliar / }).first().click();
  const ampliacao = page.getByRole("dialog", { name: /^Ampliação de/ });
  await expect(ampliacao).toBeVisible();

  await page.goBack();
  await expect(ampliacao).toBeHidden();
  await expect(painel).toBeVisible();

  await page.goBack();
  await expect(painel).toBeHidden();
  await noSite(page);
});

test("Voltar sai da categoria e volta aos campeões", async ({ page }) => {
  await chegar(page);
  const categorias = page.getByRole("navigation", { name: "Categorias" });
  await categorias.getByRole("button", { name: "Itens" }).click();
  await expect(page.locator("[data-virtual='sim']")).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  await noSite(page);
});

test("fechar pelo × consome a entrada: o Voltar seguinte não fica mudo", async ({ page }) => {
  await chegar(page);
  await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
  const painel = page.getByRole("dialog", { name: "Painel de Jax" });
  await painel.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(painel).toBeHidden();

  // Um Voltar só, e se sai do site — sem um Voltar perdido no meio.
  await page.goBack();
  await expect(page).toHaveURL("about:blank");
});

test("Esc continua fechando o painel, e também consome a entrada", async ({ page }) => {
  await chegar(page);
  await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
  const painel = page.getByRole("dialog", { name: "Painel de Jax" });
  await expect(painel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(painel).toBeHidden();

  await page.goBack();
  await expect(page).toHaveURL("about:blank");
});
