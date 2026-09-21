# Sessão 21/09/2026 — a segunda rodada da frente de front-end

A segunda rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). A primeira terminou no mesmo dia
([relatório](2026-09-21-a-primeira-rodada-da-frente-de-front-end.md)). O dono disse "pode seguir".
O agente abriu um diagnóstico novo, medido antes de mexer, e executou o que ele apontou.

## O diagnóstico

Um script novo, que não muda nada, rodou contra o site no ar em quatro telas (home, busca aberta,
painel do campeão e categoria Itens). Ele media quatro coisas:

| O que mediu | Onde | Achado |
|---|---|---|
| Alvos de toque menores que 44 px | 390×844, com toque | **Chips de filtro e botões da barra com 28 px.** A marca do topo tinha 42 px. |
| Foco visível | 1440×900, percorrendo o Tab | Nenhuma parada sem anel, nas três telas |
| Paradas de Tab | idem | Home 18, painel 26, categoria 23. Não há grade sem setas. |
| Nomes com reticências | idem | **Painel: 4 legendas do seletor de skins.** Categoria: 19 nomes de item. |

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#84](https://github.com/NihonCodingg/lol-assets/pull/84) | T-65 | O seletor de skins sem o campeão repetido na legenda |
| [#85](https://github.com/NihonCodingg/lol-assets/pull/85) | T-66 | Alvo de toque de 44 px nos filtros, sem crescer à vista |

## Antes e depois, medido na produção

### T-65 — legendas do seletor de skins

A medida cobre as 2.121 skins do catálogo, com a fonte real da legenda (Inter Tight, 10 px, no
peso da skin marcada, que é o pior caso), contra os 72 px da legenda.

| | Antes | Depois |
|---|---|---|
| Legendas cortadas, catálogo inteiro | 1.488 (70%) | **761 (36%)** |
| Legendas cortadas, painel do Jax | 4 | **2** |
| Altura da faixa do seletor | — | a mesma |

A causa era o nome do campeão repetido na frente de cada skin, dentro de um painel que já é
daquele campeão. O ADR 0008 já previa o caso. O nome acessível do rádio continua sendo o inteiro.

### T-66 — alvos de toque no telefone

| | Antes | Depois |
|---|---|---|
| Controles com menos de 44 px de toque à vista na tela (home, painel, categoria, busca) | 8 / 2 / 8 / 8 | **0 / 0 / 0 / 0** |
| Altura dos chips à vista | 28 px | 28 px |
| Topo do primeiro cartão da home | 226 px | **226 px** |
| Topo do primeiro tile de Itens | 264 px | **264 px** |

No "depois" sobra um único item nas telas com busca. É o rótulo escondido de 1×1 do campo de
busca: ele existe para o leitor de tela e não é alvo de toque.

A solução não aumenta o controle. Em tela de toque, uma área invisível de 44 px recebe o dedo, e
as linhas que rolam de lado ganham respiro por dentro, devolvido por fora, para não cortá-la. As
duas medidas de topo são a prova de que o cromo não cresceu.

## O que o diagnóstico apontou e não virou ticket

- **Os 19 nomes de item cortados na galeria.** Numa linha só, com tile de 113 px, eles cortam.
  Duas linhas custariam altura em todo tile, e a arte perderia espaço, que é justamente o que a
  frente proíbe. O nome inteiro está no `title` e aparece à vista na ampliação, que é o caminho do
  toque.
- **As 761 legendas de skin que ainda cortam.** Pelo mesmo motivo: o T-58 descartou duas linhas.
  O nome inteiro aparece no título da vitrine assim que a skin é escolhida.
- **A grade do painel do campeão sem setas.** São poucos cartões por skin, e cada cartão tem vários
  controles à vista (ampliar, lote, os dois downloads, copiar). Ali o Tab é o caminho natural, e
  as setas competiriam com eles.

## Conferências no ar, depois do último deploy

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.

## Achados de processo

- O primeiro teste do T-66 dava falso vermelho num chip que parecia inteiro na tela mas estava
  cortado pela própria linha que rola. Esse teste agora confere o controle contra a caixa que rola,
  não só contra a tela.
- Um script de merge foi chamado com um número de PR chutado, e errado. Foi parado antes de fazer
  qualquer coisa. O número passa a ser lido do `gh pr create`, nunca adivinhado.
