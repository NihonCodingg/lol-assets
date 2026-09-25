"use client";

/**
 * Os avisos de confirmação: "Baixado: Ahri_Arcana_splash.png", "Link copiado"
 * (§6 do Plano de Design, autorizado por ele).
 *
 * O nome real do arquivo vai no aviso, para o editor saber o que procurar na
 * pasta. A ação mantém o nome do botão até aqui: o botão diz "Baixar", o aviso
 * diz "Baixado".
 *
 * Quem avisa chama `confirmar(texto)` de qualquer lugar — o botão de download
 * não precisa conhecer a região. A região mora no layout, uma só, e é um
 * `role="status"` que existe desde a chegada: região viva criada junto com o
 * texto não é anunciada por todo leitor de tela.
 *
 * Fica no canto de baixo, **acima** do aviso de patch novo e da barra do lote,
 * sem sombra (a superfície elevada basta) e sem roubar o foco. Cada aviso some
 * sozinho em 4 s; no máximo três na tela.
 */

import { Check, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** `falha` troca o ✓ por um alerta: o texto diz o que houve, o ícone não mente. */
export type Tom = "ok" | "falha";

export interface Confirmacao {
  readonly id: number;
  readonly texto: string;
  readonly tom: Tom;
}

export const DURACAO_MS = 4000;
const MAXIMO = 3;

let lista: readonly Confirmacao[] = [];
let proximoId = 1;
const ouvintes = new Set<() => void>();

function avisarOuvintes(): void {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Mostra uma confirmação e a tira depois de `DURACAO_MS`. Devolve o id. */
export function confirmar(texto: string, tom: Tom = "ok"): number {
  const id = proximoId++;
  lista = [...lista, { id, texto, tom }].slice(-MAXIMO);
  avisarOuvintes();
  setTimeout(() => {
    lista = lista.filter((c) => c.id !== id);
    avisarOuvintes();
  }, DURACAO_MS);
  return id;
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

const VAZIA: readonly Confirmacao[] = [];

export function RegiaoDeConfirmacoes() {
  const atuais = useSyncExternalStore(
    assinar,
    () => lista,
    () => VAZIA,
  );
  return (
    <div
      role="status"
      aria-live="polite"
      data-confirmacoes=""
      className={cn(
        "pointer-events-none fixed right-3 bottom-20 left-3 z-50 flex flex-col items-end gap-1.5",
        "md:left-auto md:right-4 md:bottom-24 md:w-[380px]",
      )}
    >
      {atuais.map((c) => (
        <p
          key={c.id}
          className={cn(
            "flex max-w-full items-center gap-2 rounded-controle border border-linha-forte bg-superficie-alta px-3 py-2 text-14 text-texto",
            "animate-[surgir_160ms_var(--ease-saida)]",
          )}
        >
          {c.tom === "ok" ? (
            <Check aria-hidden="true" strokeWidth={2} className="size-4 flex-none text-acento" />
          ) : (
            <TriangleAlert aria-hidden="true" strokeWidth={2} className="size-4 flex-none text-texto" />
          )}
          <span className="min-w-0 [overflow-wrap:anywhere]">{c.texto}</span>
        </p>
      ))}
    </div>
  );
}
