"use client";

/**
 * O botão Voltar fecha a camada de cima, em vez de sair do site (T-70).
 *
 * O painel do campeão, a categoria e a ampliação abrem por cima da tela sem
 * mudar a URL. Medido na produção em 21/09/2026: com qualquer um deles aberto,
 * Voltar levava para **fora do site** — e no telefone, onde o painel ocupa a
 * tela inteira, Voltar é o gesto de fechar.
 *
 * Cada camada aberta empilha uma entrada no histórico, **na mesma URL**: nada de
 * link novo, o produto não ganha endereço para cada campeão. Voltar tira a de
 * cima e fecha a camada dela. Fechar pelo × ou pelo Esc consome a entrada, para
 * que o Voltar seguinte não fique mudo — é o `history.go(-n)` abaixo, e o
 * `popstate` que ele provoca é ignorado.
 *
 * Uma pilha só, no módulo: o `popstate` chega a todo mundo, e só a camada do
 * topo pode reagir a ele.
 */
import { useEffect, useRef } from "react";

const pilha: number[] = [];
const fechadores = new Map<number, () => void>();
let proxima = 0;
let ignorar = 0;
let aConsumir = 0;
let ouvindo = false;

function aoVoltar() {
  if (ignorar > 0) {
    ignorar -= 1;
    return;
  }
  const topo = pilha.pop();
  if (topo === undefined) return;
  const fechar = fechadores.get(topo);
  fechadores.delete(topo);
  fechar?.();
}

function consumir() {
  aConsumir += 1;
  // Várias camadas fechando no mesmo gesto viram um passo só no histórico.
  if (aConsumir > 1) return;
  queueMicrotask(() => {
    const n = aConsumir;
    aConsumir = 0;
    ignorar += 1;
    history.go(-n);
  });
}

/**
 * Enquanto `aberta`, a camada tem uma entrada no histórico, e Voltar chama
 * `fechar`. Quem fecha por outro caminho só precisa deixar `aberta` virar falso.
 */
export function useFecharComVoltar(aberta: boolean, fechar: () => void): void {
  const fecharAtual = useRef(fechar);
  useEffect(() => {
    fecharAtual.current = fechar;
  });

  useEffect(() => {
    if (!aberta) return;
    if (!ouvindo) {
      window.addEventListener("popstate", aoVoltar);
      ouvindo = true;
    }
    proxima += 1;
    const id = proxima;
    pilha.push(id);
    fechadores.set(id, () => fecharAtual.current());
    history.pushState({ ...history.state, camada: id }, "");

    return () => {
      // Já saiu pelo Voltar: a entrada foi embora com ele.
      if (!fechadores.has(id)) return;
      fechadores.delete(id);
      const posicao = pilha.indexOf(id);
      if (posicao >= 0) pilha.splice(posicao, 1);
      consumir();
    };
  }, [aberta]);
}
