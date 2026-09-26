# ADR 0025 — A categoria `rank` volta: os emblemas de elo

- **Status:** ✅ aceito (26/09/2026)
- **Data:** 2026-09-26
- **Decidido por:** o dono pediu ("um lugar para que eu pudesse baixar as logos dos ranks do
  jogo") e autorizou depois de ouvir o custo. O desenho é do agente.
- **Emenda:** o [ADR 0012](0012-onde-guardar-os-assets.md), só no ponto 2 do impacto ("os emblemas de
  elo ficam sem fonte utilizável") e na saída da categoria `rank` da v1.
- **Exceção ao:** [ADR 0021](0021-o-projeto-entra-em-manutencao.md), como o 0023. O indexador sai
  da manutenção para isto e volta a ela quando estiver no ar.

## Contexto

O ADR 0012 tirou a categoria `rank` da v1. O emblema montado de cada elo só existia dentro do
`ranked-emblems-latest.zip` da Riot, de 61,5 MB. O cdragon tinha só as peças soltas: base, coroa,
luz de fundo. Compor as peças seria manipular imagem, o que o
[ADR 0001](0001-formato-de-entrega-dos-assets.md) proíbe, e exigiria storage.

Conferido em 26/09/2026, o cdragon agora serve o emblema montado de cada divisão, os do cliente
atual, com as asas:

- `plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-<elo>.png`;
- dez divisões, de Ferro a Desafiante;
- PNG com alfa, 1280 × 720, cerca de 80 KB cada, com CORS aberto (`Access-Control-Allow-Origin: *`).

O "Unranked" não existe nesse formato, só como brasão de 48 px em `ranked-mini-crests/`. É pequeno
demais para vídeo e fica de fora.

## Decisão

1. **A categoria `rank` volta**, com o tipo `rank_emblem`, que o contrato já tinha desde a v1.
   Não há contrato novo nem mudança de schema.
2. **A lista das divisões é fechada, no indexador** (`adapters/ranked.py`). Não há JSON do
   cliente que liste os emblemas: o cliente os carrega pelo nome da divisão. É a única exceção à
   regra "todo caminho sai do JSON", e por isso mora fora do `cdragon.py`, onde um teste de
   varredura proíbe montar caminho. Cada URL é conferida pela medida: divisão que sumir da fonte
   fica de fora, com o 404 no log. Divisão nova entra na lista.
3. **Na tela**, a categoria se chama "Ranks" e ganha a nona cor de etiqueta, `#50BDCB`: matiz
   207°, com a mesma luminosidade das outras oito. Os emblemas aparecem na ordem do jogo. A
   prévia aproxima a arte 2,4×, só na tela, porque o emblema ocupa o meio de um quadro
   transparente de 1280 × 720. O arquivo baixado é o original, com o quadro inteiro.

## Consequências

- A fatia nova tem 10 registros, cerca de 5 KB de índice. A home não paga nada: a fatia só é
  pedida no clique, como toda categoria (RNF-03). O custo continua zero, porque os arquivos vêm
  direto do cdragon (ADR 0012).
- O arquivo tem cerca de 70% de área transparente em volta do emblema. Quem edita recorta no
  Premiere. Recortar no indexador seria reencodar, e o ADR 0001 não deixa.
- Se a Riot trocar o desenho dos emblemas numa temporada nova, o cdragon troca junto, e o índice
  acompanha na execução diária.
