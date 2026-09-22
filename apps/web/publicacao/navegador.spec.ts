import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { isByteStable, type Asset } from "@lol-assets/schema";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * O site servido de um domínio público, num navegador de verdade (T-43).
 *
 * O e2e do T-29 prova o comportamento com uma fixture local, e é ele que roda na
 * CI. Este arquivo prova outra coisa: que **nada quebra fora do `localhost`** —
 * CORS das fontes, caminhos, o fetch do índice, o canvas, o zip — com o índice
 * publicado e as fontes de verdade. Por isso não roda na CI; os dois modos estão
 * em `playwright.publicacao.config.ts`.
 *
 * Os downloads conferem o que cada fonte garante, e não é a mesma coisa nas duas
 * (ADR 0019): o ddragon entrega os bytes que o índice mediu; o cdragon passa pelo
 * Cloudflare Polish e garante formato e dimensões.
 */

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** Erro de console, exceção e requisição que falhou: CORS quebrado aparece num deles. */
function vigiarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  page.on("pageerror", (erro) => erros.push(erro.message));
  page.on("requestfailed", (requisicao) => {
    const motivo = requisicao.failure()?.errorText ?? "";
    // Prévia preguiçosa cancelada ao trocar de tela não é defeito.
    if (!motivo.includes("ERR_ABORTED")) erros.push(`${motivo} ${requisicao.url()}`);
  });
  return erros;
}

async function irParaHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Campeões" })).toBeVisible();
}

async function abrirJax(page: Page): Promise<void> {
  await irParaHome(page);
  await page
    .getByRole("list", { name: "Campeões" })
    .getByRole("button", { name: /^Jax\b/ })
    .click();
  await expect(page.getByRole("region", { name: "Painel de Jax" })).toBeVisible();
}

async function abrirEmotes(page: Page): Promise<Locator> {
  await irParaHome(page);
  await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("button", { name: "Emotes" })
    .click();
  const cartoes = page.locator("[data-virtual='sim'] article");
  await expect(cartoes.first()).toBeVisible();
  return cartoes;
}

async function baixar(page: Page, botao: Locator): Promise<{ nome: string; dados: Buffer }> {
  const download = page.waitForEvent("download");
  await botao.click();
  const arquivo = await download;
  return { nome: arquivo.suggestedFilename(), dados: await readFile(await arquivo.path()) };
}

type Registro = Readonly<
  Pick<Asset, "sha256" | "bytes" | "width" | "height" | "format" | "source" | "sourceUrl">
>;

/**
 * O registro de um arquivo no índice, lido **pela página**.
 *
 * Pela página porque é ela que resolve o domínio: no modo local, o nome
 * `biblioteca-de-assets.test` só existe dentro do Chromium.
 */
async function registro(page: Page, categoria: string, arquivo: string): Promise<Registro> {
  const achado = await page.evaluate(
    async ([categoria, arquivo]) => {
      const manifesto = await (await fetch("/indice/manifest.json")).json();
      const versao = manifesto.versions.find(
        (v: { gameVersion: string }) => v.gameVersion === manifesto.currentVersion,
      );
      // Desde o contrato 2.0.0 a fatia de um campeão vem do catálogo (ADR 0023): o
      // arquivo "Jax_square.png" está na fatia do campeão "Jax".
      let url: string;
      if (categoria === "champion") {
        const catalogo = await (await fetch(`/indice/${versao.catalog.url}`)).json();
        const campeao = catalogo.champions.find(
          (c: { championId: string }) => c.championId === arquivo.split("_")[0],
        );
        url = campeao.shard.url;
      } else {
        url = versao.shards.find((s: { category: string }) => s.category === categoria).url;
      }
      const { assets } = await (await fetch(`/indice/${url}`)).json();
      const asset = assets.find((a: { fileName: string }) => a.fileName === arquivo);
      return asset
        ? {
            sha256: asset.sha256,
            bytes: asset.bytes,
            width: asset.width,
            height: asset.height,
            format: asset.format,
            source: asset.source,
            sourceUrl: asset.sourceUrl,
          }
        : null;
    },
    [categoria, arquivo] as const,
  );
  expect(achado, `${arquivo} não está na fatia ${categoria}`).not.toBeNull();
  return achado as Registro;
}

