import type { Page } from "@playwright/test";

import { expect, test } from "./base";

/**
 * A densidade da grade (T-40, fechado no T-46), contada em colunas de verdade.
 *
 * O vitest não faz layout, e lá só dá para ver que a largura-alvo mudou. Aqui o
 * navegador resolve o `auto-fill` e diz quantas colunas couberam — mesmo com os
 * dois campeões da fixture, porque trilha vazia também é coluna.
 */

async function colunas(page: Page): Promise<number> {
  return page
    .getByRole("list", { name: "Campeões" })
    .evaluate((lista) => getComputedStyle(lista).gridTemplateColumns.split(" ").length);
}

test("alternar a densidade muda o número de colunas, e a escolha sobrevive a recarregar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  const densa = await colunas(page);

  await page.getByRole("button", { name: "Grade confortável" }).click();
  const confortavel = await colunas(page);
  expect(confortavel).toBeLessThan(densa);

  await page.reload();
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  expect(await colunas(page)).toBe(confortavel);
});
