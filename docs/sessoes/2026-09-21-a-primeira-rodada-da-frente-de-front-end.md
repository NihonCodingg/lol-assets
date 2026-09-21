# Sessão 18–21/09/2026 — a primeira rodada da frente de front-end

Em 18/09/2026 o dono mudou o modo de operação: back-end, indexação e infraestrutura continuam em
manutenção, e interface, UX, acessibilidade e performance percebida viram frente contínua
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). Esta é a primeira rodada dessa
frente. O agente diagnosticou, priorizou, executou e mesclou tudo sem consultar o dono, como ele
pediu. Este é o relatório único da rodada.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#76](https://github.com/NihonCodingg/lol-assets/pull/76) | ADR 0022 | O modo de duas velocidades, no ADR 0021 emendado e no CLAUDE.md |
| [#77](https://github.com/NihonCodingg/lol-assets/pull/77) | T-59 | A chegada não salta, e a home pinta antes |
| [#78](https://github.com/NihonCodingg/lol-assets/pull/78) | T-60 | A galeria monta só o que se vê |
| [#79](https://github.com/NihonCodingg/lol-assets/pull/79) | T-61 | O painel abre rápido já na primeira vez |
| [#80](https://github.com/NihonCodingg/lol-assets/pull/80) | T-62 | Os avisos da Riot à vista em qualquer tela |
| [#81](https://github.com/NihonCodingg/lol-assets/pull/81) | T-63 | Setas na galeria das categorias |
| [#82](https://github.com/NihonCodingg/lol-assets/pull/82) | T-64 | O axe mais rigoroso, e a busca vazia sem violação crítica |

## Como foi medido

- O mesmo script (`medir-frente.mjs`) rodou contra o site no ar, com contexto novo do navegador,
  nas mesmas telas: computador a 1440×900 e telefone a 390×844 com toque.
- **Antes**: uma rodada em 19/09, antes do primeiro PR.
- **Depois**: quatro rodadas em 21/09, depois do último deploy. A primeira pegou o cache da CDN frio,
  logo depois do deploy. As outras três pegaram o cache quente.
- As duas colunas de "depois" existem para não vender como ganho do código o que é cache. A
  comparação justa com o "antes" é a da coluna fria. A coluna quente mostra o que a pessoa sente na
  maior parte das visitas.

## Antes e depois, medido na produção

### Chegar (computador)

| | Antes | Depois, frio | Depois, quente (3 rodadas) |
|---|---|---|---|
| Salto de layout (CLS) | **0,16** | **0** | **0** |
| Primeiro tile pintado | 1.567 ms | 1.121 ms | 413–438 ms |
| LCP | 5.264 ms | 4.748 ms | 776–872 ms |
| Tarefas longas na chegada | 3 (pior: 121 ms) | 1 (51 ms) | — |
| Imagens pedidas na home | 126 | 70 | 70 |

O CLS de 0,16 era um só salto. A lista de categorias da barra lateral chegava com o manifesto e
empurrava tudo 277 px para baixo. O T-59 atacou a causa: a barra já nasce com o lugar das
categorias, e o esqueleto tem a mesma árvore da tela pronta. O mesmo salto aparecia depois de
abrir o painel e dentro da categoria, também 0,16 → 0.

### Abrir um campeão pela primeira vez

| | Antes | Depois |
|---|---|---|
| Do clique até a primeira arte do painel (mediana de 7, cache frio) | 816 ms | **131 ms** |

O T-61 começa a baixar a fatia de campeão no primeiro sinal de intenção: apontar a grade, focar um
cartão ou digitar na busca. Com economia de dados ligada ou em 2G, não adianta nada.

### Rolar uma categoria grande

| | Antes | Depois |
|---|---|---|
| Tiles no DOM, computador | 77 | **49** |
| Tiles no DOM, telefone | 33 | **21** |
| Quadro p95 na rolagem, computador | 23,1 ms | **18,5 ms** |
| Pior quadro, computador | 25,1 ms | **18,9 ms** |
| Quadro p95 na rolagem, telefone | 21,3 ms | **18,8 ms** |

A mediana dos quadros não muda (16,6–16,9 ms) e não poderia mudar: a medição espera o
`requestAnimationFrame`, e o piso é 16,7 ms. O ganho está na cauda. O T-60 cortou o *overscan* e
monta as ações do tile só quando ele é apontado ou focado.

### Teclado

| | Antes | Depois |
|---|---|---|
| Paradas de Tab montadas na galeria de Itens | 120 | **2** |
| Tabs do primeiro tile até sair da galeria | mais de 400 | **4** |

### Avisos da Riot

| Tela | Antes | Depois |
|---|---|---|
| 1920×1080, 1440×900, 1366×768, 1280×720 | inteiros | inteiros |
| 1024×640 | **abaixo da dobra** (a barra lateral inteira rolava) | **inteiros, sem rolar** |

O texto, o tamanho e o contraste não mudaram. O dono pediu "readily visible" sem tirar espaço da
arte, e a área da arte não perdeu nenhum pixel. Quem rola agora é só a lista de categorias.

### axe

| | Antes | Depois |
|---|---|---|
| Régua | sério e crítico, WCAG 2.1 | **todo impacto, WCAG 2.2 AA e boas práticas** |
| Estados testados | 5 | **13**, no computador e no telefone |
| Violações | 1 crítica, numa tela que nenhum teste abria (busca sem resultado) | **0** |

## O que o diagnóstico apontou e não virou ticket

- **Trocar de skin.** O "antes" mostrava 1.051 ms de mediana e 43 piscadas. Era cache frio: com a
  imagem no cache, a troca levou 47 ms no próprio diagnóstico. No "depois" quente deu 67–68 ms e
  zero piscadas, sem nenhum ticket. Não é problema do front.
- **O zip em lote.** O "antes" de 2.987 ms tinha um arquivo só que levou 3.059 ms na CDN. Com
  cache, o zip leva 174–222 ms. O tempo é da fonte, não do front.
- **O T-60 partiu de uma premissa errada.** A meta era baixar a mediana dos quadros, mas o piso de
  16,7 ms da medição a torna imóvel. O ticket mediu o que se move (nós no DOM, cauda dos quadros,
  tempo de abrir) e foi julgado por isso.

## O que ficou de fora de propósito

- Nenhuma animação nova, nenhuma biblioteca nova, nenhum token mudado.
- O que o produto faz não mudou: nenhum botão, filtro ou fluxo novo. As setas e o adiantamento da
  fatia mudam como se chega às coisas, não o que se pode fazer.
- O contraste do texto sobre a arte (a faixa do tile, a ampliação) o axe marca como "incompleto",
  porque não consegue calcular sobre gradiente e imagem. Os tokens não mudaram, e o cálculo deles
  está no [TOKENS.md](../design/TOKENS.md).

## Conferências no ar, depois do último deploy

- `conferir-publicacao.mjs`: tudo certo, o site está no mesmo índice do repositório.
- `conferir:navegador`: 9 de 9. Na primeira rodada, 8 de 9: o teste do download do cdragon não
  apontava o tile antes de clicar, e desde o T-60 o botão só existe depois de apontar. Os testes da
  CI foram atualizados no T-60, mas este só roda contra o site no ar e ficou para trás. Foi
  corrigido no mesmo PR deste relatório. O produto estava certo.

## Achado de processo

- Esta rodada começou com um PR (#78) empilhado sobre outro ainda aberto. O squash do de baixo
  deixou o de cima em conflito. Foi resolvido com `git rebase --onto origin/main <cabeça antiga>`.
  Daqui em diante, cada ticket da frente sai de `main` atualizada.
