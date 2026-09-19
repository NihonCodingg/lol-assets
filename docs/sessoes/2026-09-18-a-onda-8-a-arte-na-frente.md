# Sessão 18/09/2026 — a Onda 8: a arte na frente

A exceção pontual ao modo de manutenção, autorizada pelo dono em 17/09 e **encerrada com esta
onda**: o [ADR 0021](../adr/0021-o-projeto-entra-em-manutencao.md) volta a valer como está, e
nenhuma sessão futura deve tratar esta onda como precedente para abrir trabalho de design por
conta própria.

O diagnóstico que originou a lista está em
[2026-09-18-o-diagnostico-de-design.md](2026-09-18-o-diagnostico-de-design.md). O dono aprovou a
lista inteira menos o item 12 — o aviso legal na barra lateral —, que tem risco legal e fica com
ele.

## O que entrou

| PR | Ticket | O quê |
|---|---|---|
| [#69](https://github.com/NihonCodingg/lol-assets/pull/69) | T-53 | A arte na frente: o tile da galeria deixa de ser ficha técnica |
| [#70](https://github.com/NihonCodingg/lol-assets/pull/70) | T-54 | A busca mostra a arte: prévia do item em destaque |
| [#71](https://github.com/NihonCodingg/lol-assets/pull/71) | T-55 | A densidade que muda alguma coisa, e o telefone |
| [#72](https://github.com/NihonCodingg/lol-assets/pull/72) | T-56 | Clareza: nomes repetidos, filtro explicado e estados no lugar |
| [#73](https://github.com/NihonCodingg/lol-assets/pull/73) | T-57 | O teclado na grade: uma parada de Tab, e as setas andam |
| [#74](https://github.com/NihonCodingg/lol-assets/pull/74) | T-58 | O painel do campeão respira, e o cromo fala mais baixo |

## Antes e depois, medido na produção

As duas medições são do site no ar, com o mesmo script, nas mesmas telas — 17/09 antes da onda,
18/09 depois dela.

### Computador (1440×900)

| | Antes | Depois |
|---|---|---|
| Categoria Itens: colunas | 6 | **10** |
| Categoria Itens: tile | 190×168 | **113×136** |
| Categoria Itens: arte no tile | **13%** | **27%** |
| Categoria Itens: tiles na tela | 30 | **50** |
| Wards: altura do tile | 304 px | **272 px** (arte de 56% para 64%) |
| Busca: linha e miniatura | 52 px, **32×32** | 72 px, **56×56**, com prévia grande ao lado |
| Home: passo mais denso | 7 colunas, 28 campeões | **10 colunas, 50 campeões** (passo compacto, novo) |
| Painel do campeão: vitrine | 455 px de 900 | **376 px** |
| Atalho para pular o cromo | não existia | **existe** |
| Seta na grade | não movia o foco | **move** |

### Telefone (390×844)

| | Antes | Depois |
|---|---|---|
| Categoria Itens: colunas | 2 | **3** |
| Categoria Itens: tiles na tela | 6 | **12** |
| Wards: altura do tile | 304 px | **179 px** — os 98 px de vazio por tile saíram |
| Ações sobre a arte | sempre por cima do ícone | **fora da arte**; o caminho é tocar e baixar da ampliação |
| Densidade | dois passos, as mesmas 2 colunas | **três passos**, 3 colunas no compacto |
| Campos de busca dentro de uma categoria | 2 empilhados | **1** |

### Conferência contra o site no ar (18/09)

| | |
|---|---|
| `conferir-publicacao.mjs` | **26 de 26** — o site está no mesmo índice do repositório |
| `conferir:navegador` | **9 de 9** |
| `vitest` | 489 |
| e2e | 56 |

## O que ficou de fora, e por quê

- **O aviso legal na barra lateral** (item 12 da lista): decisão do dono, por causa do
  "readily visible" da política da Riot.
- **O filtro padrão da categoria `item`**: continua como a §B.1.6 decidiu. O que mudou é ele
  deixar de ser invisível — a barra agora diz qual é e quantos assets ele esconde.
- **Setas na galeria virtualizada**, **filtro para esconder as sombras das wards** e **tirar o
  `_fpo` do índice**: viraram ideias anotadas no fim do [TICKETS.md](../TICKETS.md), que é o que o
  modo de manutenção manda fazer com oportunidade encontrada no caminho.

## O que a onda ensinou

- **O cromo mandava na arte.** A largura do tile da galeria não vinha da imagem: vinha dos 176 px
  que "Original", "PNG" e o copiar pediam lado a lado. Trocar os rótulos por ícones onde não cabem
  devolveu quatro colunas.
- **Tela de toque não é tela de mouse com dedo.** O T-48 resolvia a falta de *hover* deixando as
  ações sempre à vista; num tile de ícone de 64 px isso é cobrir a arte inteira, o tempo todo.
- **Nome repetido parece defeito.** 532 wards em 266 pares de nome igual faziam metade da galeria
  parecer vazia — e não havia defeito nenhum, só falta de rótulo.
- **Medir antes e depois evita discussão de gosto.** Todo item da lista virou número: 13% de arte
  no tile, 21 paradas de Tab, 32 px de miniatura. O que não dava para medir ficou de fora.

## O modo de manutenção volta a valer

A partir daqui, o de sempre: conserta-se o que quebra, não se abre trabalho novo, e o dono só é
procurado se algo quebrar sem conserto, se uma fonte mudar o que o produto entrega, ou se precisar
de conta, segredo ou decisão dele.
