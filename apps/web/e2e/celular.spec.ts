import type { Page } from "@playwright/test";

import { AGORA_NA_FIXTURE, expect, test } from "./base";

/**
 * O T-49: o site num telefone, com toque.
 *
 * O jsdom não aplica CSS, e quase tudo aqui é CSS: a faixa do topo que encolhe,
 * os avisos da Riot que trocam de lugar, o painel em tela cheia, o alvo de toque
 * de 44 px. Só um navegador de verdade mede isso.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function irParaHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
}

/** Rola até o fim o contêiner que rola e contém o elemento. */
async function rolarAteOFim(page: Page, seletor: string) {
  await page.evaluate((s) => {
    let el = document.querySelector(s)?.parentElement ?? null;
    while (el && !(el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== "visible")) {
      el = el.parentElement;
    }
    if (el) el.scrollTop = el.scrollHeight;
  }, seletor);
}

test("a faixa do topo ocupa menos de 200 px, com as categorias numa linha só (critério 1)", async ({
  page,
}) => {
  await irParaHome(page);
  // A fixture tem poucas categorias e poucas funções, e as duas linhas cabem em
  // 390 px. O índice real não cabe: alargar um botão de cada uma reproduz isso.
  await page.evaluate(() => {
    const largo = document.createTextNode(` ${"—".repeat(40)}`);
    document.querySelector("nav[aria-label='Categorias'] button")?.append(largo);
    document.querySelector("fieldset label")?.append(largo.cloneNode());
  });
  // Eram 274 px antes do T-49 — um terço da tela antes da busca.
  const faixa = await page.locator("aside").boundingBox();
  expect(faixa?.height).toBeLessThan(200);

  // E as linhas que rolam de lado não alargam a página. Duas vezes isso
  // aconteceu: a coluna implícita do grid crescia até a linha das categorias, e
  // a caixa escondida de cada função escapava da linha dela. O telefone
  // mostrava o site inteiro reduzido.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  const topos = await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("button")
    .evaluateAll((botoes) => botoes.map((b) => Math.round(b.getBoundingClientRect().top)));
  expect(new Set(topos).size, "as categorias quebraram em mais de uma linha").toBe(1);
});

test("os avisos da Riot saem da faixa do topo e ficam no fim da home, inteiros", async ({ page }) => {
  await irParaHome(page);
  await expect(page.locator("aside [data-aviso]:visible")).toHaveCount(0);

  await rolarAteOFim(page, "[data-avisos='fim']");
  for (const qual of ["riot", "jibber-jabber"]) {
    const aviso = page.locator(`[data-avisos='fim'] [data-aviso='${qual}']`);
    await expect(aviso).toBeInViewport();
    const cortado = await aviso.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(cortado, `o aviso ${qual} foi cortado`).toBe(false);
  }

  // Depois da grade, e não no meio dela.
  const [grade, avisos] = await Promise.all([
    page.getByRole("list", { name: "Campeões" }).boundingBox(),
    page.locator("[data-avisos='fim']").boundingBox(),
  ]);
  expect(avisos!.y).toBeGreaterThanOrEqual(grade!.y + grade!.height - 1);
});

test("numa categoria grande, os avisos vêm depois do último tile", async ({ page }) => {
  await irParaHome(page);
  await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
  const scroller = page.locator("[data-virtual='sim']");
  await expect(scroller.locator("article").first()).toBeVisible();

  await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(scroller.locator("[data-avisos='fim'] [data-aviso='riot']")).toBeInViewport();
});

