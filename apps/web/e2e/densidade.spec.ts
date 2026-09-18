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

/**
 * O terceiro passo (T-55). No telefone, "densa" e "confortável" davam as mesmas
 * duas colunas: o controle aparecia e não mudava nada.
 */
test("no telefone, a compacta dá uma coluna a mais que a densa", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  const densa = await colunas(page);

  await page.getByRole("button", { name: "Grade compacta" }).click();
  expect(await colunas(page)).toBeGreaterThan(densa);
});

/**
 * A galeria das categorias (T-53).
 *
 * Antes, o tile de um ícone de 64 px tinha 176 px de largura porque era o que
 * "Original", "PNG" e o copiar pediam lado a lado: na produção davam **seis**
 * colunas em 1.232 px de lista, com a arte ocupando 13% do tile. Com as ações em
 * ícone, quem manda na largura é a arte.
 */
test("a galeria de ícones dá pelo menos nove colunas numa tela de 1440", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();

  const tiles = page.locator("article");
  await expect(tiles.first()).toBeVisible();
  const medidas = await tiles.first().evaluate((tile) => {
    const r = tile.getBoundingClientRect();
    const img = tile.querySelector("img");
    const ri = img?.getBoundingClientRect();
    return {
      largura: Math.round(r.width),
      altura: Math.round(r.height),
      arte: ri ? Math.round(ri.width * ri.height) : 0,
      area: Math.round(r.width * r.height),
    };
  });
  const porLinha = await tiles.evaluateAll((lista) => {
    const topo = Math.round(lista[0]!.getBoundingClientRect().top);
    return lista.filter((t) => Math.round(t.getBoundingClientRect().top) === topo).length;
  });

  expect(porLinha).toBeGreaterThanOrEqual(9);
  expect(medidas.largura).toBeLessThanOrEqual(130);
  // A arte deixou de ser um selo no meio da caixa: era 13% do tile.
  expect(medidas.arte / medidas.area).toBeGreaterThan(0.25);
});
