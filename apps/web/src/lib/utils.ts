/**
 * `cn` — o utilitário que o shadcn/ui espera encontrar aqui ([ADR 0011]).
 *
 * `clsx` resolve condicional; `twMerge` resolve conflito. Sem o segundo,
 * `cn("px-2", props.className)` com `px-4` vindo de fora deixa as duas classes
 * no elemento e quem vence é a ordem do CSS gerado, não a intenção de quem
 * chamou.
 *
 * ## Por que o `twMerge` precisa ser ensinado
 *
 * Os tamanhos de texto do design são `text-11` … `text-26`, e o `tailwind-merge`
 * não tem como saber que `text-12` é **tamanho** e `text-fundo` é **cor** —
 * os dois começam com `text-`. Sem a configuração abaixo ele trata os dois como
 * o mesmo grupo e descarta o primeiro.
 *
 * O sintoma foi exatamente este: o botão primário perdeu `text-fundo`,
 * herdou o branco do corpo e passou a ter **3,1:1** de contraste sobre o acento
 * em vez de 4,64:1. Nenhum teste de unidade pegou — quem pegou foi o axe do
 * T-28, no e2e, porque só ali as classes viram cor de verdade.
 *
 * As medidas com nome (`h-controle-md`, `size-controle-min`) são o mesmo caso,
 * com o sinal trocado: sem conhecê-las, o `twMerge` não vê conflito e **mantém
 * as duas**, e quem vence é a ordem do CSS. `cn("h-controle-lg", "h-controle-md")`
 * saía com as duas classes (T-48).
 */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    // As `--spacing-*` do `globals.css`, pelo nome.
    theme: {
      spacing: [
        "controle-min",
        "controle-xs",
        "controle-sm",
        "controle-md",
        "controle",
        "controle-lg",
        "controle-xl",
        "barra",
        "paleta-rodape",
        "paleta-campo",
        "cabecalho",
        "bandeja",
        "topo",
        "barra-lateral",
        "busca-max",
        "alvo-cartao-denso",
        "alvo-cartao-confortavel",
      ],
    },
    classGroups: {
      "font-size": [{ text: ["11", "12", "13", "14", "15", "16", "20", "26"] }],
    },
  },
});

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

/**
 * Alvo de toque de 44 px num controle que, à vista, tem menos (T-66).
 *
 * Os chips de filtro e os botões da barra têm 28 px: crescer de verdade custaria
 * 16 px de cromo em cada linha, acima da arte. Em tela de toque, uma área
 * invisível de 44 px de altura, centrada no controle, recebe o dedo; o desenho
 * não muda. É o mesmo truque da caixa do lote (T-49).
 *
 * Quem contém numa linha que rola de lado precisa de `ROLA_SEM_CORTAR_O_TOQUE`:
 * `overflow-x: auto` corta também na vertical, e a área sairia cortada.
 */
export const ALVO_DE_TOQUE =
  "relative pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:top-1/2 pointer-coarse:before:h-controle-xl pointer-coarse:before:-translate-y-1/2 pointer-coarse:before:content-['']";

/** Oito pixels de respiro por dentro, devolvidos por fora: o layout não muda. */
export const ROLA_SEM_CORTAR_O_TOQUE = "max-md:-my-2 max-md:py-2";
