# ADR 0019 — O `sha256` do cdragon não confere o download: a borda recomprime a imagem

- **Status:** ✅ aceito (15/09/2026)
- **Data:** 2026-09-15
- **Ticket:** T-52
- **Emenda:** o critério de aceite do RF-10 e o RNF-13 da Spec; a consequência "o `sha256`
  deixa de ser garantia e vira detector" do [ADR 0012](0012-onde-guardar-os-assets.md), que
  passa a valer só para as fontes de bytes estáveis
- **Respeita:** [0001](0001-formato-de-entrega-dos-assets.md) (os bytes da fonte, sem
  re-encode), [0012](0012-onde-guardar-os-assets.md) (sem storage) e o contrato **1.3.0**, que
  não muda de forma

## Contexto

Em 15/09/2026 a conferência no navegador (T-43) contra o site no ar deu 8 de 9. Falhou "baixar
do cdragon traz os bytes que o índice descreve": o download funcionou, o nome batia, e o
`sha256` não — `ea46dfef…` recebido contra `7ecc3c95…` no índice, no `Emote_0.png`. Os oito
primeiros emotes da fatia publicada divergiam todos, sempre para menos (67.187 → 62.621 bytes no
`Emote_10001.png`), com `Last-Modified` de maio de 2026, mais velho que o índice. Os valores do
índice eram os mesmos no `a8b3c4a` (11/09) e no `63dacdb` (a reindexação de 15/09): não foi a
reindexação. Em 11/09 a mesma conferência tinha dado 9 de 9.

A hipótese era de um CDN na frente do `raw.communitydragon.org` entregando bytes diferentes para
a mesma URL, conforme os cabeçalhos da requisição ou o estado do cache.

## O que foi medido

Em 15/09/2026, pela borda GRU da Cloudflare, uma requisição por vez, todas com o User-Agent da
regra 4: 10 ao cdragon e 1 ao ddragon. Os dados brutos estão em
[`t52-polish-do-cdragon.json`](../evidencias/t52-polish-do-cdragon.json).

| `Emote_10001.png` — índice: 67.187 B, `d776f456…` | Cache | `cf-polished` | Bytes | = índice |
|---|---|---|---:|---|
| o `SourceClient` do indexador, sem mudar nada | HIT | `ok, orig_size=67187` | 62.621 | não |
| curl com os cabeçalhos do httpx | HIT | `ok, orig_size=67187` | 62.621 | não |
| curl com os cabeçalhos de um `<img>` do Chrome | HIT | `ok, orig_size=67187` | 62.621 | não |
| curl com os cabeçalhos do `fetch()` do site | **MISS** | — | **67.187** | **sim** |
| `fetch()` do site, só `Origin`, só `Sec-Fetch-Mode` e `Accept: */*`, de novo | HIT | `ok, orig_size=67187` | 62.621 | não |

| `Emote_0.png` — índice: 262.513 B, `7ecc3c95…` | Cache | `cf-polished` | Bytes | = índice |
|---|---|---|---:|---|
| curl, `Accept: */*` | REVALIDATED | `ok, orig_size=262513` | 26.479 | não — é o `ea46dfef…` da conferência |
| curl com os cabeçalhos do `fetch()` do site | **MISS** | — | **262.513** | **sim** |

1. **É o Cloudflare Polish.** `cf-polished: ok, orig_size=N` diz que a imagem foi recomprimida
   e que o original tinha N bytes — e N é exatamente o `bytes` do índice nas duas amostras.
2. **Quem escolhe a variante é o cache, não o cabeçalho.** A origem veio nas duas faltas de
   cache, e com o cache quente todos os perfis receberam a recompressão: o `SourceClient`, o
   httpx, o `<img>`, o `fetch()` do site, só `Origin`, só `Sec-Fetch-Mode`. User-Agent, `Accept`
   e `Accept-Encoding` não mudaram nada. As duas faltas foram a primeira requisição com o
   `Origin` do site para aquela URL, e a segunda já veio recomprimida; se a Cloudflare separa o
   cache por `Origin` ou se respondeu outro nó, não dá para saber de fora. Nos dois casos, a
   variante é do cache, e nenhum cabeçalho a fixa.
