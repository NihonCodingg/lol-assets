import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A armadilha silenciosa do [ADR 0011], vigiada por varredura de fonte.
 *
 * O filtro embutido do cmdk faz um casamento difuso próprio. Ligado, ele
 * descarta `mf`, `j4` e `kda` **antes** de o nosso ranqueamento ver a consulta —
 * sem erro, sem aviso, sem teste de unidade quebrando. O sintoma seria "a busca
 * piorou" meses depois.
 *
 * O ambiente do vitest aqui é `node`, sem DOM: não dá para renderizar o
 * componente. Ler o fonte é o que sobra, e para uma regra de uma linha que não
 * pode voltar atrás, é suficiente.
 */

const PALETA = join(process.cwd(), "src/components/paleta-de-busca.tsx");
const fonte = readFileSync(PALETA, "utf-8");

describe("o filtro do cmdk fica desligado (ADR 0011)", () => {
  it("o componente declara shouldFilter={false}", () => {
    expect(fonte).toMatch(/shouldFilter=\{false\}/);
  });

  it("toda raiz <Command> desliga o filtro, não só a primeira que alguém leu", () => {
    // `<Command.List>` e companhia não contam: o filtro é da raiz.
    const raizes = fonte.match(/<Command(?![.\w])[^>]*>/g) ?? [];
    expect(raizes).toHaveLength(1);
    for (const raiz of raizes) expect(raiz).toContain("shouldFilter={false}");
    expect(fonte).not.toMatch(/shouldFilter=\{true\}/);
  });

  it("quem ordena é o nosso search, não o componente", () => {
    expect(fonte).toContain('from "@/lib/search"');
    expect(fonte).toMatch(/search\(indice, consulta/);
  });
});

describe("o atalho não escreve a barra no campo (RF-02)", () => {
  it("chama preventDefault antes de focar", () => {
    const trecho = fonte.slice(fonte.indexOf("function atalho"), fonte.indexOf("window.addEventListener"));
    expect(trecho).toContain("evento.preventDefault()");
    expect(trecho.indexOf("preventDefault")).toBeLessThan(trecho.indexOf("focus()"));
  });

  it("ignora a barra digitada dentro de um campo de texto", () => {
    expect(fonte).toContain('alvo.tagName === "INPUT"');
  });
});


describe("a lista da busca não cresce com o índice (ADR 0011, emendado no T-82)", () => {
  /**
   * A virtualização existia para as 2.118 skins que "prestígio" devolvia numa
   * lista só. Desde o T-82 a lista é agrupada: quatro por grupo, e o grupo aberto
   * tem teto. Esta guarda é o que impede a lista de voltar a desenhar tudo.
   */
  it("os resultados passam pelo agrupar, que corta cada grupo", () => {
    expect(fonte).toMatch(/agrupar\(exatos, grupoAberto\)/);
  });

  it("a altura da linha é fixa: a lista não pula quando a arte chega", () => {
    expect(fonte).toMatch(/export const ALTURA_DO_ITEM = \d+;/);
    expect(fonte).toContain("height: ALTURA_DO_ITEM");
  });
});
