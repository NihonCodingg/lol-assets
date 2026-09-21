import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { examples } from "@lol-assets/schema/examples";
import type { Asset } from "@lol-assets/schema";

import { orderAssets } from "@/lib/asset-panel";

import { PainelDeAsset } from "./painel-de-asset";

/**
 * O painel é onde o RF-09 vive: a ficha aparece **antes** de qualquer clique.
 * E é onde o critério 4 vive: um asset que falha marca o cartão dele e mais
 * nada — são dezenas na tela, e derrubar o painel esconderia os que funcionam.
 */

afterEach(cleanup);

const DO_JAX = examples.shards.champion.assets;
const BASE = "https://assets.exemplo.invalido/lol";

function abrir(assets: readonly Asset[] = DO_JAX, extra: Partial<Parameters<typeof PainelDeAsset>[0]> = {}) {
  const onClose = vi.fn();
  const baixar = vi.fn().mockResolvedValue(undefined);
  const copiar = vi.fn().mockResolvedValue(undefined);
  render(
    <PainelDeAsset
      titulo="Jax"
      assets={assets}
      assetsBaseUrl={BASE}
      onClose={onClose}
      baixar={baixar}
      copiar={copiar}
      {...extra}
    />,
  );
  apontarTodos();
  return { onClose, baixar, copiar };
}

/**
 * Aponta cada tile da galeria, como a pessoa faz antes de baixar.
 *
 * Desde o T-60 as ações do tile entram no DOM quando ele é apontado ou recebe
 * foco — antes disso elas já não apareciam na tela (T-53), só existiam. Estes
 * testes clicavam num botão que ninguém via; agora apontam antes, que é o
 * caminho de verdade. O que eles afirmam sobre os botões não mudou.
 */
function apontarTodos() {
  for (const tile of screen.queryAllByRole("article")) fireEvent.mouseEnter(tile);
}

function cartoes(): HTMLElement[] {
  return screen.getAllByRole("article");
}

// --- o que aparece, e em que ordem ------------------------------------------------

describe("todos os tipos do índice, nenhum inventado", () => {
  it("um cartão por asset do índice", () => {
    abrir();
    expect(cartoes()).toHaveLength(DO_JAX.length);
  });

  it("splash_centered é o primeiro (ADR 0002)", () => {
    abrir();
    expect(cartoes()[0].dataset.tipo).toBe("splash_centered");
  });

  it("tipo ausente no índice não renderiza cartão", () => {
    // A fixture não tem `chroma`: ele é do T-20 e ainda não existe no índice.
    abrir();
    expect(cartoes().some((c) => c.dataset.tipo === "chroma")).toBe(false);
    expect(screen.queryByText("chroma")).toBeNull();
  });

  it("com um asset só, ele é o único cartão", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square]);
    expect(cartoes()).toHaveLength(1);
    expect(screen.getByText("1 asset")).toBeTruthy();
  });
});

// --- a ficha antes do clique (RF-09) ------------------------------------------------

describe("ficha honesta antes de qualquer download", () => {
  it("mostra formato, resolução, bytes e fonte", () => {
    abrir();
    const primeiro = cartoes()[0];
    const asset = DO_JAX.find((a) => a.type === "splash_centered")!;

    const ficha = within(primeiro).getByText(/·/);
    expect(ficha.textContent).toContain(`${asset.width}`);
    expect(ficha.textContent).toContain(asset.format);
    expect(ficha.textContent).toContain(asset.source);
  });

  it("um asset que já é PNG não oferece conversão", () => {
    const square = DO_JAX.find((a) => a.format === "png")!;
    abrir([square]);
    expect(screen.getByRole("button", { name: "Já é PNG" }).hasAttribute("disabled")).toBe(true);
  });
});

// --- baixar ---------------------------------------------------------------------------

describe("as duas formas de baixar (ADR 0001)", () => {
  it("original chama o download sem conversão", async () => {
    const { baixar } = abrir([DO_JAX[0]]);
    fireEvent.click(screen.getByRole("button", { name: "Baixar original" }));

    await waitFor(() => expect(baixar).toHaveBeenCalledTimes(1));
    expect(baixar.mock.calls[0][1]).toBe(false);
  });

  it("PNG chama o download pedindo conversão", async () => {
    const jpeg = DO_JAX.find((a) => a.format === "jpeg")!;
    const { baixar } = abrir([jpeg]);
    fireEvent.click(screen.getByRole("button", { name: "Baixar PNG" }));

    await waitFor(() => expect(baixar).toHaveBeenCalledTimes(1));
    expect(baixar.mock.calls[0][1]).toBe(true);
  });
});

// --- copiar URL -------------------------------------------------------------------------