3. **A arte é a mesma; os bytes, não.** Mesmo formato (PNG RGBA), mesmas dimensões e o mesmo
   canal alfa, pixel a pixel. Diferem 14.295 de 65.536 pixels no `Emote_10001` e 3.271 no
   `Emote_0` — **todos totalmente transparentes dos dois lados**: o Polish troca a cor debaixo
   do alfa 0 e recomprime o `IDAT`. Nenhum pixel visível mudou, e não havia metadado para
   tirar: os dois arquivos só têm `IHDR`, `IDAT` e `IEND`.
4. **O navegador não vê a diferença.** O cdragon manda `Access-Control-Allow-Origin: *` e nenhum
   `Access-Control-Expose-Headers`: o `fetch()` do site não lê o `cf-polished`.
5. **O ddragon não passa por nada disso.** O `Jax.png` veio do CloudFront sobre S3, sem
   `cf-polished`, com os 27.107 bytes e o `sha256` do índice.

O indexador mede emotes e wards de novo a cada indexação completa, pelo mesmo `SourceClient`: o
que fica no índice é o que a borda do runner — nos Estados Unidos — entregou naquela hora. Nas
duas amostras, foi a origem. O dono e a conferência chegam pela borda GRU, que o próprio site
aquece: as miniaturas da grade pedem as mesmas URLs. Isso explica o 9 de 9 de 11/09 — o
primeiro emote ainda frio na borda —, mas não dá para prová-lo de trás para frente.

## A pergunta: o indexador deveria medir o que o navegador recebe?

**Não existe "o que o navegador recebe".** Na mesma borda, no mesmo minuto, a mesma URL entregou
dois arquivos. A variante muda com o nó que responde, com a idade da cópia (`max-age=3600`: no
mínimo uma revalidação por hora), com a borda — a do runner não é a do visitante — e com o tempo
que o Polish leva para processar uma cópia nova. Qualquer hash que o indexador grave para o
cdragon é a fotografia de um cache.

**E forçar a origem não é opção.** Uma URL com parâmetro que fure o cache faria cada uma das
11.765 entradas do cdragon no índice bater no servidor de origem do Community Dragon a cada
patch — um serviço mantido por voluntários. É o contrário do espírito da regra 4. Não foi
testado, porque testar já seria o abuso.

## Decisão

1. **No cdragon, `sha256` e `bytes` descrevem o arquivo que o indexador recebeu — não conferem
   o download.** O índice continua trazendo os dois: o contrato 1.3.0 os exige, e nada no
   formato muda.
2. **A lista das fontes de bytes estáveis mora no contrato:** `BYTE_STABLE_SOURCES` e
   `isByteStable(source)` em `@lol-assets/schema`. Hoje, só o `ddragon`. Fonte nova entra só
   depois de ter a entrega medida. As descrições do `sha256` e do `bytes` no JSON Schema dizem o
   mesmo.
3. **O que o índice garante sobre um download:**
   - de **toda** fonte: o arquivo salvo é o que a fonte entregou ao navegador, sem re-encode
     (RF-10), com o `format`, a `width` e a `height` do índice — a recompressão sem perdas
     preserva os três;
   - de fonte com bytes estáveis, também o `sha256` do índice.
4. **A conferência no navegador confere exatamente isso.** Os dois cenários de download comparam
   o arquivo salvo com o que a fonte entregou àquele navegador, na URL do índice, e as dimensões
   do PNG com as do índice; o `sha256` do índice só entra quando `isByteStable`. Quando o
   cdragon entrega a outra variante, a conferência anota qual — não falha.

## O que o T-50 deve usar

