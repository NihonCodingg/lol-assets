import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, test } from "./base";

/**
 * Acessibilidade (T-28, RNF-11): teclado, `alt` e o que o axe pega sozinho.
 *
 * O axe cobre o que dá para automatizar — contraste, rótulo, papel, ordem de
 * cabeçalho — e **não** cobre o que importa mais aqui: se dá para completar o
 * J1 inteiro sem tocar no mouse. Por isso os dois tipos de teste convivem neste
 * arquivo, e o percurso por teclado vem primeiro.
 *
 * O contraste é o único critério que este ticket **não** fecha: a paleta chega
 * com o design (T-30). O que fica pronto aqui é a verificação, para que o design
 * chegue já sob ela.
 */

/**
 * Toda violação falha, de qualquer impacto, e o WCAG 2.2 e as boas práticas do
 * axe entram junto (T-64).
 *
 * Até o T-64 só sério e crítico falhavam, e só do WCAG 2.1. Medido em 18/09/2026
 * em 13 estados da tela, no computador e no telefone: a régua mais dura achava
 * **uma** violação — crítica, e numa tela que nenhum teste abria (a busca sem
 * resultado). Com o resto limpo, apertar custa nada e segura o que vier.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function violacoesDoAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // Sem isto, um axe que não rodou (seletor errado, página em branco, script que
  // não injetou) devolveria zero violações e o teste passaria feliz provando
  // nada. Uma página com conteúdo sempre tem dezenas de regras aprovadas.
  expect(resultado.passes.length, "o axe não analisou nada").toBeGreaterThan(5);

  return resultado.violations;
}

function resumir(violacoes: Awaited<ReturnType<typeof violacoesDoAxe>>): string {
  return violacoes
    .map((v) => `${v.impact}/${v.id}: ${v.help} (${v.nodes.length}x)\n  ${v.nodes[0]?.html ?? ""}`)
    .join("\n");
}

async function irParaHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
}

// --- critério 1: o J1 inteiro só com teclado -------------------------------------------

test.describe("só com teclado", () => {
  test("J1 completo: do carregamento ao arquivo salvo, sem mouse", async ({ page }) => {
    await irParaHome(page);

    // O RF-01 põe o foco na busca ao carregar; digitar já é o primeiro passo.
    await page.keyboard.type("jax");
    await expect(page.getByRole("option").first()).toBeVisible();

    // Enter no resultado abre o painel do campeão.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();

    // Tab até o botão de baixar do square, e Enter.
    const baixar = page
      .locator('article[aria-label="Jax_square.png"]')
      .getByRole("button", { name: "Baixar original" });
    await expect(baixar).toBeVisible();

    const download = page.waitForEvent("download");
    await baixar.focus();
    await page.keyboard.press("Enter");

    expect((await download).suggestedFilename()).toBe("Jax_square.png");
  });

  test("todo controle do painel é alcançável por Tab", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();

    // Percorre a ordem de foco e coleta o que ela alcança. 120 tabulações é
    // muito mais que o painel tem: o teste falharia por armadilha de foco antes.
    const alcancados = new Set<string>();
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press("Tab");
      const marca = await page.evaluate(() => {
        const foco = document.activeElement as HTMLElement | null;
        if (!foco || foco === document.body) return "";
        // O tipo entra na marca desde o T-47: o seletor de skin virou um grupo
        // de rádios, e rádio não tem `aria-label` nem texto próprio — o nome
        // dele vem do rótulo com o tile.
        const tipo = foco.getAttribute("type") ?? "";
        return `${foco.tagName}:${tipo}:${foco.getAttribute("aria-label") ?? foco.textContent?.trim().slice(0, 40) ?? ""}`;
      });
      if (marca) alcancados.add(marca);
    }

    expect([...alcancados].some((m) => m.includes("Baixar original"))).toBe(true);
    // O seletor de skin (T-47): o grupo de rádios é uma parada só no Tab.
    expect([...alcancados].some((m) => m.startsWith("INPUT:radio:"))).toBe(true);
    // Um fechar só desde o T-47: o "Fechar" do canto, com F maiúsculo.
    expect([...alcancados].some((m) => m.toLowerCase().includes("fechar"))).toBe(true);
  });

  test("Escape fecha o painel, como manda o padrão", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeHidden();
  });

  test("Escape funciona antes de a fatia chegar", async ({ page }) => {
    // O painel aparece antes dos assets. Um ouvinte que só existe depois deles
    // deixaria `Escape` sem efeito exatamente durante a espera — que é quando
    // alguém mais desiste.
    await irParaHome(page);
    await page.route("**/index-champion-*-e2e.json", async (rota) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await rota.continue();
    });

    await page.click('button:has-text("Jax")');
    await expect(page.getByText("Carregando as artes…")).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeHidden();
  });

  test("com chromas abertos, Escape fecha os chromas primeiro", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    const mostrar = page.getByRole("button", { name: /Mostrar 2 chromas/ });
    await expect(mostrar).toBeVisible();
    await mostrar.click();
    await expect(page.getByRole("region", { name: /^Chromas de/ })).toBeVisible();

    // O de dentro primeiro, como todo mundo espera de Escape.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: /^Chromas de/ })).toBeHidden();
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();

    // E o segundo fecha o painel.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeHidden();
  });

  test("a barra `/` foca a busca sem escrever o caractere (RF-07)", async ({ page }) => {
    await irParaHome(page);
    const campo = page.getByRole("combobox");
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("/");

    await expect(campo).toBeFocused();
    await expect(campo).toHaveValue("");
  });

  /**
   * T-57. Da busca até o primeiro campeão eram **21 paradas de Tab** — a barra
   * lateral inteira, as funções e a densidade —, e depois 173, uma por cartão.
   */
  test("o atalho encurta o caminho da busca até a grade", async ({ page }) => {
    await irParaHome(page);
    await page.getByRole("combobox").focus();
    await page.keyboard.press("Tab");

    const atalho = page.getByRole("link", { name: "Ir para o conteúdo" });
    await expect(atalho).toBeFocused();
    await atalho.press("Enter");

    // Do conteúdo até o primeiro campeão: eram 21 paradas de Tab desde a busca,
    // a barra lateral inteira no meio. Agora o que sobra é o filtro da própria
    // grade — as funções e a densidade.
    const noPrimeiroCartao = () =>
      page.evaluate(() => {
        const grade = document.querySelector('[aria-label="Campeões"]');
        return Boolean(grade && document.activeElement && grade.contains(document.activeElement));
      });

    let tabs = 0;
    while (tabs < 12 && !(await noPrimeiroCartao())) {
      await page.keyboard.press("Tab");
      tabs += 1;
    }
    expect(await noPrimeiroCartao(), "o Tab não chegou à grade").toBe(true);
    expect(tabs).toBeLessThanOrEqual(12);
  });

  test("as setas andam na grade, inclusive entre linhas", async ({ page }) => {
    await irParaHome(page);
    const cartoes = page.getByRole("list", { name: "Campeões" }).getByRole("button");
    await cartoes.first().focus();

    const nomeDoFoco = () =>
      page.evaluate(() => (document.activeElement?.textContent ?? "").trim().slice(0, 24));
    const primeiro = await nomeDoFoco();

    await page.keyboard.press("ArrowRight");
    expect(await nomeDoFoco()).not.toBe(primeiro);

    await page.keyboard.press("ArrowLeft");
    expect(await nomeDoFoco()).toBe(primeiro);

    // A grade inteira é uma parada de Tab: só um cartão tem `tabindex="0"`.
    const naVez = await cartoes.evaluateAll((botoes) => botoes.filter((b) => b.tabIndex === 0).length);
    expect(naVez).toBe(1);
  });

  /**
   * T-63. A galeria das categorias tinha duas paradas de Tab por tile: na de
   * Itens, a virtual, sair dela pelo teclado era Tab milhares de vezes.
   */
  test("as setas andam na galeria virtual, e o End chega ao último tile", async ({ page }) => {
    await irParaHome(page);
    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    const scroller = page.locator("[data-virtual='sim']");
    const ampliar = scroller.getByRole("button", { name: /^Ampliar / });
    await expect(ampliar.first()).toBeVisible();
    await ampliar.first().focus();

    const noFoco = () =>
      page.evaluate(() => {
        const item = document.activeElement?.closest("li");
        const caixa = document.activeElement?.getBoundingClientRect();
        return {
          posicao: Number(item?.getAttribute("aria-posinset")),
          total: Number(item?.getAttribute("aria-setsize")),
          x: Math.round(caixa?.x ?? -1),
          y: Math.round(caixa?.y ?? -1),
        };
      });

    const antes = await noFoco();
    expect(antes.posicao).toBe(1);
    await page.keyboard.press("ArrowRight");
    expect((await noFoco()).posicao).toBe(2);
    await page.keyboard.press("ArrowLeft");

    // ↓ vai ao tile de baixo: a mesma coluna, a linha seguinte.
    await page.keyboard.press("ArrowDown");
    const embaixo = await noFoco();
    expect(embaixo.posicao).toBeGreaterThan(2);
    expect(embaixo.x).toBe(antes.x);
    expect(embaixo.y).toBeGreaterThan(antes.y);

    // O último tile não está montado: o End rola até ele, e o foco chega.
    await page.keyboard.press("End");
    await expect.poll(async () => (await noFoco()).posicao).toBe(antes.total);
    await expect(page.locator(":focus")).toBeInViewport();

    // Uma parada de Tab só, e é a do tile com o foco.
    const naVez = await ampliar.evaluateAll((botoes) => botoes.filter((b) => b.tabIndex === 0).length);
    expect(naVez).toBe(1);
  });
});

