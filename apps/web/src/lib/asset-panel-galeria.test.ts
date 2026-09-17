import { describe, expect, it } from "vitest";

import { colunasDaGaleria, medidasDaGaleria, VAO_DA_GALERIA } from "./asset-panel";

/**
 * As medidas da galeria das categorias (T-48).
 *
 * A altura do tile é uma só por lista, e sai dos arquivos dela: é o que deixa a
 * galeria virtualizar por linha sem medir nada ([ADR 0011]). Os tamanhos abaixo
 * são os medidos no índice do patch 16.18.1.
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

  it("o tile é a prévia mais o texto embaixo", () => {
    const { alturaDaPrevia, alturaDoTile } = medidasDaGaleria(lado(64));
    expect(alturaDoTile - alturaDaPrevia).toBe(72);
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

  it("o tile nunca é mais estreito que as ações dele", () => {
    expect(icones.larguraMinima).toBeGreaterThanOrEqual(176);
  });

  it("ward, que é mais alta que larga, pede tile mais largo que ícone", () => {
    const wards = medidasDaGaleria([{ width: 460, height: 550 }]);
    expect(wards.larguraMinima).toBeGreaterThan(icones.larguraMinima);
  });

  it("num telefone, duas colunas em vez de uma", () => {
    // 390 px de tela menos o respiro dos lados.
    expect(colunasDaGaleria(362, icones)).toBe(2);
  });
});
