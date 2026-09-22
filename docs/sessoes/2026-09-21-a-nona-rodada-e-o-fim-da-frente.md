# Sessão 21/09/2026 — a nona rodada, e o fim desta frente

A nona rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). O dono pediu para parar quando um
diagnóstico completo não achasse nada cujo ganho medido justificasse o custo. **Foi o que esta
rodada achou.**

## O diagnóstico

### O INP dentro das categorias (CPU 4× mais lenta, telefone, produção)

| Interação | INP |
|---|---|
| Abrir Itens | 56 ms |
| Marcar um filtro | 40 ms |
| Mostrar tudo | 48 ms |
| Selecionar os N filtrados | 88 ms |
| Limpar seleção | 40 ms |
| Abrir Ícones de perfil (5.042) | 16 ms |
| Tecla no filtro de texto, sobre 5.042 | 48 ms (a segunda tecla, abaixo de 16 ms) |
| Apagar o filtro | 72 ms |
| Selecionar os 5.042 | 40 ms |
| Marcar a caixa de um tile, com 5.042 no lote | 32 ms |
| Ampliar um tile | 96 ms |

Tudo abaixo de 100 ms, com folga para os 200 ms do "bom".

### A chegada, de novo, contra a rodada 1 (produção, cache quente)

| | Rodada 1 (depois do T-59) | Agora |
|---|---|---|
| Salto de layout (CLS), computador e telefone | 0 e 0 | **0 e 0** |
| Primeiro tile pintado, computador | 413–438 ms | 403–439 ms |
| LCP, computador | 776–872 ms | 784–812 ms |
| Quadro p95 rolando uma categoria grande | 18,9–21,8 ms | 18,8–22,6 ms |
| Tiles no DOM | 49 | 49 |
| Tecla até resultado na busca | 19,9–24,7 ms | 19,9–25,3 ms |

As rodadas 4 a 8 não custaram nada à chegada.

## O que as nove rodadas cobriram

| Rodada | Tema | O que entrou |
|---|---|---|
| 1 | chegada, rolagem, primeira abertura, teclado, axe | T-59 a T-64 |
| 2 | nomes cortados, alvos de toque | T-65, T-66 |
| 3 | peso, CPU, reflow (zoom de 200% e 400%) | T-67 |
| 4 | o retorno depois de cada ação | T-68 |
| 5 | a busca com consultas reais | T-69 |
| 6 | o botão Voltar no telefone | T-70 |
| 7 | o foco depois de fechar, reduzir movimento | T-71 |
| 8 | rede lenta, rede que cai, INP | T-72 |
| 9 | INP nas categorias, a chegada de novo | nada: não há ganho que pague o custo |

As hipóteses descartadas com número estão nos relatórios de cada rodada: imagens fora da tela,
render da grade em partes, JSON num worker e legenda em duas linhas.

## O que depende do dono

Tudo exige mexer no indexador ou na infraestrutura, que estão em manutenção. As três estão em
"Ideias não executadas", no fim do [TICKETS.md](../TICKETS.md):

- **Uma fatia de campeão por campeão.** Hoje abrir um campeão baixa os 173: 1,3 MB comprimido,
  11,5 s em 3G. Por campeão, seriam cerca de 75 KB. É o maior ganho de velocidade que sobra.
- **Imagens no tamanho da tela.** A home baixa cerca de 1,1 MB de imagem para a primeira tela;
  poderia ser menos da metade.
- **Nomes em inglês no índice.** Buscas como "star guardian" e "blood moon" dão zero.

  > **Correção de 22/09/2026 ([T-74](2026-09-22-a-excecao-do-indexador.md)):** errado. O
  > índice já tinha o inglês, e essas buscas já funcionavam. Veja a correção no relatório da
  > quinta rodada.