// --- critério 3: `alt` em toda imagem ---------------------------------------------------

test.describe("texto alternativo", () => {
  test("toda imagem da grade tem alt com o nome do campeão", async ({ page }) => {
    await irParaHome(page);
    const alts = await page.locator('ul[aria-label="Campeões"] img').evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).alt),
    );

    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(alt.trim().length).toBeGreaterThan(0);
    expect(alts).toContain("Jax");
  });

  test("toda prévia do painel tem alt com o nome do asset", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    // `evaluateAll` não espera: sem isto o teste lê a lista antes de a fatia
    // chegar e passa com zero imagens, provando nada.
    await expect(page.locator("img[data-previa]").first()).toBeVisible();

    const alts = await page
      .locator("img[data-previa]")
      .evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).alt));

    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(alt).toMatch(/^Prévia de .+/);
  });

  test("nenhuma imagem da página fica sem alt", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    await expect(page.locator("img[data-previa]").first()).toBeVisible();

    // Desde o T-46 e o T-47 há imagem decorativa de propósito — a miniatura ao
    // lado de um nome já escrito, o tile desfocado atrás da vitrine. Para elas o
    // certo é `alt=""`, e a regra passa a ser: toda imagem tem `alt`, e `alt`
    // vazio só vale se a imagem se declarar decorativa com `aria-hidden`.
    // Imagem esquecida, sem o atributo ou vazia sem declaração, continua caindo.
    const semAlt = await page.locator("img").evaluateAll((imgs) =>
      imgs
        .filter((img) => {
          const alt = img.getAttribute("alt");
          if (alt === null) return true;
          return !alt.trim() && img.getAttribute("aria-hidden") !== "true";
        })
        .map((img) => img.outerHTML),
    );

    expect(semAlt).toEqual([]);
  });
});

