# Sessão 22/09/2026 — a exceção do indexador: uma fatia por campeão, e os nomes em inglês

O dono tirou o indexador da manutenção do
[ADR 0021](../adr/0021-o-projeto-entra-em-manutencao.md) só para duas das ideias deixadas no fim
da frente de front-end. A terceira, imagens no tamanho da tela, ficou de fora: exige um serviço de
imagens, e o projeto tem custo zero pelo [ADR 0012](../adr/0012-onde-guardar-os-assets.md).
Ela continua em "Ideias não executadas", com essa justificativa.

**Esta exceção está encerrada e não é precedente.** O indexador voltou à manutenção, e isso ficou
registrado no ADR 0021, no ADR 0023 e no `CLAUDE.md`.

## 1. Uma fatia por campeão (T-73, [ADR 0023](../adr/0023-uma-fatia-por-campeao.md))

### O antes

A categoria `champion` era uma fatia só: `index-champion-{hash}.json`, com 13 MB de JSON, 1,3 MB
comprimida e 18.397 assets dos 173 campeões. Abrir um campeão baixava a fatia inteira.

Medido na produção em 3G (1,6 Mbps, 150 ms), no telefone, com cache frio, do toque até a primeira
arte do painel (mediana de 3):

| | Tempo | Índice baixado |
|---|---|---|
| Ahri | 13,4 s | 1.288 KB |
| Jax | 18,4 s | 1.288 KB |

O número de referência do dono (11,5 s) vinha da rodada 8 e media só até a lista de artes chegar.
Este mede até a primeira arte pintada, por isso é maior.

### O que mudou

- **Contrato 2.0.0.** Cada campeão tem a sua fatia, `index-champion-{championKey}-{hash}.json`,
  com `championKey`. O catálogo aponta para ela (`champions[].shard = {url, assets, bytes}`, sem
  `sha256`, para não pesar na abertura). O manifesto deixa de listar `champion`.
- **Indexador.** Prepara as fatias antes do catálogo, porque o hash do catálogo depende dos nomes
  delas, e publica na ordem fatias → catálogo → manifesto. O `Publisher` recusa a ordem errada.
  A assinatura de geração subiu para 4.
- **Front.**
  - `AssetsClient.loadChampion` busca só a fatia do campeão, pelo catálogo.
  - O adiantamento do T-61 passou a ser por campeão, com uma intenção de verdade: o ponteiro que
    para 150 ms no cartão, o foco, o toque, ou o resultado em destaque na busca. Atravessar a
    grade até o Jax não baixa vinte fatias.
- **API, conferência e fixtures.** A API junta as fatias pelo catálogo. O `conferir-publicacao`
  confere as 173. As fixtures do contrato e do e2e estão no formato 2.0.0.
- **Como entrou no ar.** Front e índice entraram no mesmo merge, sem código de compatibilidade:
  rodei o workflow de indexação no branch do PR, e ele commitou ali o índice novo.

### O depois, medido na produção

| | Antes | Depois |
|---|---|---|
| Ahri, toque → primeira arte em 3G | 13,4 s | **3,7 s** |
| Jax, toque → primeira arte em 3G | 18,4 s | **5,9 s** |
| Índice baixado ao abrir a Ahri | 1.288 KB | **13 KB** |
| Índice baixado ao abrir o Jax | 1.288 KB | **8 KB** |
| Catálogo, comprimido (limite do RNF-03: 150 KB) | 58 KB | 62 KB |
| Peso total da chegada, computador | 3.191 KB | 3.196 KB |

O que sobra dos 3,7 s e 5,9 s é o download da própria arte em 3G, e não o índice.

O INP de tocar num campeão (CPU 4× mais lenta, mediana de 7) mudou pouco, e a comparação não é a
mesma:

| | Antes (T-72) | Depois |
|---|---|---|
| Sem nada em memória | 208 ms | 224 ms |
| Depois de ter aberto outro campeão | 120 ms | 160 ms |

A segunda linha mudou de natureza. Antes, abrir a Ahri depois do Jax encontrava os 173 campeões
em memória. Agora a fatia da Ahri precisa ser buscada. O preço disso é 40 ms de INP. O ganho é
não baixar 1,3 MB que ninguém usa.

### Achados

- **A regra de cache não casava o nome novo.** `index-champion-24-{hash}.json` saía com o cache
  padrão, e não com o imutável. O teste que confere cada arquivo de `public/indice` contra a regra
  de cabeçalhos existia exatamente para isso, e pegou quando o índice novo chegou.
- **Um merge com a CI pendente.** O #101 foi mesclado antes de a CI da última cabeça terminar. O
  script de merge esperou os checks logo depois do push, quando só os da Vercel tinham aparecido.
  A CI passou inteira depois, no PR e em `main` (Python, Web, e2e, API), então o código não foi
  afetado. Mas a regra é CI verde **antes** do merge. O script passou a exigir os três checks da
  CI presentes e verdes antes de mesclar.

## 2. Os nomes em inglês (T-74)

### O antes

O pedido partiu de uma afirmação minha na rodada 5 da frente de front-end: que o índice só tinha
pt-BR e que "star guardian" ou "blood moon" davam zero resultados. **Estava errada.** Conferido no
índice publicado:

| | Com `names.en_US` |
|---|---|
| Campeões | **173 de 173** |
| Skins | **2.121 de 2.121** |

A busca do front juntava os dois nomes desde o T-10. Na lista da rodada 5, com 20 consultas em
inglês a mais (70 no total), a busca acertou **todas as 20 em inglês**:

- "god staff jax" achou "Jax Cajado Divino";
- "angler jax" achou "Jax Pescador";
- "spirit blossom", "blood moon", "star guardian", "prestige" e "project" acharam as skins
  certas.

Os 6 "erros" que o script aponta são da minha lista, não da busca:

- "deus da guerra" e "jax deus": o Jax não tem skin com esse nome;
- "fisherman jax": o nome da skin em inglês é "Angler Jax";
- "arcana", "pool party" e "winterblessed" acharam as skins certas ("Ahri Arcana", "Curtindo o
  Verão", "Bênção do Inverno").

### O que mudou

Nada no indexador nem na busca, porque os dois já faziam o pedido. O que faltava era uma guarda:
a fixture do tarball usa o mesmo nome nos dois idiomas, e nenhum teste percebia se o inglês
deixasse de ser lido.

- **No indexador,** um teste com nomes diferentes nos dois idiomas: a skin leva "God Staff Jax"
  ao lado de "Jax Deus da Guerra", o campeão leva o título em inglês, e todo campeão e toda skin
  têm `en_US`.
- **Na busca,** um teste com os nomes reais: "god staff jax" acha "Jax Cajado Divino", e o rótulo
  continua em pt-BR.
- **Nos registros:** a afirmação errada foi corrigida com nota datada no T-69, nos relatórios da
  quinta e da nona rodada, e na tabela de ideias.

### O depois, medido na produção (depois do T-73, com o índice novo)

| | Antes | Depois |
|---|---|---|
| Consultas em inglês com a skin certa | 20 de 20 | 20 de 20 |
| Campeões e skins com `en_US` | 100% | 100% |

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo, com as 173 fatias de campeão imutáveis.
- `conferir:navegador`: 9 de 9.
