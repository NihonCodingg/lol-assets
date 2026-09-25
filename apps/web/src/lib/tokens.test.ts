import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O tema do Tailwind bate com `docs/design/TOKENS.md` **valor a valor**, e a
 * paleta do [ADR 0024] passa no contraste que ela promete.
 *
 * A comparação é nos dois sentidos de propósito: token no CSS que não está no
 * documento é token não documentado; token no documento que não está no CSS é
 * decisão de design que ninguém implementou. Os dois são defeito.
 */

// `process.cwd()` é `apps/web` quando o vitest roda; `import.meta.url` não é
// URL de arquivo dentro do jsdom.
const raiz = resolve(process.cwd(), "../..");
const TOKENS = readFileSync(resolve(raiz, "docs/design/TOKENS.md"), "utf-8");
const CSS = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf-8");

/** `| \`nome\` | \`#valor\` |` → { nome: valor }. Só linhas de tabela. */
function coresDoDocumento(): Map<string, string> {
  const cores = new Map<string, string>();
  for (const linha of TOKENS.split("\n")) {
    const achado = /^\|\s*`([a-z-]+)`\s*\|\s*`(#[0-9a-f]{6})`\s*\|/i.exec(linha);
    if (achado) cores.set(achado[1], achado[2].toLowerCase());
  }
  return cores;
}

/** `--color-nome: #valor;` → { nome: valor }. */
function coresDoTema(): Map<string, string> {
  const cores = new Map<string, string>();
  for (const achado of CSS.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)) {
    cores.set(achado[1], achado[2].toLowerCase());
  }
  return cores;
}

const DOC = coresDoDocumento();
const TEMA = coresDoTema();
const cor = (nome: string): string => {
  const valor = TEMA.get(nome);
  if (!valor) throw new Error(`--color-${nome} não existe no tema`);
  return valor;
};

// --- paridade -------------------------------------------------------------------------

describe("tokens de cor", () => {
  it("o documento e o tema declaram os mesmos nomes", () => {
    expect([...TEMA.keys()].sort()).toEqual([...DOC.keys()].sort());
  });

  it("cada nome tem o mesmo valor nos dois", () => {
    for (const [nome, valor] of TEMA) {
      expect(DOC.get(nome), `--color-${nome} divergiu do TOKENS.md`).toBe(valor);
    }
  });

  it("são 21 cores: 4 superfícies, 2 linhas, 2 textos, 3 destaques, 2 do xadrez e 8 etiquetas", () => {
    expect(TEMA.size).toBe(21);
  });
});

describe("raios e tamanhos", () => {
  /** Todo `Npx` que o documento cita numa tabela de token. */
  function pixelsDoDocumento(): Set<string> {
    const valores = new Set<string>();
    for (const linha of TOKENS.split("\n")) {
      const achado = /^\|\s*`([a-z0-9-]+)`\s*\|\s*(\d+px)\s*\|/i.exec(linha);
      if (achado) valores.add(achado[2]);
    }
    return valores;
  }

  it("todo px do documento existe no tema", () => {
    const noTema = new Set([...CSS.matchAll(/:\s*(\d+px);/g)].map((m) => m[1]));
    for (const valor of pixelsDoDocumento()) {
      expect(noTema.has(valor), `${valor} está no TOKENS.md e não no tema`).toBe(true);
    }
  });

  it("o raio é uma hierarquia: quadro < controle < painel", () => {
    const raio = (nome: string) => Number(new RegExp(`--radius-${nome}: (\\d+)px;`).exec(CSS)?.[1]);
    expect(raio("quadro")).toBeLessThan(raio("controle"));
    expect(raio("controle")).toBeLessThan(raio("painel"));
  });
});

// --- um destaque, e oito etiquetas que não viram destaque -----------------------------

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Matiz HSL de um hex, em graus. */
function matiz(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) % 360) + 360) % 360;
}