// --- critério 4: o foco aparece -----------------------------------------------------------

test.describe("foco visível", () => {
  test("o navegador desenha o anel de foco em todo controle", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    await expect(page.locator("img[data-previa]").first()).toBeVisible();

    // `outline: none` sem substituto é o jeito clássico de tornar um site
    // inutilizável por teclado sem que ninguém perceba. Nenhum controle da tela
    // pode fazer isso.
    const semAnel = await page.evaluate(() => {
      const controles = [...document.querySelectorAll("button, a[href], input, select")];
      return controles
        .filter((elemento) => {
          const estilo = getComputedStyle(elemento, ":focus-visible");
          const semOutline = estilo.outlineStyle === "none" || estilo.outlineWidth === "0px";
          const semSombra = estilo.boxShadow === "none";
          return semOutline && semSombra;
        })
        .map((elemento) => elemento.outerHTML.slice(0, 80));
    });

    expect(semAnel).toEqual([]);
  });
});

// --- critério 2: o axe -------------------------------------------------------------------

test.describe("axe", () => {
  test("a home não tem violação", async ({ page }) => {
    await irParaHome(page);
    const violacoes = await violacoesDoAxe(page);
    expect(resumir(violacoes)).toBe("");
  });

  test("o painel do campeão não tem violação", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();

    const violacoes = await violacoesDoAxe(page);
    expect(resumir(violacoes)).toBe("");
  });

  test("a navegação por categoria não tem violação", async ({ page }) => {
    await irParaHome(page);
    await page
      .getByRole("navigation", { name: "Categorias" })
      .getByRole("button", { name: "Itens" })
      .click();
    // Grupos de filtro, caixas de seleção e a lista: é a tela com mais controles
    // do produto, e por isso a mais fácil de quebrar sem perceber.
    await expect(page.getByRole("group", { name: "Mapa" })).toBeVisible();
    // T-48: com "Mais filtros" aberto e as ações de um tile à vista — o que fica
    // escondido até alguém pedir também precisa passar.
    await page.getByRole("button", { name: /^Mais filtros/ }).click();
    await expect(page.getByRole("group", { name: "Classe" })).toBeVisible();
    await page.locator("[data-virtual='sim'] article").first().hover();

    const violacoes = await violacoesDoAxe(page);
    expect(resumir(violacoes)).toBe("");
  });

  test("a página Sobre não tem violação", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page.getByRole("heading", { name: "Sobre", level: 1 })).toBeVisible();

    const violacoes = await violacoesDoAxe(page);
    expect(resumir(violacoes)).toBe("");
  });

  // --- T-64: os estados que nenhum teste do axe abria ---------------------------------

  test("a busca aberta, com resultados e sem nenhum, não tem violação", async ({ page }) => {
    await irParaHome(page);
    const campo = page.getByRole("combobox");
    await campo.fill("ja");
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");

    // Era aqui a violação crítica que a régua mais dura achou: a lista de
    // opções sem opção nenhuma dentro.
    await campo.fill("zzzz");
    await expect(page.getByRole("status").filter({ hasText: "Nada para" })).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
  });

  test("o lote e a ampliação no painel não têm violação", async ({ page }) => {
    await irParaHome(page);
    await page.click('button:has-text("Jax")');
    const painel = page.getByRole("region", { name: "Painel de Jax" });
    await painel.getByRole("button", { name: /^Tudo de Jax/ }).click();
    await expect(painel.getByRole("button", { name: /como zip/ })).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");

    await painel.getByRole("button", { name: /^Ampliar / }).first().click();
    await expect(page.getByRole("dialog", { name: /^Ampliação de/ })).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
  });

  test("a categoria com seleção e o filtro sem resultado não têm violação", async ({ page }) => {
    await irParaHome(page);
    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    const tile = page.locator("[data-virtual='sim'] article").first();
    await tile.getByRole("checkbox").focus();
    await page.keyboard.press("Space");
    await expect(tile.getByRole("checkbox")).toBeChecked();
    expect(resumir(await violacoesDoAxe(page))).toBe("");

    await page.getByLabel("Filtrar por texto").fill("zzzz");
    await expect(page.getByText("Nenhum asset com esses filtros")).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
  });

  test("a página que não existe não tem violação", async ({ page }) => {
    await page.goto("/nao-existe");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
  });
});