function sha256(dados: Buffer): string {
  return createHash("sha256").update(dados).digest("hex");
}

/** A assinatura e as dimensões, lidas do IHDR. */
function cabecalhoPng(dados: Buffer): { largura: number; altura: number } {
  expect(dados.subarray(0, 8)).toEqual(PNG);
  return { largura: dados.readUInt32BE(16), altura: dados.readUInt32BE(20) };
}

/**
 * Os bytes que a fonte entregou a **este** navegador, na URL do índice.
 *
 * `force-cache` reaproveita a resposta que o download acabou de receber: é a
 * mesma entrega, não uma segunda ida à borda — que no cdragon podia voltar em
 * outra variante (ADR 0019). O hash sai no Node porque o modo local é HTTP, e
 * fora de contexto seguro o navegador não tem `crypto.subtle`.
 */
async function entregueAoNavegador(page: Page, url: string): Promise<Buffer> {
  const base64 = await page.evaluate(async (url) => {
    const blob = await (await fetch(url, { cache: "force-cache" })).blob();
    return new Promise<string>((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result).split(",", 2)[1] ?? "");
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(blob);
    });
  }, url);
  return Buffer.from(base64, "base64");
}

/**
 * O que o índice garante sobre o arquivo salvo depende da fonte (ADR 0019).
 *
 * De toda fonte: o arquivo salvo é o que ela entregou, sem re-encode (RF-10), com
 * o formato e as dimensões do índice. De fonte com bytes estáveis — o ddragon —,
 * também o `sha256` do índice. O cdragon não garante isso: o Cloudflare Polish
 * troca os bytes conforme o cache da borda, e a arte continua a mesma.
 */
async function conferirArquivo(page: Page, dados: Buffer, esperado: Registro): Promise<void> {
  const daFonte = await entregueAoNavegador(page, esperado.sourceUrl);
  expect(sha256(dados), "o arquivo salvo não é o que a fonte entregou").toBe(sha256(daFonte));
  expect(esperado.format, "os cenários de download usam PNG; JPEG pediria ler o SOF").toBe("png");
  expect(cabecalhoPng(dados)).toEqual({ largura: esperado.width, altura: esperado.height });

  if (isByteStable(esperado.source)) {
    expect(sha256(dados)).toBe(esperado.sha256);
    return;
  }
  test.info().annotations.push({
    type: "entrega",
    description:
      sha256(dados) === esperado.sha256
        ? `${esperado.source}: o arquivo que o índice mediu`
        : `${esperado.source}: outra variante — ${dados.length} bytes, contra ${esperado.bytes} no índice`,
  });
}

test("é servido de um domínio que não é localhost", async ({ page }) => {
  await irParaHome(page);
  expect(["localhost", "127.0.0.1", "[::1]"]).not.toContain(new URL(page.url()).hostname);
});

test("no ar, é HTTPS e contexto seguro", async ({ page }) => {
  // O modo local é HTTP num domínio falso: **não** é contexto seguro, e o
  // Chromium sem janela ignora a flag que o fingiria. Que os cenários de
  // download, PNG e zip passem assim prova que eles não dependem disso. Quem
  // depende é o "Copiar link", e ele só precisa do HTTPS que a Vercel já dá.
  test.skip(!process.env.URL_PUBLICADA, "só contra o site no ar");
  await irParaHome(page);
  expect(new URL(page.url()).protocol).toBe("https:");
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
});

test("o índice vem do próprio domínio — nenhum CORS no caminho", async ({ page }) => {
  const erros = vigiarErros(page);
  const doIndice: string[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.url().includes("/indice/")) doIndice.push(requisicao.url());
  });
  await irParaHome(page);

  const origem = new URL(page.url()).origin;
  expect(doIndice.some((url) => url.endsWith("/indice/manifest.json"))).toBe(true);
  for (const url of doIndice) expect(new URL(url).origin).toBe(origem);
  expect(erros).toEqual([]);
});