describe("copiar URL", () => {
  it("copia a URL pública do asset", async () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    const { copiar } = abrir([square]);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() => expect(copiar).toHaveBeenCalledTimes(1));
    const copiado = copiar.mock.calls[0][0] as string;
    expect(copiado.startsWith("http")).toBe(true);
    // Com storageKey e base pública, a URL é a do bucket; sem, é a da fonte.
    expect(copiado).toBe(square.storageKey ? `${BASE}/${square.storageKey}` : square.sourceUrl);
  });

  it("confirma no próprio cartão, e o leitor de tela ouve (T-45)", async () => {
    // Um aviso flutuante ficaria fora do diálogo do painel, e o Radix o
    // esconderia do leitor de tela. A confirmação mora no cartão.
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square]);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() =>
      expect(within(cartoes()[0]).getByRole("status").textContent).toBe("Link copiado"),
    );
    // E o olho vê: a dica abre sozinha. Na galeria ela é a dica leve, em CSS
    // (T-48) — o Radix de cada tile pesava na rolagem —, e por isso não é
    // `role="tooltip"`: quem ouve já ouviu o `status` acima.
    //
    // Procurada pelo texto desde o T-53: num tile estreito os dois downloads
    // também viraram ícone com dica leve, e o primeiro `[data-dica]` do cartão
    // passou a ser o de "Baixar original". O que este teste afirma é a dica do
    // copiar — e é ela que ele procura, em vez da primeira que aparecer.
    const dica = within(cartoes()[0]).getByText("Link copiado", { selector: "[data-dica]" });
    expect(dica.getAttribute("data-dica")).toBe("aberta");
    // O nome do botão não muda: quem procura "Copiar link" continua achando.
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeTruthy();
  });

  it("na grade do painel do campeão, a dica é a do Radix, e abre sozinha", async () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square], { grade: true });
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(screen.getByRole("tooltip").textContent).toBe("Link copiado"));
  });

  it("sem área de transferência, diz que não deu — e nada quebra", async () => {
    // Fora de HTTPS o `navigator.clipboard` nem existe, e o erro sai síncrono.
    const square = DO_JAX.find((a) => a.type === "square")!;
    const copiar = vi.fn(() => {
      throw new Error("sem clipboard");
    });
    abrir([square], { copiar });
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() =>
      expect(within(cartoes()[0]).getByRole("status").textContent).toBe(
        "Não deu para copiar o link",
      ),
    );
  });
});

// --- o erro fica no cartão (critério 4) ----------------------------------------------------