// --- critério 3 do T-30: telas estreitas ------------------------------------------------

test.describe("tela estreita", () => {
  test.use({ viewport: { width: 375, height: 720 } });

  test("nada transborda na horizontal", async ({ page }) => {
    await irParaHome(page);
    // Rolagem horizontal numa grade de cartões é o sintoma clássico de largura
    // fixa que não coube. 375px é um telefone comum.
    const transborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(transborda).toBe(false);
  });

  test("os dois avisos da Riot continuam inteiros (RF-21)", async ({ page }) => {
    await irParaHome(page);
    for (const qual of ["riot", "jibber-jabber"]) {
      // Desde o T-49 há duas cópias: a da barra lateral, que o telefone esconde,
      // e a do fim da página. Vale a que aparece.
      const aviso = page.locator(`[data-aviso='${qual}']:visible`);
      await expect(aviso).toHaveCount(1);
      // Sem corte: o texto renderizado tem que ser o texto todo.
      const cortado = await aviso.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
      expect(cortado, `o aviso ${qual} foi cortado`).toBe(false);
    }
  });

  test("a grade e a busca continuam utilizáveis", async ({ page }) => {
    await irParaHome(page);
    await expect(page.getByRole("combobox")).toBeVisible();
    await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
    const largura = await page
      .getByRole("list", { name: "Campeões" })
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(largura).toBeGreaterThan(300);
  });

  test("a categoria aberta também cabe na tela", async ({ page }) => {
    // Os outros cenários estreitos olham a home. Este olha a categoria, que é
    // onde a barra lateral vira faixa **e** a lista virtual entra: as duas
    // coisas que já transbordaram.
    await irParaHome(page);
    await page
      .getByRole("navigation", { name: "Categorias" })
      .getByRole("button", { name: "Itens" })
      .click();
    await expect(page.locator("[data-virtual='sim'] article").first()).toBeVisible();

    const medidas = await page.evaluate(() => {
      const doc = document.documentElement;
      const caixas = [...document.querySelectorAll("[data-virtual='sim'] article")].map((a) =>
        a.getBoundingClientRect(),
      );
      // Retângulo contra retângulo: a galeria tem duas colunas no telefone (T-48).
      const cruzam = (a: DOMRect, b: DOMRect) =>
        a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      return {
        transborda: doc.scrollWidth > doc.clientWidth + 1,
        sobrepoe: caixas.some((a, i) => caixas.slice(i + 1).some((b) => cruzam(a, b))),
      };
    });
    expect(medidas.transborda, "a categoria transbordou na horizontal").toBe(false);
    expect(medidas.sobrepoe, "um cartão está por cima do outro").toBe(false);
  });

  test("o axe não reclama em tela estreita", async ({ page }) => {
    await irParaHome(page);
    expect(resumir(await violacoesDoAxe(page))).toBe("");

    // T-64: no telefone, o painel em tela cheia e a categoria têm outro layout.
    await page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ }).click();
    await expect(page.getByRole("region", { name: "Painel de Jax" }).locator("article").first()).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
    await page.keyboard.press("Escape");

    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    await expect(page.locator("[data-virtual='sim'] article").first()).toBeVisible();
    expect(resumir(await violacoesDoAxe(page))).toBe("");
  });
});

