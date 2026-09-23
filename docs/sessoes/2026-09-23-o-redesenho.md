# Sessão 22–23/09/2026 — o redesenho (Plano de Design, Fases 1 a 11)

O dono mandou executar o [Plano de Design](../design/PLANO-DE-DESIGN.md) inteiro, sem consultar
entre fases, com o orçamento da §7 como limite duro. Foram 12 PRs (#107 a #118), todos com os três
checks da CI verdes antes do merge, e cada um conferido no site publicado.

## A direção (Fase 1, T-78)

[ADR 0024](../adr/0024-a-direcao-visual-do-bin.md). O plano de tokens foi revisado contra a §2
antes de qualquer código, e cinco pontos da primeira passada caíram: o destaque `#EA5DA9` reprovava
em AA na superfície elevada (virou `#F072B3`); a Hanken Grotesk não tem `tnum` no arquivo latino e
lê como o padrão; o quadrado de marca, o raio único, a sombra e o zoom no hover eram os traços que
o plano manda tirar. Escolhida a **Schibsted Grotesk** (400/600/800), comparada com a Hanken e a
Familjen nos arquivos reais.

## O que foi entregue

| Fase | PR | Entrega |
|---|---|---|
| 1 | #107 | ADR 0024, tickets T-78 a T-88, capturas de antes |
| 2 | #108 | `TOKENS.md` reescrito e testado (paridade, AA, guardas), Schibsted Grotesk, marca e favicon, primitivos: glifo de proporção, marcas de corte, xadrez, controle segmentado, etiqueta de categoria, avisos de confirmação |
| 3 | #109 | Topo com a busca no centro da janela, barra lateral com a cor de etiqueta de cada categoria, aviso legal inteiro numa área própria, abas no telefone |
| 4 | #110 | Tile com hover parado (borda no destaque, marcas de corte) e **download rápido do square** num clique, tecla `D` e arrasto; função como controle segmentado |
| 5 | #111 | Busca agrupada por tipo, que acha **itens, runas e feitiços** pelo nome em português ou inglês |
| 6 | #112 | Painel do campeão: prévia 16:9 com marcas de corte e **área segura**, faixa de skins, **variantes em colunas** com o glifo, "Baixar PNG" primário, e o painel que **cresce do tile** |
| 7 | #113 | Runas por árvore sobre o xadrez, wards num card com "Arte / Sombra", feitiços e mapas maiores |
| 8 | #114 | Erro com "Tentar de novo" e o detalhe recolhido, vazio que convida, aviso de sem conexão, "Link copiado" |
| 9 | #115 | Barra do lote sem ponto médio, e "Baixado: <zip>" |
| 10 | #116 | Celular: barra de ação fixa no pé do painel, agindo sobre a variante escolhida |
| 11 | #117, #118 | Autocrítica das capturas: um defeito de pontuação corrigido, um enfeite a menos por tela, e o pré-carregamento que disputava banda com a primeira tela |

As capturas estão em [`docs/design/redesenho/`](../design/redesenho/), com os mesmos nomes em
`antes/` e `depois/`.

## O orçamento da §7, na produção

Mesmo método antes e depois (`orcamento.mjs`: contexto novo por volta, mediana; `inp-painel.mjs`:
telefone, CPU 4×, mediana de 7).

| Métrica | Limite | Antes (22/09) | Depois (23/09) |
|---|---|---:|---:|
| CLS, computador e telefone | 0 | 0 e 0 | **0 e 0** |
| LCP, computador | ≤ 1,0 s | 752 ms | **212 ms** |
| Primeiro tile, computador | ≤ 450 ms | 426 ms | **397 ms** |
| INP de tocar num campeão, frio | ≤ 200 ms | 240 ms | **64 ms** |
| INP, quente | ≤ 200 ms | 168 ms | **88 ms** |
| JS da chegada (transferido, até o primeiro tile) | ≤ 190 KB | 187 KB | **173 KB** |
| First Load JS da home (build) | — | 176 KB | **162 KB** |
| Fontes | 1 família, ≤ 3 pesos, woff2 com subset | 2 famílias, 75 KB | **1 família, 3 pesos, 1 woff2 de 46 KB** |

Leituras honestas sobre a tabela:

- **O LCP caiu porque mudou de elemento**, não porque as artes chegam 540 ms antes: com a fonte em
  `display: optional`, o texto não é repintado quando ela chega, e o maior elemento pintado passou
  a ser um bloco de texto. O primeiro tile é a medida da arte, e ele também melhorou.
- **Parte da queda do INP a frio** é o painel entrar um quadro depois do toque (ele virou um pedaço
  de JS separado). Por isso medi também o tempo do toque até o painel na tela, que é o que a
  pessoa vê: **160 → 142 ms** (A/B local, CPU 4×). As causas atacadas estão no PR #112: o tile
  memorizado (focar não redesenha os 173), a faixa e as variantes numa transição, e o painel e as
  categorias pré-carregados.
- **O "JS inicial" do plano era 174 KB**; o build dizia 176 e a transferência 187. Registro as três
  medidas. Depois do #112 o medidor passou a contar só o pedido até o primeiro tile: os pedaços do
  painel e das categorias (29 KB) chegam depois, no ócio, e somando tudo são 202 KB.

## Trocas e decisões que ficaram escritas

- **`display: optional` na fonte** (#108): com `swap`, a troca da fonte quebrava o aviso legal em
  uma linha a mais, e as seções da barra pulavam 18 px. Na primeira visita com rede lenta, a
  página pode aparecer na fonte de reserva; da segunda em diante, a Schibsted vem do cache.
- **O hover do tile numa sobreposição só** (#110): dentro de cada tile, a home ia de 1.387 para
  2.751 nós. Agora 1.364.
- **"Baixar PNG" primário** e **um botão só para arquivo que já é PNG** (#112): contraria a letra
  do [ADR 0001](../adr/0001-formato-de-entrega-dos-assets.md) e o critério do RF-12. Segui o plano,
  que é ordem do dono, e emendei os dois no mesmo PR.
- **A virtualização saiu da busca** (#111, emenda ao [ADR 0011](../adr/0011-base-de-componentes-do-front.md)):
  agrupada, a lista tem dezenas de nós.
- **O filtro "Imagem" das wards (T-75) saiu** (#113): o card com "Arte / Sombra" resolve o mesmo
  problema pela raiz.
- **A função virou uma por vez** (#110): o controle segmentado do plano é de escolha única; antes,
  duas funções somavam.

## O arrasto (§6, "verificar no Chrome, Edge e Firefox")

| Navegador | Resultado |
|---|---|
| Chromium 153 | Arrasto real do tile: `DownloadURL` com `Jax_square.png` em resolução total |
| Edge 153 | O mesmo |
| Firefox | **Não verificado**: não está instalado nesta máquina, e ele não conhece `DownloadURL`. O site não promete o arrasto em lugar nenhum |

O soltar na área de trabalho do Windows não foi exercitado por automação; o que se conferiu é o
que o navegador põe no arrasto.

## Acessibilidade

Os 85 e2e passaram em todo PR, com o axe e os testes de foco das rodadas 4 a 9 sem alteração de
rigor. O contraste de cada par de texto da paleta nova, e das oito etiquetas, é teste de unidade
(`tokens.test.ts`). O anel de foco é o destaque afastado 2 px, para cair sobre o fundo e não sobre a
arte.

## O que fica com o dono

- **A validação com pessoas (§9).** A rodada de linha de base não foi feita antes do redesenho, e a
  segunda é a única prova de que ele melhorou a vida de quem usa. É a única parte que nenhuma
  sessão automática faz.
- A direção (cor, fonte, conceito) está no ADR 0024 e nas capturas; o plano previa a revisão dela
  depois das capturas da Fase 11.