function saturacao(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

const distancia = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe("destaque", () => {
  const acentos = [...TEMA].filter(([nome]) => nome.startsWith("acento"));
  const etiquetas = [...TEMA].filter(([nome]) => nome.startsWith("etiqueta-"));

  it("os tons de destaque são o mesmo matiz — um segundo destaque faz este teste falhar", () => {
    const base = matiz(cor("acento"));
    for (const [nome, valor] of acentos) {
      expect(distancia(matiz(valor), base), `${nome} destoa do destaque`).toBeLessThan(10);
    }
  });

  it("o destaque é magenta: nem roxo, nem vermelhão (ADR 0024)", () => {
    // Magenta de marcador: entre 300° e 345° no HSL. Roxo fica abaixo, vermelhão acima.
    const h = matiz(cor("acento"));
    expect(h).toBeGreaterThan(300);
    expect(h).toBeLessThan(345);
  });

  it("fora do destaque e das etiquetas, tudo é cinza", () => {
    for (const [nome, valor] of TEMA) {
      if (nome.startsWith("acento") || nome.startsWith("etiqueta-")) continue;
      expect(saturacao(valor), `${nome} (${valor}) está saturada demais`).toBeLessThan(0.2);
    }
  });

  it("são oito etiquetas, e nenhuma está a menos de 40° do destaque", () => {
    expect(etiquetas).toHaveLength(8);
    for (const [nome, valor] of etiquetas) {
      expect(distancia(matiz(valor), matiz(cor("acento"))), nome).toBeGreaterThanOrEqual(40);
    }
  });
});

// --- contraste ------------------------------------------------------------------------

function canal(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map(canal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("contraste", () => {
  /** Os fundos sobre os quais o produto escreve texto secundário. */
  const FUNDOS = ["fundo", "superficie", "superficie-alta"];

  it("texto e texto secundário passam em AA em todo fundo de texto", () => {
    for (const texto of ["texto", "texto-suave"]) {
      for (const fundo of FUNDOS) {
        const razao = contraste(cor(texto), cor(fundo));
        expect(razao, `${texto} sobre ${fundo} = ${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("sobre o `campo` os dois textos passam (T-89)", () => {
    expect(contraste(cor("texto"), cor("campo"))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cor("texto-suave"), cor("campo"))).toBeGreaterThanOrEqual(4.5);
  });

  it("o texto secundário lê com folga: ao menos 6:1 em todo fundo de texto (T-89)", () => {
    for (const fundo of ["fundo", "superficie", "superficie-alta"]) {
      expect(contraste(cor("texto-suave"), cor(fundo)), fundo).toBeGreaterThanOrEqual(6);
    }
  });

  it("o botão primário passa: o fundo escrito sobre o destaque", () => {
    expect(contraste(cor("fundo"), cor("acento"))).toBeGreaterThanOrEqual(4.5);
  });

  it("o destaque passa como texto em todo fundo de texto", () => {
    for (const fundo of FUNDOS) {
      expect(contraste(cor("acento"), cor(fundo)), fundo).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("o texto passa sobre o fundo de selecionado", () => {
    expect(contraste(cor("texto"), cor("acento-suave"))).toBeGreaterThanOrEqual(4.5);
  });

  it("as etiquetas têm a mesma luminosidade e passam de 3:1 na superfície", () => {
    const razoes = [...TEMA]
      .filter(([nome]) => nome.startsWith("etiqueta-"))
      .map(([, valor]) => contraste(valor, cor("superficie")));
    expect(Math.min(...razoes)).toBeGreaterThanOrEqual(3);
    // A mesma luminosidade em OKLCH dá uma faixa estreita em contraste WCAG.
    expect(Math.max(...razoes) - Math.min(...razoes)).toBeLessThan(0.75);
  });
});

// --- as guardas do ADR 0024 -------------------------------------------------------------

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

const COMPONENTES = arquivos(resolve(process.cwd(), "src")).map((arquivo) => ({
  arquivo,
  texto: readFileSync(arquivo, "utf-8"),
}));

const culpados = (padrao: RegExp) => COMPONENTES.filter((c) => padrao.test(c.texto)).map((c) => c.arquivo);

describe("o que o ADR 0024 tirou não volta", () => {
  it("nenhum componente usa mono", () => {
    expect(culpados(/\bfont-mono\b/)).toEqual([]);
  });

  it("nenhum componente escreve em caixa-alta", () => {
    expect(culpados(/\buppercase\b/)).toEqual([]);
  });

  it("nenhum componente põe sombra de elevação", () => {
    expect(culpados(/\bshadow-(?:sm|md|lg|xl|2xl|\[)/)).toEqual([]);
  });

});