> **Emendado em 16/09/2026:** o aviso na interface **não foi construído**. O dono decidiu tirar do
> RNF-13 o aviso a cada download (T-50b, fechado sem executar): ele só valeria para o ddragon,
> que diverge por horas entre um patch e a reindexação. A regra abaixo continua valendo para a
> conferência no navegador contra o site no ar — que é quem verifica o RNF-13 — e para qualquer
> aviso que um dia volte a ser pedido.

O RNF-13 na interface — `sha256` divergente vira aviso, nunca bloqueio — ficaria assim:

- **Comparar o `sha256` só quando `isByteStable(asset.source)`.** No cdragon, divergir é o
  normal da borda: avisar seria alarme falso em quase todo download de emote, ward e chroma — o
  defeito que o [ADR 0018](0018-aviso-mede-a-ultima-verificacao.md) corrigiu no aviso de índice
  velho.
- **No cdragon, o detector que sobra é formato e dimensão**, lidos do começo do arquivo baixado
  (IHDR do PNG, SOF do JPEG). Arte trocada com a mesma dimensão passa sem aviso: é o limite
  honesto do que dá para saber.
- **O `bytes` do cdragon é o tamanho na fonte**, e o arquivo entregue pode ser bem menor —
  26.479 contra 262.513 bytes no `Emote_0`. Se a interface mostrar o tamanho de um asset do
  cdragon, não deve prometê-lo exato.

## Alternativas consideradas

- **Medir com cabeçalhos de navegador.** Refutado pela medição: com o cache quente, o httpx e o
  navegador recebem a mesma recompressão; numa falta de cache, os dois recebem a origem.
- **Tirar o `sha256` do cdragon do índice.** O índice ficaria honesto sozinho, e o T-50
  compararia "quando houver". Mas o `sha256` é obrigatório no contrato 1.3.0 e `string` no tipo
  que o redesenho do front (T-45 a T-50) compila: deixá-lo opcional é contrato novo com
  consumidor quebrando e reindexação das 11.765 entradas, para economizar ~1 MB do índice cru. E
  o `bytes`, que também diverge, continuaria lá pedindo a mesma regra. Fica para quando o
  contrato mudar de versão maior por outro motivo.
- **Um campo por asset no índice** (`byteStable`, por exemplo). Repetiria em cada um dos 27.313
  registros uma propriedade da **fonte**, que o `source` já diz.
- **Hash dos pixels visíveis.** O Polish os preservou nas duas amostras, mas o navegador não
  reproduz o número: o canvas guarda alfa pré-multiplicado e arredonda os pixels
  semitransparentes, e os decodificadores de JPEG variam entre motores. Pediria decodificador de
  PNG e de JPEG em JavaScript para um aviso que nunca bloqueia.
- **Ler o `cf-polished` no navegador**, para separar recompressão de arte trocada. Sem
  `Access-Control-Expose-Headers`, o navegador não lê o cabeçalho.
- **Pedir ao Community Dragon para desligar o Polish** (`Cache-Control: no-transform` na
  origem). A banda é deles, e o Polish a economiza em até ~10× (`Emote_0`). Não é nosso para
  pedir por conveniência.

## Consequências

- **A conferência no navegador volta a concordar com o índice**, e o cenário do cdragon passa a
  se chamar pelo que prova.
- **Nada muda no índice, no contrato, no indexador ou no site.** Sem reindexação e sem diferença
  no deploy. O único código novo que o site importa é a regra do `@lol-assets/schema`, e quem vai
  usá-la na interface é o T-50.
- **O `sha256` do cdragon no índice fica informativo.** Nem mudança entre patches ele detecta:
  pode trocar só porque a borda do runner trocou de variante.
- **O `totalBytes` do manifesto é aproximado** no que vem do cdragon, pela mesma razão.

## Como voltar atrás

- **Se o Polish sair do `raw.communitydragon.org`** — o `cf-polished` sumindo de uma amostra, em
  mais de uma borda —, reindexar e medir de novo antes de pôr `cdragon` em
  `BYTE_STABLE_SOURCES`. O teste da lista quebra de propósito quando ela muda, e é ele que pede
  o ADR novo.
