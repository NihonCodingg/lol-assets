# Sessão 21/09/2026 — a quarta rodada da frente de front-end

A quarta rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). Ela começou com o pedido do dono
de 21/09: continuar em rodadas sem escrever no chat entre elas, com o relatório de cada rodada
aqui. Isso ficou registrado no `CLAUDE.md` ([#89](https://github.com/NihonCodingg/lol-assets/pull/89)).

## O diagnóstico: o retorno depois de cada ação

Um script percorreu uma sessão real na produção (a 1440×900): abrir a Ahri, baixar o original,
baixar em PNG (que converte no navegador), copiar o link, trocar de skin, baixar pela ampliação e
baixar o lote como zip. Para cada ação ele mediu o tempo até a primeira mudança no controle, o
que o controle dizia a cada momento, o que o leitor de tela ouvia e quando o arquivo chegou. Os
quadros foram fotografados.

| Ação | Primeira reação | Arquivo | O que se vê | O que se ouve |
|---|---|---|---|---|
| Baixar original | 39 ms | 71 ms | ✓ no botão por ~2 s | "Arquivo baixado" |
| Baixar PNG (converte) | 35 ms | 114 ms | ✓ no botão | "Arquivo baixado" |
| Copiar link | — | — | ✓ e a dica "Link copiado" | "Link copiado" |
| Baixar na ampliação | 53 ms | 59 ms | ✓ no botão | "Arquivo baixado" |
| Trocar de skin | — | — | a splash nova pinta em 648 ms, com o *tile* desfocado antes | — |
| **Zip (Enter no botão)** | 37 ms | 392 ms | barra e "N de M" | **"0 de 10Cancelar", "1 de 10Cancelar"…** |

O retorno visual estava bom em tudo. O zip tinha dois defeitos:

1. **O foco se perdia.** O botão fica desabilitado enquanto monta, e o navegador joga o foco no
   `body`. No fim, o foco pulava para o painel. Quem usa teclado voltava ao topo.
2. **O leitor de tela era inundado.** A região viva era a linha inteira do progresso, com o
   botão Cancelar dentro: N + 1 anúncios num zip de N arquivos, cada um com "Cancelar" colado.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#89](https://github.com/NihonCodingg/lol-assets/pull/89) | — | O `CLAUDE.md` registra que, nesta frente, o relatório vai para o repositório |
| [#90](https://github.com/NihonCodingg/lol-assets/pull/90) | T-68 | O zip não tira o foco de quem usa teclado nem enche o leitor de tela |

## Antes e depois, medido na produção

| | Antes | Depois |
|---|---|---|
| Foco durante a montagem | `body` | **Cancelar** |
| Foco no fim | o painel | **o botão do zip** |
| Anúncios num zip de 10 | 10, sendo 9 com "Cancelar" | **6**, nenhum com "Cancelar" |
| Anúncios num zip de N | N + 1 | **no máximo 6** |

O que se vê na bandeja não mudou.

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
