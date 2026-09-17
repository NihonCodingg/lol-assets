# Sessão 15/09/2026 — o `sha256` do cdragon

O pedido: a conferência no navegador contra o site no ar deu 8 de 9. O download do cdragon
funcionava, com o nome certo, e o `sha256` não batia com o índice. Achar a causa e fazer o
índice e a conferência concordarem — ou, se o cdragon não pudesse ter `sha256` estável,
documentar isso e conferir o que ele de fato garante.

## A causa — medida

- O `raw.communitydragon.org` passa pelo **Cloudflare Polish**. A resposta traz
  `cf-polished: ok, orig_size=N`, e N é exatamente o `bytes` do índice.
- **Mesma URL, mesma borda (GRU), mesmo minuto:** numa falta de cache veio a origem, igual ao
  índice; com o cache quente veio a recompressão — para qualquer perfil de requisição: o
  `SourceClient` do próprio indexador, os cabeçalhos de um `<img>`, os do `fetch()` do site.
- O `ea46dfef…` que a conferência baixou é **exatamente** a recompressão do `Emote_0.png`:
  26.479 bytes, contra 262.513 da origem.
- **A arte é a mesma:** formato, dimensões e canal alfa idênticos. Mudam só a cor debaixo do
  alfa 0 (14.295 e 3.271 pixels, nenhum visível) e a compressão.
- O navegador não lê o `cf-polished`: não há `Access-Control-Expose-Headers`.
- O ddragon (CloudFront sobre S3) entregou os bytes do índice.
- **O indexador mediu certo:** a origem, que é o que a borda do runner entregou. A reindexação
  de 15/09 não tem nada com isso — os valores são os mesmos de 11/09.

Tudo com uma requisição por vez e o User-Agent da regra 4: 10 ao cdragon, 1 ao ddragon. Os
dados brutos estão em [`t52-polish-do-cdragon.json`](../evidencias/t52-polish-do-cdragon.json),
gerado dos arquivos e cabeçalhos salvos, sem número digitado à mão.

## A decisão — ADR 0019

**O indexador não tem como medir "o que o navegador recebe"**, porque não existe uma coisa só: a
variante muda com o nó de cache, com a idade da cópia, com a borda (a do runner não é a do
visitante) e com o tempo do Polish. E forçar a origem com URL que fure o cache mandaria as
11.765 entradas do cdragon ao servidor de voluntários a cada patch.

Então o cdragon **não tem `sha256` estável**, e o que mudou foi o que se confere:

- `BYTE_STABLE_SOURCES` e `isByteStable(source)` no `@lol-assets/schema` — hoje, só o ddragon.
- **De toda fonte**, o arquivo salvo é o que ela entregou ao navegador, sem re-encode, com o
  formato e as dimensões do índice. **De fonte estável**, também o `sha256` do índice.
- O índice, o contrato (1.3.0), o indexador e o site não mudam: sem reindexação.

## O que foi feito — T-52

- **Contrato:** `BYTE_STABLE_SOURCES` e `isByteStable` no TS, com teste; as descrições do
  `bytes` e do `sha256` no JSON Schema e nos modelos Pydantic apontam para o ADR.
- **`navegador.spec.ts`:** os dois downloads comparam o arquivo salvo com o que a fonte entregou
  àquele navegador, na URL do índice (`fetch` com `force-cache`, a mesma entrega), e as
  dimensões do PNG com as do índice. O `sha256` do índice só entra quando `isByteStable`; no
  cdragon, a conferência anota qual variante recebeu. O cenário do cdragon passou a se chamar
  pelo que prova.
- **Indexador:** só a docstring do adaptador do cdragon, dizendo o que o `sha256` medido ali é.
- **Registro:** [ADR 0019](../adr/0019-o-sha256-do-cdragon-nao-confere-o-download.md), com a
  medição e as alternativas; a medição em `SPIKES.md` (S2) e em `docs/evidencias/`; Spec (RF-10,
  RNF-13, §6, riscos, rastreabilidade); nota de emenda no ADR 0012; T-52 no TICKETS, com uma
  nota no T-50 e duas linhas no mapa de cobertura.

## Conferido

| | |
|---|---|
| Teste antes do código | os 3 novos do `isByteStable` falharam com `isByteStable is not a function`, e passaram depois |
| `pytest` inteiro (348), `ruff check`, `ruff format --check`, `mypy` | verdes |
| `vitest` | 10 do schema (3 novos) e 397 do web; `eslint` e `tsc` verdes |
| `playwright --list` da conferência | os 9 cenários carregam, com o `@lol-assets/schema` importado |
| **Conferência no navegador contra o site no ar, com a mudança** | **9 de 9.** O cenário do cdragon baixou justamente a recompressão do `Emote_0.png` — 26.479 bytes contra 262.513 no índice — e anotou isso em vez de falhar |

## O que foi assumido

- **A amostra é pequena de propósito:** dois emotes e um controle no ddragon. As duas amostras
  deram o mesmo quadro. Wards e chromas não foram medidos; o Polish é do host inteiro, e a regra
  é por fonte.
- **JPEG do cdragon não foi medido.** Que o Polish preserve os pixels visíveis foi visto em 2 de
  2 PNGs. A regra não depende disso: no cdragon, só formato e dimensão entram.
- **O 9 de 9 de 11/09** — o emote ainda frio na borda — é uma explicação coerente, não provada.
- **Contrato sem versão nova.** Mudaram descrições do JSON Schema e uma função exportada no TS;
  nenhum documento muda de forma, então a regra do T-38 não dispara reindexação.
- **A conferência no navegador rodou uma vez contra o site no ar** — o tráfego de um visitante,
  com o User-Agent do Chromium. As requisições feitas à mão levaram o User-Agent da regra 4.
- **Nada em `apps/web/src`**, onde o redesenho (T-45 a T-50) trabalha: a regra está no
  `@lol-assets/schema`, e quem a usa na interface é o T-50.
- **ADR 0019 e T-52** eram os próximos números livres no `main`, na branch do T-47 e na do #58.
- **Trabalho isolado numa worktree** (`D:\PROJETOS\lol-assets-T-52-integridade`), sem tocar no
  checkout da outra sessão, que está na `feat/T-47-painel-do-campeao`.

## O que ficou pendente

- **O merge do PR**, com a CI verde e o ok do dono. Não muda nada visível no site.
- **O T-50** implementa o aviso do RNF-13 seguindo a nota no ticket: `sha256` só quando
  `isByteStable`; no cdragon, formato e dimensão.

## Próximo passo sugerido

Mergear. Não há o que disparar depois — sem reindexação e sem mudança no site. A próxima vez
que alguém rodar `conferir:navegador`, o cenário do cdragon diz qual variante recebeu.

## Só o dono pode fazer

- Aprovar o merge do PR.
