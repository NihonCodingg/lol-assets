# Sessão 21/09/2026 — a terceira rodada da frente de front-end

A terceira rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)), depois de um "pode continuar" do dono.
As duas primeiras mediram tempo de chegada, teclado, axe, toque e nomes cortados. Esta mediu três
coisas que ninguém tinha olhado: o **peso** da chegada, a **CPU** num telefone lento e o
**reflow** (zoom e telas pequenas).

## O diagnóstico

### Peso da chegada (produção, cache frio)

| | Computador (1440×900) | Telefone (390×844) |
|---|---|---|
| Total transferido | 3.191 KB | 1.089 KB |
| Imagens | 2.854 KB (70 imagens, **28 na tela**) | 755 KB (18 imagens, **6 na tela**) |
| JS | 185 KB (comprimido), 582 KB decodificado | igual |
| Catálogo | 58 KB com brotli (762 KB decodificado) | igual |

**Hipótese:** as 42 imagens fora da tela, que o `loading="lazy"` do navegador pré-carrega,
atrasariam a primeira tela.

**Medida:** tempo até toda a arte da primeira tela carregar, em rede limitada.

| | 4G (9 Mbps) | 3G (1,6 Mbps) | Imagem baixada até a primeira tela completa |
|---|---|---|---|
| Computador | 2.145 ms | 8.967 ms | 1.153 KB, só as 28 da tela |
| Telefone | 1.234 ms | 4.104 ms | 241 KB, só as 6 da tela |

**Hipótese refutada.** O navegador já dá prioridade ao que está na tela, e as de fora descem
depois, prontas para a rolagem. Cortá-las não adiantaria a primeira tela, só atrasaria a rolagem.
**Não entrou.** A única alavanca que sobra nas imagens é servi-las no tamanho da tela (a ddragon
só tem o *tile* de 380 px, mostrado a 163 px no computador). Isso exige um serviço de imagens,
que é infraestrutura e está em manutenção. Ficou anotado em "Ideias não executadas".

### CPU na chegada (telefone com a CPU 4× mais lenta, build local com source maps)

| Onde | Tempo |
|---|---|
| React renderizando | 272 ms |
| Avaliação dos módulos (webpack) | 119 ms |
| Tempo próprio do `HomePage` | 42 ms |
| `tailwind-merge` | 37 ms |
| Índice de busca (`search.ts`) | 26 ms |
| Maior tarefa longa | cerca de 285 ms, os 173 cartões montados de uma vez |

**Experimento:** montar só os 30 primeiros cartões (build local, 7 rodadas):

| | 173 cartões | 30 cartões |
|---|---|---|
| Primeiro cartão (mediana) | 987 ms | 901 ms |
| Maior tarefa longa | cerca de 285 ms | cerca de 199 ms |

**Não entrou.** O ganho é de 86 ms com a CPU 4× mais lenta, algo como 20 ms num computador
comum. O custo seria um segundo passe de render para os 143 cartões restantes, com uma tarefa
longa nova logo depois da chegada, justamente quando a pessoa começa a interagir. A regra da
frente manda descartar o que não se paga e registrar o motivo.

### Reflow (produção)

| Tela | Vaza na horizontal? | Galeria de Itens | Problema |
|---|---|---|---|
| 320×568, telefone pequeno em pé | não | 278 px | — |
| Zoom de 200% (640×450) | não | 174 px de 450 | cromo com 61% da tela |
| Zoom de 400% (320×225) | não | **0 px** | **nenhuma arte; texto por cima de texto** |

Este era o problema real da rodada, e virou o T-67.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#87](https://github.com/NihonCodingg/lol-assets/pull/87) | T-67 | Em tela baixa, a página rola inteira e a arte volta a aparecer |

## Antes e depois, medido na produção

| Tela | Galeria de Itens antes | Depois | Texto sobreposto |
|---|---|---|---|
| Zoom de 400% (320×225) | 0 px | **225 px**, a tela toda | sim → **não** |
| Zoom de 200% (640×450) | 174 px | **450 px** | não |
| Telefone deitado (844×390) | 140 px | **390 px** | não |
| Telefone pequeno em pé (320×568) | 278 px | 278 px | não |
| Computador (1440×900) | 708 px | 708 px | não |

O primeiro cartão da home e o primeiro tile de Itens no telefone em pé continuam a 226 px e
264 px do topo.

A causa era a casca de altura fixa, que rola por dentro. Até 500 px de altura (a variante
`baixa:`, registrada no [TOKENS.md](../design/TOKENS.md)), a janela volta a rolar e a galeria
virtual ganha a altura da tela, sem perder o próprio scroller (ADR 0011).

## Conferências no ar, depois do último deploy

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
- Suíte na CI: 508 unitários e 70 e2e.

## Achado de processo

- O diagnóstico de reflow travou na primeira tentativa: ele esperava um tile que nunca aparecia
  no zoom de 400%. O script passou a registrar em vez de parar, e o travamento era o próprio
  achado.
