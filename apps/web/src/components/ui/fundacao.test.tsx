import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Download } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BotaoIcone } from "./botao-icone";
import { Esqueleto } from "./esqueleto";
import { Imagem } from "./imagem";
import { ParDeDownload } from "./par-de-download";

/**
 * Os primitivos do T-45 — o vocabulário que as telas novas vão falar.
 *
 * O que se prova aqui é o contrato de cada peça, não a aparência: nome
 * acessível obrigatório, a ordem e o peso dos dois downloads do ADR 0001, e a
 * imagem que diz que a fonte caiu em vez de quebrar (RNF-07).
 */

afterEach(cleanup);

// --- botão só com ícone ---------------------------------------------------------------

describe("BotaoIcone", () => {
  it("o nome acessível é o rótulo, não o desenho", () => {
    render(<BotaoIcone rotulo="Copiar link" icone={<Download aria-hidden="true" />} />);
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeTruthy();
  });

  it("a dica pode dizer outra coisa sem trocar o nome", () => {
    render(
      <BotaoIcone rotulo="Copiar link" dica="Link copiado" icone={<Download aria-hidden="true" />} />,
    );
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeTruthy();
  });

  it("sem hover, foco nem dicaAberta, a dica não está na tela", () => {
    render(<BotaoIcone rotulo="Copiar link" icone={<Download aria-hidden="true" />} />);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("dicaAberta mostra a dica sem hover — é assim que ela responde a um clique", () => {
    render(
      <BotaoIcone
        rotulo="Copiar link"
        dica="Link copiado"
        dicaAberta
        icone={<Download aria-hidden="true" />}
      />,
    );
    expect(screen.getByRole("tooltip").textContent).toBe("Link copiado");
  });

  it("é um quadrado do tamanho de controle do design", () => {
    render(<BotaoIcone rotulo="Fechar" icone={<Download aria-hidden="true" />} />);
    const classe = screen.getByRole("button", { name: "Fechar" }).className;
    expect(classe).toContain("h-controle-md");
    expect(classe).toContain("w-controle-md");
  });
});

// --- as duas formas de baixar (ADR 0001) ----------------------------------------------

describe("ParDeDownload", () => {
  it("\"Baixar PNG\" é o primário e vem primeiro; \"Original\" ao lado (Plano de Design, §5)", () => {
    render(<ParDeDownload podeConverter onOriginal={() => {}} onPng={() => {}} />);
    const [png, original] = screen.getAllByRole("button");
    expect(png.textContent).toContain("Baixar PNG");
    expect(png.className).toContain("bg-acento");
    expect(original.textContent).toBe("Original");
    expect(original.getAttribute("aria-label")).toBe("Baixar original");
  });

  it("origem PNG: um botão só, que entrega o original sem conversão (RF-12, emendado)", () => {
    const onOriginal = vi.fn();
    const onPng = vi.fn();
    render(<ParDeDownload podeConverter={false} onOriginal={onOriginal} onPng={onPng} />);
    const botoes = screen.getAllByRole("button");
    expect(botoes).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Baixar PNG" }));
    expect(onOriginal).toHaveBeenCalledTimes(1);
    expect(onPng).not.toHaveBeenCalled();
  });

  it("download em andamento trava os dois", () => {
    render(<ParDeDownload podeConverter ocupado onOriginal={() => {}} onPng={() => {}} />);
    for (const botao of screen.getAllByRole("button")) {
      expect((botao as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("cada botão chama a sua forma de baixar", () => {
    const onOriginal = vi.fn();
    const onPng = vi.fn();
    render(<ParDeDownload podeConverter onOriginal={onOriginal} onPng={onPng} />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar original" }));
    fireEvent.click(screen.getByRole("button", { name: "Baixar PNG" }));
    expect(onOriginal).toHaveBeenCalledTimes(1);
    expect(onPng).toHaveBeenCalledTimes(1);
  });
});

// --- imagem que não quebra (RNF-07) ----------------------------------------------------

describe("Imagem", () => {
  const SRC = "https://fonte.invalida/Jax.png";

  it("começa carregando: a imagem já existe, ainda transparente", () => {
    render(<Imagem src={SRC} alt="Prévia de Jax" data-previa="square" />);
    const imagem = screen.getByRole("img", { name: "Prévia de Jax" });
    expect(imagem.getAttribute("data-previa")).toBe("square");
    expect(imagem.className).toContain("opacity-0");
  });

  it("quando os bytes chegam, aparece", () => {
    render(<Imagem src={SRC} alt="Prévia de Jax" />);
    fireEvent.load(screen.getByRole("img", { name: "Prévia de Jax" }));
    expect(screen.getByRole("img", { name: "Prévia de Jax" }).className).toContain("opacity-100");
  });

  it("quando a fonte falha, diz isso em vez de mostrar um quadrado quebrado", () => {
    render(<Imagem src={SRC} alt="Prévia de Jax" />);
    fireEvent.error(screen.getByRole("img", { name: "Prévia de Jax" }));

    expect(screen.getByText("A fonte não respondeu")).toBeTruthy();
    // O nome continua lá para o leitor de tela, agora na caixa.
    expect(screen.getByRole("img", { name: "Prévia de Jax" }).tagName).toBe("DIV");
  });

  it("o tamanho mora na caixa, para nada pular quando a imagem chega", () => {
    const { container } = render(
      <Imagem src={SRC} alt="Prévia de Jax" classeDaCaixa="h-18 w-24" />,
    );
    expect(container.firstElementChild!.className).toContain("h-18");
  });

  it("decorativa (alt vazio) cai calada: o leitor de tela não ganha imagem sem nome (T-46)", () => {
    const { container } = render(<Imagem src={SRC} alt="" />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
  });

  it("erro compacto mostra só o ícone, para miniatura onde a frase não cabe (T-46)", () => {
    render(<Imagem src={SRC} alt="Jax" erroCompacto />);
    fireEvent.error(screen.getByRole("img", { name: "Jax" }));
    expect(screen.queryByText("A fonte não respondeu")).toBeNull();
    expect(screen.getByRole("img", { name: "Jax" }).tagName).toBe("DIV");
  });
});

// --- esqueleto --------------------------------------------------------------------------

describe("Esqueleto", () => {
  it("é decorativo e pulsa", () => {
    const { container } = render(<Esqueleto className="h-10" />);
    const esqueleto = container.firstElementChild!;
    expect(esqueleto.getAttribute("aria-hidden")).toBe("true");
    expect(esqueleto.className).toContain("animate-pulsar");
  });
});