test("as miniaturas carregam das fontes", async ({ page }) => {
  const erros = vigiarErros(page);
  await irParaHome(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const imagens = [
          ...document.querySelectorAll<HTMLImageElement>('ul[aria-label="Campeões"] img'),
        ].slice(0, 8);
        return imagens.length === 8 && imagens.every((i) => i.complete && i.naturalWidth > 0);
      }),
    )
    .toBe(true);
  expect(erros).toEqual([]);
});

test("baixar do ddragon traz os bytes que o índice descreve", async ({ page }) => {
  const erros = vigiarErros(page);
  await abrirJax(page);
  const esperado = await registro(page, "champion", "Jax_square.png");
  expect(esperado.source).toBe("ddragon");

  const cartao = page.locator('article[aria-label="Jax_square.png"]');
  const { nome, dados } = await baixar(page, cartao.getByRole("button", { name: "Baixar original" }));

  expect(nome).toBe("Jax_square.png");
  await conferirArquivo(page, dados, esperado);
  expect(erros).toEqual([]);
});

test("converter a splash para PNG: o canvas não fica contaminado", async ({ page }) => {
  const erros = vigiarErros(page);
  await abrirJax(page);
  const esperado = await registro(page, "champion", "Jax_000_splash_centered.jpg");

  const cartao = page.locator('article[aria-label="Jax_000_splash_centered.jpg"]');
  const { nome, dados } = await baixar(page, cartao.getByRole("button", { name: "Baixar PNG" }));

  expect(nome).toBe("Jax_000_splash_centered.png");
  // O PNG gerado no navegador tem as dimensões do JPEG da fonte.
  expect(cabecalhoPng(dados)).toEqual({ largura: esperado.width, altura: esperado.height });
  expect(erros).toEqual([]);
});

test("baixar do cdragon traz o arquivo da fonte, com o formato e as dimensões do índice", async ({
  page,
}) => {
  const erros = vigiarErros(page);
  const cartoes = await abrirEmotes(page);
  const cartao = cartoes.filter({ hasText: "cdragon" }).first();
  const arquivo = (await cartao.getAttribute("aria-label")) ?? "";
  const esperado = await registro(page, "emote", arquivo);
  expect(esperado.source).toBe("cdragon");

  // Desde o T-60 as ações do tile entram no DOM quando ele é apontado, como a
  // pessoa faz antes de baixar. Sem apontar, o botão não existe.
  await cartao.hover();
  const { nome, dados } = await baixar(page, cartao.getByRole("button", { name: "Baixar original" }));
  expect(nome).toBe(arquivo);
  await conferirArquivo(page, dados, esperado);
  expect(erros).toEqual([]);
});

test("o zip em lote junta arquivos das fontes no navegador", async ({ page }) => {
  const erros = vigiarErros(page);
  const cartoes = await abrirEmotes(page);
  // O rótulo envolve a caixa de seleção; o `input` é `sr-only`.
  await cartoes.nth(0).locator("label").click();
  await cartoes.nth(1).locator("label").click();

  const lote = page.locator('[aria-label="Seleção"]');
  const { nome, dados } = await baixar(page, lote.getByRole("button", { name: /como zip/ }));
  expect(nome).toMatch(/\.zip$/);
  expect(dados.subarray(0, 4)).toEqual(ZIP);
  expect(erros).toEqual([]);
});

test("os dois avisos da Riot, no rodapé e na página Sobre", async ({ page }) => {
  await irParaHome(page);
  for (const qual of ["riot", "jibber-jabber"]) {
    await expect(page.locator(`aside [data-aviso='${qual}']`)).toBeVisible();
  }
  await page.goto("/sobre");
  for (const qual of ["riot", "jibber-jabber"]) {
    await expect(page.locator(`main [data-aviso='${qual}']`)).toBeVisible();
  }
});