/**
 * T-62: os avisos da Riot "readily visible" em qualquer altura de tela.
 *
 * Numa tela de 1024×640 a barra lateral inteira rolava, e os dois avisos
 * ficavam abaixo da dobra — medido na produção em 18/09/2026. Agora quem rola é
 * só a lista de categorias, e os avisos ficam presos ao pé da coluna.
 */
test.describe("avisos da Riot em tela baixa", () => {
  test.use({ viewport: { width: 1024, height: 640 } });

  test("os dois avisos ficam inteiros na tela, sem rolar nada", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();

    for (const qual of ["riot", "jibber-jabber"]) {
      const aviso = page.locator(`aside [data-aviso='${qual}']`);
      await expect(aviso).toBeVisible();
      const caixa = await aviso.boundingBox();
      expect(caixa!.y, `o aviso ${qual} começa fora da tela`).toBeGreaterThanOrEqual(0);
      expect(caixa!.y + caixa!.height, `o aviso ${qual} acaba fora da tela`).toBeLessThanOrEqual(640);
    }

    // A barra em si não rola: se precisar, rola a lista de categorias.
    const barraRola = await page
      .locator("aside")
      .evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(barraRola).toBe(false);
  });
});

/**
 * T-67: reflow (WCAG 1.4.10). Zoom de 400% é uma tela de 320×256 px CSS; zoom
 * de 200%, de 640×450 — e o telefone deitado, de 844×390.
 *
 * A casca rola por dentro e tem altura fixa. Medido na produção em 21/09/2026:
 * a 320×225 o cromo tomava a tela inteira, a galeria de Itens tinha **0 px** e
 * o aviso do filtro padrão ficava por cima da linha do patch. Em tela baixa a
 * janela volta a rolar, e a galeria virtual ganha a altura da tela.
 */
