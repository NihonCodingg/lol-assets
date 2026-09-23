import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { confirmar, DURACAO_MS, RegiaoDeConfirmacoes } from "./confirmacoes";
import { ControleSegmentado } from "./controle-segmentado";
import { MarcadorDeCategoria } from "./etiqueta-de-categoria";
import { Marca } from "./marca";
import { GlifoDeProporcao, MarcasDeCorte } from "./quadro";

/** Os primitivos da Fase 2 do redesenho (T-79, ADR 0024). */

afterEach(cleanup);

describe("glifo de proporção", () => {
  const retangulo = (largura: number, altura: number) => {
    const { container } = render(<GlifoDeProporcao largura={largura} altura={altura} />);
    const rect = container.querySelector("rect")!;
    return { w: Number(rect.getAttribute("width")), h: Number(rect.getAttribute("height")), container };
  };

  it("desenha a proporção do arquivo: a splash é larga, a tela de carregamento é alta", () => {
    const splash = retangulo(1280, 720);
    expect(splash.w / splash.h).toBeGreaterThan(1.6);
    const loading = retangulo(308, 560);
    expect(loading.h / loading.w).toBeGreaterThan(1.6);
    const square = retangulo(120, 120);
    expect(square.w).toBeCloseTo(square.h);
  });

  it("é decorativo: a resolução escrita ao lado é que tem nome", () => {
    const { container } = retangulo(1280, 720);
    expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("sem dimensão, diz que não sabe — tracejado, e não um quadrado mentiroso", () => {
    const { container } = render(<GlifoDeProporcao largura={0} altura={0} />);
    expect(container.querySelector("svg")!.dataset.glifo).toBe("desconhecido");
    expect(container.querySelector("rect")!.getAttribute("stroke-dasharray")).not.toBeNull();
  });
});

describe("marcas de corte", () => {
  it("são quatro cantos, decorativos e fora do caminho do ponteiro", () => {
    const { container } = render(<MarcasDeCorte />);
    const marcas = container.firstElementChild as HTMLElement;
    expect(marcas.getAttribute("aria-hidden")).toBe("true");
    expect(marcas.className).toContain("pointer-events-none");
    expect(marcas.children).toHaveLength(4);
  });

  it("dentro do tile, invertem a arte embaixo: aparecem sobre imagem clara e escura", () => {
    const { container } = render(<MarcasDeCorte lado="dentro" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("mix-blend-difference");
  });
});

describe("controle segmentado", () => {
  const OPCOES = [
    { valor: "todas", rotulo: "Todas" },
    { valor: "mago", rotulo: "Mago", contagem: 75 },
  ] as const;

  it("é um grupo de rádios com nome, e a contagem não entra no nome da opção", () => {
    render(<ControleSegmentado rotulo="Função" opcoes={OPCOES} valor="todas" onMudar={() => {}} />);
    expect(screen.getByRole("group", { name: "Função" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Todas" })).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: "Mago" })).toHaveProperty("checked", false);
  });

  it("escolher avisa com o valor", () => {
    const onMudar = vi.fn();
    render(<ControleSegmentado rotulo="Função" opcoes={OPCOES} valor="todas" onMudar={onMudar} />);
    fireEvent.click(screen.getByRole("radio", { name: "Mago" }));
    expect(onMudar).toHaveBeenCalledWith("mago");
  });
});

describe("etiqueta de categoria", () => {
  it("cada categoria tem a sua cor, e a cor é decorativa", () => {
    const { container } = render(
      <>
        <MarcadorDeCategoria categoria="item" />
        <MarcadorDeCategoria categoria="rune" />
      </>,
    );
    const [item, runa] = [...container.querySelectorAll("span")];
    expect(item.className).toContain("bg-etiqueta-itens");
    expect(runa.className).toContain("bg-etiqueta-runas");
    expect(item.getAttribute("aria-hidden")).toBe("true");
  });

  it("categoria nova cai no cinza, e não numa cor emprestada", () => {
    const { container } = render(<MarcadorDeCategoria categoria="misc" />);
    expect(container.firstElementChild!.className).toContain("bg-texto-suave");
  });
});

describe("a marca", () => {
  it("tem o nome do produto em texto, e o símbolo é decorativo", () => {
    const { container } = render(<Marca />);
    expect(container.textContent).toBe("Biblioteca de Assets");
    expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("avisos de confirmação", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a região existe antes do aviso, e o aviso diz o nome real do arquivo", () => {
    vi.useFakeTimers();
    render(<RegiaoDeConfirmacoes />);
    const regiao = screen.getByRole("status");
    expect(regiao.textContent).toBe("");
    act(() => {
      confirmar("Baixado: Ahri_Arcana_splash.png");
    });
    expect(regiao.textContent).toContain("Baixado: Ahri_Arcana_splash.png");
    act(() => {
      vi.advanceTimersByTime(DURACAO_MS);
    });
    expect(regiao.textContent).toBe("");
  });

  it("no máximo três na tela", () => {
    vi.useFakeTimers();
    render(<RegiaoDeConfirmacoes />);
    act(() => {
      for (let i = 1; i <= 5; i += 1) confirmar(`Baixado: ${i}.png`);
    });
    const avisos = screen.getByRole("status").querySelectorAll("p");
    expect([...avisos].map((a) => a.textContent)).toEqual(["Baixado: 3.png", "Baixado: 4.png", "Baixado: 5.png"]);
    act(() => {
      vi.advanceTimersByTime(DURACAO_MS);
    });
  });
});
