# Sessão 21/09/2026 — a sétima rodada da frente de front-end

A sétima rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). O tema foi o que acontece depois
que uma camada fecha, e se o site respeita quem pede menos movimento.

## O diagnóstico

### Para onde vai o foco quando uma camada fecha

Um script percorreu, com teclado e na produção (1440×900), os 10 caminhos de abrir e fechar: o
cartão, a busca e o botão de ampliar, fechando com Esc, com o ×, com Voltar e com "Voltar aos
campeões".

| Caminho | Foco depois de fechar |
|---|---|
| cartão → Esc, → Voltar, → × | `body` |
| busca → Esc | `body` |
| ampliação no painel → Esc | o contêiner do painel |
| ampliação no painel → Voltar | `body` |
| categoria → Voltar | o botão Itens (certo) |
| categoria → "Voltar aos campeões" | `body` |
| ampliação na categoria → Esc, → Voltar | `body` |

**1 de 10 certos.** Nos outros, quem usa teclado voltava ao topo da página e perdia o lugar na
grade ou na galeria. A causa: o painel e a ampliação são `Dialog` do Radix sem
`Dialog.Trigger`, e o Radix modal devolve o foco ao gatilho, que aqui não existia.

### Reduzir movimento

Com `prefers-reduced-motion: reduce`, nada na home se mexe: o esqueleto, o zoom do cartão e as
transições caem a 0,01 ms. **Nada a fazer.** Sem a preferência, sobram 167 animações de
esqueleto depois da chegada. São os marcadores das imagens que ainda não carregaram, quase todos
fora da tela e pulados pelo `content-visibility` (T-59).

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#96](https://github.com/NihonCodingg/lol-assets/pull/96) | T-71 | Fechar uma camada devolve o foco a quem a abriu |

## Antes e depois, medido na produção

| | Antes | Depois |
|---|---|---|
| Caminhos que devolvem o foco ao lugar certo | 1 de 10 | **10 de 10** |

Agora o foco volta ao cartão, à busca ou ao botão de ampliar que abriu a camada. Depois de
"Voltar aos campeões", cujo botão some junto com a categoria, o foco vai para a grade que entra
no lugar.

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
- Suíte na CI: 523 unitários e 81 e2e.