for (const [nome, viewport] of [
  ["zoom de 400%", { width: 320, height: 256 }],
  ["zoom de 200%", { width: 640, height: 450 }],
  ["telefone deitado", { width: 844, height: 390 }],
] as const) {
  test.describe(`tela baixa: ${nome}`, () => {
    test.use({ viewport });

    test("a arte aparece, e nada fica por cima de nada", async ({ page }) => {
      await page.goto("/");
      const grade = page.getByRole("list", { name: "Campeões" });
      await expect(grade).toBeVisible();
      // Nada vaza na horizontal.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

      // Rolando a janela, o primeiro cartão chega à tela.
      await grade.getByRole("button").first().scrollIntoViewIfNeeded();
      await expect(grade.getByRole("button").first()).toBeInViewport();

      await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
      const galeria = page.locator("[data-virtual='sim']");
      await expect(galeria.locator("article").first()).toBeAttached();
      // A galeria virtual tem a altura da tela — era 0 a 320×225.
      expect(await galeria.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBe(
        viewport.height,
      );
      await galeria.scrollIntoViewIfNeeded();
      await expect(galeria.locator("article").first()).toBeInViewport();

      // O aviso do filtro padrão e a linha do patch não se sobrepõem.
      const [aviso, patch] = await Promise.all([
        page.getByText(/abre filtrada/).boundingBox(),
        page.getByText(/^Patch /).boundingBox(),
      ]);
      const sobrepostos =
        aviso!.y + aviso!.height > patch!.y + 1 && patch!.y + patch!.height > aviso!.y + 1;
      expect(sobrepostos).toBe(false);
    });
  });
}

/**
 * T-69: erro de dedo. Medido na produção em 21/09/2026: "yasou", "yaso",
 * "kattarina", "ezrael" e "serafine" davam zero resultados. O vazio agora
 * oferece o campeão parecido, como opção de verdade: Enter abre.
 */
test.describe("busca com erro de dedo", () => {
  test("o vazio oferece o parecido, e Enter abre o campeão", async ({ page }) => {
    await irParaHome(page);
    await page.keyboard.type("jaxx");
    await expect(page.getByRole("status").filter({ hasText: "Parecido" })).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Campeões parecidos" })).toBeVisible();
    await expect(page.getByRole("option").first()).toContainText("Jax");
    expect(resumir(await violacoesDoAxe(page))).toBe("");

    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();
  });

  test("o que não se parece com nada continua dizendo que não achou", async ({ page }) => {
    await irParaHome(page);
    await page.keyboard.type("zzzzqq");
    await expect(page.getByRole("status").filter({ hasText: "Nada para" })).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
  });
});

/**
 * T-71: fechar uma camada devolve o foco a quem a abriu. Medido na produção em
 * 21/09/2026: em 9 de 10 caminhos o foco caía no `body`, e quem usa teclado
 * voltava ao topo da página — o painel e a ampliação são diálogos do Radix sem
 * `Dialog.Trigger`, e o Radix devolve o foco ao gatilho.
 */
test.describe("o foco volta ao lugar", () => {
  test("Esc no painel devolve o foco ao cartão que o abriu", async ({ page }) => {
    await irParaHome(page);
    const cartao = page.getByRole("list", { name: "Campeões" }).getByRole("button", { name: /^Jax\b/ });
    await cartao.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Painel de Jax" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cartao).toBeFocused();
  });

  test("fechar a ampliação devolve o foco ao botão de ampliar", async ({ page }) => {
    await irParaHome(page);
    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    const ampliar = page.locator("[data-virtual='sim'] article").first().getByRole("button", { name: /^Ampliar / });
    await ampliar.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: /^Ampliação de/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ampliar).toBeFocused();
  });

  test("abrir pela busca e fechar devolve o foco à busca", async ({ page }) => {
    await irParaHome(page);
    await page.keyboard.type("jax");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Painel de Jax" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox")).toBeFocused();
  });

  test("Voltar aos campeões leva o foco para os campeões, não para o topo", async ({ page }) => {
    await irParaHome(page);
    await page.getByRole("navigation", { name: "Categorias" }).getByRole("button", { name: "Itens" }).click();
    const voltar = page.getByRole("button", { name: "Voltar aos campeões" });
    await voltar.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#conteudo")).toBeFocused();
  });
});
