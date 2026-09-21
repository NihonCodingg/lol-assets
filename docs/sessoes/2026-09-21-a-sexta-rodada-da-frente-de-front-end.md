# Sessão 21/09/2026 — a sexta rodada da frente de front-end

A sexta rodada da frente contínua de interface
([ADR 0022](../adr/0022-o-front-end-vira-frente-continua.md)). O tema foi a sessão no telefone,
e em especial a navegação: o gesto de voltar.

## O diagnóstico

Um script abriu o site no telefone (390×844, com toque), com uma página antes dele no histórico.
Abriu cada camada que fica por cima da tela e apertou Voltar:

| Com isto aberto | A URL mudou ao abrir? | Voltar levou para |
|---|---|---|
| Painel do campeão (tela cheia no telefone) | não | **fora do site** |
| Categoria Itens | não | **fora do site** |
| Ampliação de um item | não | **fora do site** |

No telefone, Voltar (o botão do Android e o gesto do iPhone) é a forma natural de fechar uma
tela cheia. Aqui, ele jogava a pessoa para fora, e ela tinha que voltar ao site e procurar tudo de
novo.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#94](https://github.com/NihonCodingg/lol-assets/pull/94) | T-70 | O botão Voltar fecha a camada de cima, em vez de sair do site |

Cada camada aberta empilha uma entrada no histórico, **na mesma URL**. Voltar fecha a de cima.
Fechar pelo × ou pelo Esc consome a entrada, e o Voltar seguinte sai do site na hora. A URL não
muda, então o produto não ganha um endereço por campeão. Esse link direto seria função nova, e
ficou anotado em "Ideias não executadas".

## Antes e depois, medido na produção

| Com isto aberto | Voltar antes | Voltar depois |
|---|---|---|
| Painel do campeão | fora do site | **fecha o painel, fica no site** |
| Categoria | fora do site | **volta aos campeões** |
| Ampliação | fora do site | **fecha a ampliação** |
| Ampliação dentro do painel | fora do site | **1º Voltar fecha a ampliação, 2º o painel** |
| Depois de fechar pelo × ou pelo Esc | — | **um Voltar só sai do site** |

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo.
- `conferir:navegador`: 9 de 9.
- Suíte na CI: 523 unitários e 77 e2e.
