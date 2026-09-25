import { describe, expect, it } from "vitest";

import {
  colunasDaGaleria,
  larguraDaColuna,
  medidasDaGaleria,
  medidasNaColuna,
  VAO_DA_GALERIA,
} from "./asset-panel";

/**
 * As medidas da galeria das categorias (T-48, revistas no T-53).
 *
 * A altura do tile é uma só por lista, e sai dos arquivos dela: é o que deixa a
 * galeria virtualizar por linha sem medir nada ([ADR 0011]). Os tamanhos abaixo
 * são os medidos no índice do patch 16.18.1.
 *
 * O T-53 tirou das ações o poder de decidir a largura do tile: abaixo de 176 px
 * elas viram ícone, e a altura da prévia passa a caber na coluna em vez de ser
 * um teto fixo por categoria.
 */

const lado = (n: number, quantos = 1) => Array.from({ length: quantos }, () => ({ width: n, height: n }));

describe("a altura do tile", () => {
  it("ícone de 64 px ganha prévia pequena, e não fica perdido numa caixa grande", () => {
    expect(medidasDaGaleria(lado(64, 3)).alturaDaPrevia).toBe(96);
  });

  it("emote e ícone de perfil ganham prévia média", () => {
    expect(medidasDaGaleria(lado(256, 3)).alturaDaPrevia).toBe(136);
    expect(medidasDaGaleria(lado(300, 3)).alturaDaPrevia).toBe(136);
  });

  it("ward e mapa, que são arte grande, ganham prévia grande", () => {
    expect(medidasDaGaleria([{ width: 460, height: 550 }]).alturaDaPrevia).toBe(232);
    expect(medidasDaGaleria(lado(1024)).alturaDaPrevia).toBe(232);
  });

  it("é a mediana que decide: um item de 512 px não aumenta os outros 865", () => {
    const itens = [...lado(64, 865), ...lado(128, 2), ...lado(512)];
    expect(medidasDaGaleria(itens).alturaDaPrevia).toBe(96);
  });

  /**
   * Eram 72 px até o T-53: nome, ficha em duas linhas e o respiro das duas. A
   * ficha subiu para a faixa que aparece sobre a arte, junto das ações, e o que
   * sobra embaixo é o nome numa linha.
   */
  it("embaixo da prévia sobra o nome numa linha, e só", () => {
    const { alturaDaPrevia, alturaDoTile } = medidasDaGaleria(lado(64));
    expect(alturaDoTile - alturaDaPrevia).toBe(40);
  });

  it("lista vazia não quebra", () => {
    expect(medidasDaGaleria([]).alturaDoTile).toBeGreaterThan(0);
  });
});

describe("as colunas", () => {
  const icones = medidasDaGaleria(lado(64));

  it("nunca menos que uma — nem com a largura zero do jsdom", () => {
    expect(colunasDaGaleria(0, icones)).toBe(1);
  });

  it("cabe quantas a largura mínima deixar, contando o vão", () => {
    const { larguraMinima } = icones;
    expect(colunasDaGaleria(4 * larguraMinima + 3 * VAO_DA_GALERIA, icones)).toBe(4);
    expect(colunasDaGaleria(4 * larguraMinima + 3 * VAO_DA_GALERIA - 1, icones)).toBe(3);
  });

  /**
   * O que mudou no T-53. Antes o tile de um ícone de 64 px tinha 176 px de
   * largura porque "Original", "PNG" e o copiar não cabiam em menos — a arte
   * ocupava 13% do tile. Agora as ações viram ícone e a arte manda.
   */
  it("com ícone de 64 px o tile encolhe, e as ações viram ícone", () => {
    expect(icones.larguraMinima).toBe(112);
    expect(icones.acoesComRotulo).toBe(false);
    // 1.232 px é a lista numa tela de 1440: seis colunas antes, dez agora.
    expect(colunasDaGaleria(1232, icones)).toBe(10);
  });

  it("onde a arte é grande, as ações continuam escritas", () => {
    const wards = medidasDaGaleria([{ width: 460, height: 550 }]);
    expect(wards.larguraMinima).toBeGreaterThanOrEqual(176);
    expect(wards.acoesComRotulo).toBe(true);
  });

  it("ward, que é mais alta que larga, pede tile mais largo que ícone", () => {
    const wards = medidasDaGaleria([{ width: 460, height: 550 }]);
    expect(wards.larguraMinima).toBeGreaterThan(icones.larguraMinima);
  });

  it("num telefone, três colunas de ícone em vez de duas", () => {
    // 390 px de tela menos o respiro dos lados.
    expect(colunasDaGaleria(362, icones)).toBe(3);
  });
});

describe("a altura depois que as colunas estão decididas", () => {
  it("a coluna larga não passa do teto da categoria", () => {
    const wards = medidasDaGaleria([{ width: 460, height: 550 }]);
    const { alturaDaPrevia } = medidasNaColuna(wards, 240);
    expect(alturaDaPrevia).toBe(232);
  });

  /**
   * O vazio que o T-53 tirou: 232 px de caixa para 134 px de arte, em cada um
   * dos 532 tiles de ward do telefone.
   */
  it("a coluna estreita encolhe a prévia para a arte encostar nas bordas", () => {
    const wards = medidasDaGaleria([{ width: 460, height: 550 }]);
    const { alturaDaPrevia, alturaDoTile } = medidasNaColuna(wards, 112);
    expect(alturaDaPrevia).toBe(134);
    expect(alturaDoTile).toBe(174);
  });

  it("nunca abaixo de 64 px, que é o tamanho do menor ícone do índice", () => {
    const icones = medidasDaGaleria(lado(64));
    expect(medidasNaColuna(icones, 24).alturaDaPrevia).toBe(64);
  });

  it("a largura da coluna desconta os vãos", () => {
    expect(larguraDaColuna(1232, 10)).toBe(116);
    expect(larguraDaColuna(362, 3)).toBe(115);
  });
});

describe("o nome em duas linhas (T-91)", () => {
  it("a segunda linha cresce o tile, e a arte não perde nada", () => {
    const itens = [{ width: 64, height: 64 }];
    const uma = medidasDaGaleria(itens);
    const duas = medidasDaGaleria(itens, 2);
    expect(duas.alturaDaPrevia).toBe(uma.alturaDaPrevia);
    expect(duas.alturaDoTile - uma.alturaDoTile).toBe(16);
    expect(duas.linhasDoNome).toBe(2);
  });

  it("vale também depois de caber na coluna", () => {
    const duas = medidasDaGaleria([{ width: 256, height: 256 }], 2);
    const naColuna = medidasNaColuna(duas, 100);
    expect(naColuna.alturaDoTile - naColuna.alturaDaPrevia).toBe(duas.alturaDoTile - duas.alturaDaPrevia);
  });
});
