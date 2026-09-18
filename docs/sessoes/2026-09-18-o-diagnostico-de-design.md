# Sessão 17–18/09/2026 — o diagnóstico de design, e a onda que saiu dele

O dono autorizou **uma exceção pontual** ao modo de manutenção
([ADR 0021](../adr/0021-o-projeto-entra-em-manutencao.md)), só para melhorar o design: primeiro um
diagnóstico contra os critérios do próprio projeto, sem tocar em nada; depois, com a lista
aprovada, a correção. Ao fim da onda o modo volta a valer como está — **esta exceção não é
precedente**, e nenhuma sessão futura deve citá-la para abrir trabalho de design por conta
própria.

## Como o diagnóstico foi feito

24 capturas da produção (computador 1440×900 e celular 390×844, 12 estados cada) com Playwright,
mais medição no DOM: densidade, proporção entre arte e cromo, contraste calculado pela fórmula da
WCAG, teclado e alvos de toque.

A skill de design pede duas avaliações independentes, em subagentes isolados. As duas morreram no
limite de uso da conta antes de devolver resultado, e refazê-las gastaria o limite de novo: o
diagnóstico foi feito em contexto único, o que está dito também na conversa. Onde havia palpite,
houve medição — e dois palpites caíram (abaixo).

## O que foi medido

| | Computador (1440×900) | Celular (390×844) |
|---|---|---|
| Home | 7 colunas, tile 165×203, arte 79% do tile, 28 visíveis | 2 colunas, 6 visíveis |
| Categoria Itens | 6 colunas, tile 190×168, ícone 64×64 — **arte em 13% do tile**, 30 visíveis | 2 colunas, 6 visíveis |
| Wards | 5 colunas, arte 56% | 2 colunas |
| Busca | 21 resultados em linhas de 548×52, miniatura **32×32** | miniatura 32×32 |
| Painel do campeão | 880 px, splash 967×455, 3 cartões visíveis, skins em tiles de 59 px | tela cheia, 2 cartões |
| Texto pequeno na home | 303 nós ≤13 px, 110 deles em 10–11 px, 106 em monoespaçada | — |
| Teclado | 193 focáveis, **21 Tabs** até o primeiro campeão, sem atalho para pular, sem seta na grade | — |

## A lista, em ordem de impacto

1. **A galeria de categoria é ficha técnica com miniatura** — a largura do tile vinha das ações
   (176 px), não da arte. → **T-53**.
2. **A busca, que é a home (§A.4), é a superfície menos visual** — miniatura de 32 px para
   escolher skin pela arte ([ADR 0010](../adr/0010-navegacao-por-campeao-busca-por-skin.md)).
3. **No telefone as ações cobrem a arte** — sem *hover*, a faixa ficava sempre à vista. → entrou
   no **T-53**.
4. **O passo "denso" ainda é confortável**, e no celular o controle não muda nada.
5. **Metade das wards parece vazia**: `Ward_0.png` e `Ward_0-shadow.png` mostram o mesmo nome.
6. **Itens abre filtrado (254 de 868)** sem dizer por quê.
7. **Teclado**: 21 Tabs até o primeiro campeão, sem setas na grade.
8. **Tipografia**: quatro tamanhos de texto pequeno e mono em tudo.
9. **Painel do campeão**: nomes de skin em duas linhas em tiles de 59 px; 3 cartões por vez.
10. **Vazio e erro colados no topo**, com ~700 px de vazio embaixo.
11. **O esqueleto de carregamento não parece o resultado.**
12. **O aviso legal ocupa o pé da barra lateral** — ⏸️ **fora da onda por decisão do dono**: tem
    risco legal (a política pede "readily visible") e fica com ele.

Aprovado em 18/09/2026: a lista inteira, menos o item 12. No item 6, o que muda é tornar o filtro
padrão **explícito** na tela; mudar o padrão em si continua sendo decisão dele.

## O que parecia ruim e não estava

- **O painel tem véu** sobre a home (`rgba(9,9,11,0.6)`) — a anotação inicial dizia que não tinha.
- **Contraste passa**: 303 textos pequenos medidos, nenhum abaixo de 4,5:1.
- **`/` funciona** com o foco fora do campo, e o anel de foco é violeta de 2 px, visível.
- **A ficha vem antes do download** em todo cartão, com os dois botões (RF-09, ADR 0001).
- **Não imita o cliente do jogo** (§B.5.1): sem dourado, serifa ou moldura.
- **Os ícones "sumidos"** da primeira inspeção eram do ambiente do agente — aba oculta não carrega
  imagem `lazy`. Na produção carregam.

## De onde veio a referência

Navegadores de mídia, não lojas: **Eagle** e **Adobe Bridge** (vão apertado, rótulo de uma linha,
metadado num inspetor e não no tile), **o painel de assets do Figma** (ação no *hover*, nunca
ocupando espaço fixo), **Lucide** e **Google Fonts** (grade densa, filtro numa barra só),
**Unsplash** (arte sangrando até a borda). A identidade não mudou: zinco, um violeta, Inter Tight
e JetBrains Mono, como o [TOKENS.md](../design/TOKENS.md) manda.

## O que fica para depois da onda

O modo de manutenção volta a valer sozinho, sem novo aviso. As ideias que aparecerem no caminho
vão para "Ideias não executadas", no fim do [TICKETS.md](../TICKETS.md).