test("o painel do campeão ocupa a tela toda, com alvos de toque de 44 px", async ({ page }) => {
  await irParaHome(page);
  await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
  const painel = page.getByRole("dialog", { name: "Painel de Jax" });
  await expect(painel).toBeVisible();

  expect((await painel.boundingBox())?.width).toBe(390);

  const fechar = await painel.getByRole("button", { name: "Fechar", exact: true }).boundingBox();
  expect(fechar!.width).toBeGreaterThanOrEqual(44);
  expect(fechar!.height).toBeGreaterThanOrEqual(44);

  const baixar = painel.getByRole("button", { name: "Baixar original" }).first();
  await expect(baixar).toBeVisible();
  expect((await baixar.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // A bandeja cabe: o botão do zip saía cortado, lado a lado com o resumo.
  await painel.getByRole("button", { name: /^Tudo de Jax/ }).click();
  const zip = await painel.getByRole("button", { name: /como zip/ }).boundingBox();
  expect(zip!.x + zip!.width).toBeLessThanOrEqual(390);
});

/**
 * O T-55: o terceiro passo de densidade, com alvo de toque de verdade — no
 * telefone, "densa" e "confortável" davam as mesmas duas colunas.
 */
test("o controle de densidade é alvo de toque, e tem o terceiro passo", async ({ page }) => {
  await irParaHome(page);
  const compacta = page.getByRole("button", { name: "Grade compacta" });
  await expect(compacta).toBeVisible();
  const alvo = await compacta.boundingBox();
  expect(Math.min(alvo!.width, alvo!.height)).toBeGreaterThanOrEqual(44);
});

/**
 * O T-55. Dentro de uma categoria havia dois campos empilhados — a busca global
 * ("Campeão ou skin") e o filtro da categoria ("Nome ou arquivo") —, 56 px do
 * topo gastos sem dizer qual era qual. No telefone fica o da categoria; um toque
 * em "Voltar aos campeões" traz a busca global de volta.
 */
test("dentro de uma categoria há um campo de busca só", async ({ page }) => {
  await irParaHome(page);
  await expect(page.getByRole("combobox")).toBeVisible();

  await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
  await expect(page.getByLabel("Filtrar por texto")).toBeVisible();
  await expect(page.getByRole("combobox")).toBeHidden();

  await page.getByRole("button", { name: "Voltar aos campeões" }).click();
  await expect(page.getByRole("combobox")).toBeVisible();
});

/**
 * O T-53. Sem *hover*, o T-48 deixava a faixa de ações sempre à vista: num tile
 * de ícone de 64 px, "Original", "PNG" e o copiar cobriam a arte inteira o tempo
 * todo. Agora o caminho do toque é tocar na arte e baixar da ampliação.
 */
test("na galeria, as ações não ficam por cima da arte", async ({ page }) => {
  await irParaHome(page);
  await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
  const tile = page.locator("article").first();
  await expect(tile).toBeVisible();

  // Desde o T-60 as ações nem entram no DOM sem apontar — e no toque não há o
  // que apontar. Mais forte que a opacidade 0 que este teste pedia no T-53: não
  // há botão nenhum por cima da arte.
  await expect(tile.getByRole("button", { name: "Baixar original" })).toHaveCount(0);

  // E o caminho continua existindo, com alvo de toque de verdade.
  await tile.getByRole("button", { name: /^Ampliar / }).click();
  const ampliacao = page.getByRole("dialog", { name: /^Ampliação de/ });
  const baixar = ampliacao.getByRole("button", { name: "Baixar original" });
  await expect(baixar).toBeVisible();
  expect((await baixar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

/**
 * T-66. Os chips de filtro e os botões da barra têm 28 px à vista; o dedo
 * precisa de 44. Um toque 20 px acima ou abaixo do centro ainda tem que cair
 * no controle — inclusive nas linhas que rolam de lado, que cortariam a área.
 */
async function alvosQueNaoPegam(page: Page, seletor: string) {
  return page.locator(seletor).evaluateAll((alvos) =>
    alvos.flatMap((alvo) => {
      const r = alvo.getBoundingClientRect();
      // Só o que está inteiro à vista — na tela e dentro da linha que rola de
      // lado, se houver uma. O resto a pessoa rola até ver.
      let rolante = alvo.parentElement;
      while (rolante && getComputedStyle(rolante).overflowX === "visible") rolante = rolante.parentElement;
      const caixa = rolante?.getBoundingClientRect() ?? { left: 0, right: innerWidth };
      const esquerda = Math.max(0, caixa.left);
      const direita = Math.min(innerWidth, caixa.right);
      if (r.width === 0 || r.left < esquerda || r.right > direita) return [];
      const x = r.left + r.width / 2;
      const centro = r.top + r.height / 2;
      return [centro - 20, centro + 20].flatMap((y) => {
        const achado = document.elementFromPoint(x, y);
        return achado && alvo.contains(achado) ? [] : [`${alvo.textContent?.trim()} em y=${Math.round(y)}`];
      });
    }),
  );
}

test("os chips e os botões dos filtros têm 44 px de toque, sem crescer à vista", async ({ page }) => {
  await irParaHome(page);
  const chips = "fieldset label";
  expect(await alvosQueNaoPegam(page, chips)).toEqual([]);
  // À vista continuam com 28 px: a linha não empurra a grade para baixo.
  expect((await page.locator(chips).first().boundingBox())!.height).toBe(28);

  await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
  await expect(page.locator("[data-virtual='sim'] article").first()).toBeVisible();
  expect(await alvosQueNaoPegam(page, "fieldset label")).toEqual([]);
  for (const nome of ["Mais filtros", "Mostrar tudo", "Selecionar os"]) {
    expect(await alvosQueNaoPegam(page, `button:has-text("${nome}")`), nome).toEqual([]);
  }
});

test("a página que não existe também tem os dois avisos", async ({ page }) => {
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  for (const qual of ["riot", "jibber-jabber"]) {
    await expect(page.locator(`[data-aviso='${qual}']:visible`)).toHaveCount(1);
  }
});

test.describe("com o índice velho", () => {
  test.use({ viewport: { width: 375, height: 720 } });

  test("a lista de uma categoria continua mostrando tiles (critério 3)", async ({ page }) => {
    // Dez dias depois da fixture: o aviso de índice velho acende. Em 14/09, com
    // ele na tela, a categoria ficou sem nenhuma linha à vista (#54).
    await page.clock.setFixedTime(new Date(AGORA_NA_FIXTURE.getTime() + 10 * 24 * 60 * 60 * 1000));
    await irParaHome(page);
    await expect(page.locator("[data-indice='velho']")).toBeVisible();

    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    const scroller = page.locator("[data-virtual='sim']");
    await expect(scroller.locator("article").first()).toBeInViewport();
    expect(await scroller.evaluate((el) => el.clientHeight)).toBeGreaterThan(150);
  });
});