describe("um asset que falha não derruba os outros", () => {
  it("só o cartão que falhou mostra o erro", async () => {
    // O painel reordena: o cartão clicado é o primeiro DEPOIS da ordenação.
    const falhando = orderAssets(DO_JAX)[0];
    const baixar = vi.fn(async (asset: Asset) => {
      if (asset.id === falhando.id) throw new Error("rede fora");
    });
    abrir(DO_JAX, { baixar });

    const primeiro = cartoes()[0];
    fireEvent.click(within(primeiro).getByRole("button", { name: "Baixar original" }));

    await waitFor(() => expect(within(primeiro).getByRole("alert")).toBeTruthy());
    expect(primeiro.dataset.estado).toBe("erro");
    // Os outros continuam de pé e sem erro nenhum.
    expect(cartoes()).toHaveLength(DO_JAX.length);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("o cartão que deu certo volta para pronto", async () => {
    abrir([DO_JAX[0]]);
    fireEvent.click(screen.getByRole("button", { name: "Baixar original" }));

    await waitFor(() => expect(cartoes()[0].dataset.estado).toBe("pronto"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("os botões ficam desabilitados enquanto baixa", async () => {
    let liberar = () => {};
    const baixar = vi.fn(() => new Promise<void>((resolve) => (liberar = resolve)));
    abrir([DO_JAX[0]], { baixar });

    const botao = screen.getByRole("button", { name: "Baixar original" });
    fireEvent.click(botao);

    await waitFor(() => expect(botao.hasAttribute("disabled")).toBe(true));
    liberar();
    await waitFor(() => expect(botao.hasAttribute("disabled")).toBe(false));
  });
});

// --- fechar ----------------------------------------------------------------------------------

describe("fechar", () => {
  it("Esc fecha", () => {
    const { onClose } = abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("outra tecla não fecha", () => {
    const { onClose } = abrir();
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // Mudou no T-48: o painel não tem mais o próprio "fechar". Quem fecha é quem o
  // contém — o × do painel do campeão, o "Voltar aos campeões" da categoria —, e
  // dois botões fechando a mesma coisa eram um a mais para achar.
  it("não tem botão de fechar: quem fecha é quem contém o painel (T-48)", () => {
    abrir();
    expect(screen.queryByRole("button", { name: /fechar/i })).toBeNull();
  });

  it("depois de fechado, o Esc não chama mais nada", () => {
    const { onClose } = abrir();
    cleanup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// --- a galeria (T-48) ------------------------------------------------------------------------

describe("a galeria das categorias", () => {
  it("todo tile tem a mesma altura — é o que deixa virtualizar por linha", () => {
    abrir();
    const alturas = new Set(
      screen.getAllByRole("listitem").map((item) => (item as HTMLElement).parentElement?.style.gridAutoRows),
    );
    expect(alturas.size).toBe(1);
    expect([...alturas][0]).toMatch(/^\d+px$/);
  });

  it("a ficha inteira continua à vista, com a fonte (RF-09)", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square]);
    const ficha = within(cartoes()[0]).getByText(/·/);
    expect(ficha.textContent).toContain(`${square.width}×${square.height}`);
    expect(ficha.textContent).toContain(square.source);
  });

  it("os botões dizem pouco, e o nome acessível é o inteiro", () => {
    const jpeg = DO_JAX.find((a) => a.format === "jpeg")!;
    abrir([jpeg]);
    const original = screen.getByRole("button", { name: "Baixar original" });
    expect(original.textContent).toBe("Original");
    expect(screen.getByRole("button", { name: "Baixar PNG" }).textContent).toBe("PNG");
  });

  /**
   * T-53: num tile estreito — o de um ícone de 64 px — nem "Original" cabe sem
   * mandar na largura do tile. O rótulo sai da tela e continua no nome
   * acessível e na dica; os dois botões continuam lado a lado, do mesmo
   * tamanho, que é o que o [ADR 0001] pede.
   */
  it("no tile estreito os dois viram ícone, sem perder o nome", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square]);
    const original = screen.getByRole("button", { name: "Baixar original" });
    const png = screen.getByRole("button", { name: /Baixar PNG|Já é PNG/ });
    expect(original.textContent).toBe("");
    expect(png.textContent).toBe("");
    expect(original.querySelector("svg")).toBeTruthy();
    expect(png.querySelector("svg")).toBeTruthy();
  });

  /**
   * T-56: no índice do patch, **todas** as 532 wards vêm em pares de nome igual
   * — a arte e a sombra dela. Dois tiles com o mesmo nome e artes diferentes é o
   * produto parecendo quebrado sem estar.
   */
  it("nome repetido na lista ganha o que o diferencia", () => {
    const base = DO_JAX.find((a) => a.type === "square")!;
    const arte: Asset = { ...base, id: "ward:0", fileName: "Ward_0.png", refId: "0", names: { pt_BR: "Default Ward" } };
    const sombra: Asset = { ...arte, id: "ward:0s", fileName: "Ward_0-shadow.png" };
    abrir([arte, sombra]);

    const nomes = cartoes().map((c) => c.querySelector("h3")?.textContent);
    expect(nomes).toContain("Default Ward · 0");
    expect(nomes).toContain("Default Ward · sombra");
  });

  it("nome que não repete continua como está", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square]);
    expect(cartoes()[0].querySelector("h3")?.textContent).toBe(square.names.pt_BR);
  });

  /**
   * T-60: medido na categoria de 5.042 ícones, 45 nós por tile e 2.423 na
   * página; com as ações montadas só ao apontar, 939 — e abrir a categoria
   * caiu de 89 para 78 ms.
   */
  it("as ações entram no DOM ao apontar ou focar, e saem ao sair", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    render(<PainelDeAsset titulo="Jax" assets={[square]} onClose={vi.fn()} onAmpliar={vi.fn()} />);
    const tile = cartoes()[0];
    expect(within(tile).queryByRole("button", { name: "Baixar original" })).toBeNull();
    // A ficha fica: é ela que o RF-09 pede antes do download.
    expect(within(tile).getByText(/·/)).toBeTruthy();

    fireEvent.mouseEnter(tile);
    expect(within(tile).getByRole("button", { name: "Baixar original" })).toBeTruthy();
    fireEvent.mouseLeave(tile);
    expect(within(tile).queryByRole("button", { name: "Baixar original" })).toBeNull();

    // Pelo teclado: o foco entra pela prévia, que está sempre no DOM.
    fireEvent.focus(within(tile).getByRole("button", { name: /^Ampliar / }));
    expect(within(tile).getByRole("button", { name: "Baixar original" })).toBeTruthy();
  });

  it("sem nada focável antes delas, as ações ficam sempre — o teclado precisa chegar", () => {
    const square = DO_JAX.find((a) => a.type === "square")!;
    render(<PainelDeAsset titulo="Jax" assets={[square]} onClose={vi.fn()} />);
    expect(within(cartoes()[0]).getByRole("button", { name: "Baixar original" })).toBeTruthy();
  });

  it("com a ampliação, a prévia vira o botão dela", () => {
    const onAmpliar = vi.fn();
    const square = DO_JAX.find((a) => a.type === "square")!;
    abrir([square], { onAmpliar });
    fireEvent.click(screen.getByRole("button", { name: `Ampliar ${square.fileName}` }));
    expect(onAmpliar).toHaveBeenCalledWith(square);
  });

  it("as ações da lista vão ao lado do título", () => {
    abrir(DO_JAX, { acoes: <button type="button">Selecionar os 3 filtrados</button> });
    expect(screen.getByRole("button", { name: "Selecionar os 3 filtrados" })).toBeTruthy();
  });
});
