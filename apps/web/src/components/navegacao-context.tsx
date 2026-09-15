"use client";

/**
 * Onde a barra lateral e o conteúdo combinam qual categoria está aberta (T-41).
 *
 * ## Por que precisa de contexto
 *
 * O design põe as categorias na barra lateral e mostra **uma grade por vez** no
 * meio. Só que a barra lateral vive no `layout.tsx` — é o único caminho por onde
 * toda página passa, e é por isso que o aviso legal do RF-21 mora lá — enquanto
 * a lista de categorias só existe depois que a **página** carrega o manifesto.
 *
 * Um não pode passar prop para o outro: layout não recebe nada de página. Então
 * os dois falam por aqui. É a menor peça que resolve, e ela é do tamanho de uma
 * tela: três campos e duas funções.
 *
 * ## O padrão sem provedor é proposital
 *
 * `Rodape` é renderizado direto no teste do T-27, sem provedor. Com o padrão
 * vazio ele desenha o resto da barra e nenhuma categoria — que é exatamente o
 * certo, e mantém aquele teste passando sem saber que este arquivo existe.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { AssetCategory } from "@lol-assets/schema";

import type { Categoria } from "@/lib/categorias";

export interface Navegacao {
  /** As categorias que o manifesto declara. Vazio até a página carregar. */
  readonly categorias: readonly Categoria[];
  /** Quantos campeões o catálogo tem — a contagem de "Campeões" na barra (T-46). */
  readonly campeoes: number | null;
  /** `null` = a grade de campeões, que é a home ([ADR 0010], RF-04). */
  readonly aberta: AssetCategory | null;
  readonly abrir: (categoria: AssetCategory | null) => void;
  readonly registrar: (categorias: readonly Categoria[], campeoes?: number) => void;
}

const VAZIO: Navegacao = {
  categorias: [],
  campeoes: null,
  aberta: null,
  abrir: () => {},
  registrar: () => {},
};

const Contexto = createContext<Navegacao>(VAZIO);

export function useNavegacao(): Navegacao {
  return useContext(Contexto);
}

export function ProvedorDeNavegacao({ children }: { children: React.ReactNode }) {
  const [categorias, setCategorias] = useState<readonly Categoria[]>([]);
  const [campeoes, setCampeoes] = useState<number | null>(null);
  const [aberta, setAberta] = useState<AssetCategory | null>(null);

  // `useCallback` porque `registrar` entra num efeito da página: sem
  // identidade estável, o efeito rodaria a cada render e o `setState` dele
  // manteria o ciclo vivo para sempre. Pelo mesmo motivo, lista igual devolve
  // a lista de antes, e o React não redesenha nada.
  const registrar = useCallback((proximas: readonly Categoria[], totalDeCampeoes?: number) => {
    setCategorias((antes) =>
      antes.length === proximas.length &&
      antes.every(
        (c, i) => c.category === proximas[i].category && c.total === proximas[i].total,
      )
        ? antes
        : proximas,
    );
    setCampeoes(totalDeCampeoes ?? null);
  }, []);

  const valor = useMemo<Navegacao>(
    () => ({ categorias, campeoes, aberta, abrir: setAberta, registrar }),
    [categorias, campeoes, aberta, registrar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
