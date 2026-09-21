# Sessão 21/09/2026 — a oitava rodada da frente de front-end

A oitava rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). O tema foi a espera: o que a
pessoa vê entre tocar e ter a arte, em rede lenta e em telefone mediano, e o que acontece quando
a rede cai no meio.

## O diagnóstico

### Rede lenta (3G, 1,6 Mbps), abrindo a Ahri no telefone

| Momento | O que se vê |
|---|---|
| 101 ms | o painel, com o *tile* da skin na vitrine e "Carregando as artes…" |
| 11.530 ms | a primeira arte da lista |
| 13.602 ms | todas as artes, com a splash na vitrine |

O retorno é imediato, mas a espera é longa. A causa: a fatia de campeões é **um arquivo só com
os 173 campeões**, 1,3 MB comprimido e 13 MB de JSON. Abrir um campeão baixa todos.

### Rede que cai no meio da sessão

| Situação | O que aparece |
|---|---|
| A fatia do painel não chega | a mensagem de erro e "Tentar de novo" |
| A fatia da categoria não chega | "Não deu para carregar Itens", o que fazer, o detalhe técnico em mono e "Tentar de novo" |
| Uma imagem não chega | "A fonte não respondeu", no lugar da arte |

Nada a corrigir. O detalhe técnico ("Failed to fetch"), pequeno e em mono, foi decisão do T-50:
serve para quem precisa relatar o problema.

### CPU de telefone mediano (4× mais lenta): o INP das interações

Medido com a Event Timing API, na produção:

| Interação | INP |
|---|---|
| **Tocar num campeão, fatia ainda por baixar** | **328 ms** |
| **Tocar num campeão, fatia já em memória** | **416 ms** |
| Trocar de skin | 136 ms |
| "Tudo de Jax" (lote) | 112 ms |
| Fechar o painel | 80 ms |
| Tecla na busca | 48 ms |
| Abrir uma categoria de 5.042 | 80 ms |

Acima de 200 ms, o Google classifica o INP como "precisa melhorar". O handler do toque levava 2 a
7 ms. Interpretar os 13 MB de JSON levava 75–112 ms, então também não era isso. O custo estava
em renderizar:

- com a fatia em memória, a promessa resolve na mesma tarefa do toque, e o painel inteiro, com
  todas as artes, era montado antes de pintar;
- a grade de campeões não era memorizada, e a cada mudança de estado da página os 173 cartões
  renderizavam de novo;
- um defeito escondido: as artes do campeão anterior ficavam no estado. O painel da Lux nascia
  montando as artes do Jax. Um teste que vigia o DOM achou 6 delas.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#98](https://github.com/NihonCodingg/lol-assets/pull/98) | T-72 | O toque num campeão responde antes: o painel pinta primeiro, as artes logo depois |

## Antes e depois

Mesmo script, CPU 4× mais lenta, mediana de 7 toques. O "antes" é um build local do `main`
anterior, o "depois" é a produção.

| | Antes | Depois |
|---|---|---|
| INP, fatia em memória | 360 ms | **120 ms** |
| INP, fatia ainda por baixar | 216 ms | 208 ms |
| Tempo até a primeira arte, fatia em memória | 760 ms | 633 ms |
| Artes de outro campeão no painel | 6 | **0** |

O INP com a fatia por baixar mal se moveu. O que sobra ali é montar o diálogo e pintá-lo, e o
profile não mostrou nada barato para cortar.

## O que depende do dono

- **Uma fatia de campeão por campeão.** Isso resolveria os 11,5 s em 3G: de 1,3 MB comprimido
  para cerca de 75 KB por campeão. É trabalho do indexador, que está em manutenção. Está em
  "Ideias não executadas".

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
- Suíte na CI: 523 unitários e 82 e2e.
