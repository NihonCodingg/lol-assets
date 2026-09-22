# Sessão 21/09/2026 — a quinta rodada da frente de front-end

A quinta rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). O tema foi a busca, que é o
primeiro gesto do editor.

## O diagnóstico

Um script digitou 50 consultas na produção, do jeito que um editor digita:

- nomes com apóstrofo ("kaisa", "ksante", "velkoz");
- apelidos ("mf", "tf", "j4", "asol");
- nomes compostos colados ("missfortune", "leesin");
- erros de dedo ("yasou", "kattarina", "ezrael", "serafine");
- linhas de skin em pt-BR e em inglês ("guardiã estelar", "star guardian", "lua sangrenta",
  "blood moon", "k/da", "arcane", "prestígio");
- campeão com skin ("ahri arcana", "jax deus").

Para cada consulta ele registrou quantos resultados vieram e qual veio em primeiro.

| | Antes |
|---|---|
| Certo em primeiro | 41 de 50 |
| Certo entre os 3 primeiros | 42 de 50 |
| Zero resultados | 7 |

Dos 7 zeros, 5 eram **erros de dedo**: "yasou", "yaso", "kattarina", "ezrael", "serafine". Os
outros 2 ("deus da guerra" e "jax deus") eram erro da lista: no catálogo real, a skin que em
inglês é "God Staff Jax" se chama "Jax Cajado Divino", e nenhuma skin do Jax tem "deus" no
nome. "arcana" achou a Ahri Arcana, e isso está certo.

O que funcionava bem, sem nada a fazer: apóstrofos, apelidos, nomes colados, linhas de skin em
pt-BR e o tempo por tecla (27,9 ms no computador e 12,4 ms no telefone, medido na rodada 1).

## A decisão

O [ADR 0009](../adr/0009-apelidos-de-busca-mantidos-a-mao.md) põe o ranking em normalização mais
uma tabela de apelidos mantida à mão, e descarta a busca difusa. Erro de dedo não é apelido, e
cadastrar cada um na mão não tem fim. A saída que respeita o ADR foi deixar o **ranking
intocado** e mexer só no vazio. Quando a busca de verdade não acha nada, o vazio oferece os
campeões parecidos como opções de verdade. A emenda está no ADR.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#92](https://github.com/NihonCodingg/lol-assets/pull/92) | T-69 | Erro de dedo na busca: o vazio oferece o campeão parecido |

## Antes e depois, medido na produção

| | Antes | Depois |
|---|---|---|
| Certo em primeiro | 41 de 50 | **46 de 50** |
| Certo entre os 3 primeiros | 42 de 50 | **47 de 50** |
| Zero resultados | 7 | **2**, os dois corretos, porque o que se buscou não existe |
| Consultas que já achavam e mudaram de resultado | — | **0** |

O custo da sugestão, contra 173 nomes, fica abaixo de 5 ms, e só roda quando a busca volta
vazia.

## O que ficou de fora

- **Nomes em inglês** ("star guardian", "blood moon", "spirit blossom"). O índice só tem o nome
  em pt-BR. Trazer o inglês é trabalho do indexador, que está em manutenção.
  > **Correção de 22/09/2026 ([T-74](2026-09-22-a-excecao-do-indexador.md)):** isto estava
  > errado. O índice publicado já trazia `names.en_US` em 100% dos campeões e das skins, e a
  > busca já procurava por ele. Nesta mesma rodada, "star guardian", "blood moon", "spirit
  > blossom", "prestige" e "project" acharam a skin certa — nenhuma delas aparece na lista de
  > falhas acima. A leitura do resultado é que estava errada, não a busca.
- **Erro de dedo em nome de skin.** As skins moram no painel do campeão (ADR 0010).

## Achado de processo

- A suíte e2e inteira começou a falhar 1 vez em cada 2 no teste de salto das categorias (T-59).
  Isolado, o teste passava sempre. A causa: com a máquina carregada, a primeira medida saía antes
  do CSS carregar, uma tela que o navegador nunca pinta. O teste agora espera o CSS, e a
  verificação de salto medida pelo navegador continua igual. Depois disso, 3 rodadas seguidas
  com 72 de 72.

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
