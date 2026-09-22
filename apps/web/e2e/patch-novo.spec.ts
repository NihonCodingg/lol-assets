import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./base";

/**
 * T-77: o aviso de patch mais novo que o índice. A lista de patches vem da
 * fixture (`NEXT_PUBLIC_VERSIONS_URL`); aqui a rota a troca por uma com patch
 * novo, sem tocar o ddragon de verdade.
 */

const SALTOS = `
  window.__saltos = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__saltos += e.value;
  }).observe({ type: "layout-shift", buffered: true });
`;

test("com o índice no patch mais novo, não aparece nada", async ({ page }) => {
  const pedidas: string[] = [];
  page.on("request", (r) => pedidas.push(r.url()));
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  // A lista é pedida depois de a página assentar.
  await expect.poll(() => pedidas.some((u) => u.endsWith("/versions.json")), { timeout: 8000 }).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-patch='novo']")).toHaveCount(0);
});

test("com patch novo, avisa no canto sem empurrar nada, e a dispensa vale até o próximo", async ({
  page,
}) => {
  await page.route("**/versions.json", (rota) =>
    rota.fulfill({ json: ["16.19.1", "16.18.1"], headers: { "access-control-allow-origin": "*" } }),
  );
  await page.addInitScript(SALTOS);
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();

  const aviso = page.locator("[data-patch='novo']");
  await expect(aviso).toBeVisible({ timeout: 8000 });
  await expect(aviso).toContainText("Já saiu o patch 16.19.1");
  await expect(aviso).toContainText("16.18.1");
  // Fixo no canto: a grade não se mexeu quando ele chegou (T-59).
  expect(await page.evaluate(() => (window as unknown as { __saltos: number }).__saltos)).toBeLessThanOrEqual(
    0.02,
  );
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await aviso.getByRole("button", { name: "Dispensar o aviso" }).click();
  await expect(aviso).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(aviso).toHaveCount(0);
});
