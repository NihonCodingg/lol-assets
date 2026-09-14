# ADR 0017 — Ícones: lucide-react

- **Status:** aceito
- **Data:** 2026-09-14
- **Ticket:** T-45, primeiro da Onda 7 (o redesenho do front)
- **Emenda:** [ADR 0011](0011-base-de-componentes-do-front.md), que pede ADR para qualquer
  quarta dependência de UI

## Contexto

O redesenho do front precisa de ícones: baixar, copiar link, buscar, fechar, a imagem que não
carregou, as categorias da barra lateral. Hoje a interface usa caracteres soltos — `⌕`, `×`,
`+`, `✓` —, que mudam de desenho de fonte para fonte, não têm peso consistente e, no caso do
`+` da seleção, não dizem nada a ninguém.

O ADR 0011 fixou três dependências de UI — shadcn/Radix, TanStack Virtual e cmdk — e pediu ADR
para uma quarta.

## Decisão

1. **`lucide-react` é o único conjunto de ícones.**
   - Traço fino, sem preenchimento, desenho neutro: nada que lembre o cliente do jogo
     ([KICKOFF §B.5.1](../KICKOFF.md)).
   - É o conjunto que o shadcn/ui usa. O que for copiado do shadcn já vem no mesmo desenho.
   - Import por nome (`import { Download } from "lucide-react"`): o bundle leva só o que é usado.
2. **Ícone é sempre decorativo** (`aria-hidden`). O nome de um controle é o texto dele ou o
   `rotulo` do `BotaoIcone` — nunca o desenho.
3. **Tamanhos:** 14 px dentro de botão com texto, 16 px em botão só com ícone, 20 px no máximo.
4. **Radix Tooltip** entra pelo ADR 0011, que já lista "tooltip" entre as primitivas Radix. Não
   precisa de ADR próprio.

## Consequências

- Um vocabulário visual só para ação e estado, em todas as telas.
- Cerca de 1 KB por ícone usado, no bundle do cliente.
- Ícone novo não precisa de decisão; conjunto novo precisa, e este ADR é o precedente.

## Alternativas descartadas

- **Tabler Icons:** equivalente em qualidade, mas fora do ecossistema do shadcn.
- **Heroicons:** poucos ícones de estado de mídia (imagem quebrada, arquivo, link).
- **SVG desenhado à mão:** traço e grade inconsistentes a cada ícone novo.
- **Continuar com caracteres:** é o problema que este ADR resolve.
