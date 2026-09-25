---
name: Biblioteca de Assets
description: O bin do editor — catálogo de assets de League of Legends para quem edita vídeo.
colors:
  acento: "#f072b3"
  acento-forte: "#f990c4"
  acento-suave: "#45293a"
  fundo: "#1e2023"
  superficie: "#272a2e"
  superficie-alta: "#30343a"
  campo: "#383c42"
  linha: "#363a3f"
  linha-forte: "#4a4f56"
  texto: "#e9e7e2"
  texto-suave: "#b3b6bb"
  xadrez-claro: "#35383d"
  xadrez-escuro: "#2c2f33"
  etiqueta-campeoes: "#92a8eb"
  etiqueta-itens: "#d79e65"
  etiqueta-runas: "#55bfb3"
  etiqueta-feiticos: "#61b7de"
  etiqueta-icones: "#e39385"
  etiqueta-emotes: "#b9ac5f"
  etiqueta-wards: "#82bc83"
  etiqueta-mapas: "#b99bde"
typography:
  display:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "tnum"
  brand:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    letterSpacing: "-0.02em"
rounded:
  quadro: "2px"
  controle: "6px"
  painel: "12px"
spacing:
  controle-xs: "24px"
  controle-sm: "26px"
  controle-md: "28px"
  controle: "30px"
  controle-lg: "32px"
  controle-xl: "44px"
  topo: "56px"
  barra-lateral: "208px"
  busca-max: "560px"
components:
  botao-primario:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.fundo}"
    rounded: "{rounded.controle}"
    padding: "0 10px"
    height: "{spacing.controle}"
  botao-primario-hover:
    backgroundColor: "{colors.acento-forte}"
  botao-tonal:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.texto}"
    rounded: "{rounded.controle}"
    height: "{spacing.controle-md}"
  botao-tonal-hover:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.fundo}"
  botao-contorno:
    backgroundColor: "{colors.superficie-alta}"
    textColor: "{colors.texto}"
    rounded: "{rounded.controle}"
    height: "{spacing.controle}"
  botao-contorno-hover:
    backgroundColor: "{colors.campo}"
  botao-fantasma:
    textColor: "{colors.texto-suave}"
    rounded: "{rounded.controle}"
  botao-fantasma-hover:
    backgroundColor: "{colors.superficie-alta}"
    textColor: "{colors.texto}"
  chip:
    textColor: "{colors.texto-suave}"
    rounded: "{rounded.controle}"
    height: "{spacing.controle-md}"
    padding: "0 10px"
  chip-marcado:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.texto}"
  segmento:
    textColor: "{colors.texto-suave}"
    height: "{spacing.controle-sm}"
  segmento-marcado:
    backgroundColor: "{colors.superficie-alta}"
    textColor: "{colors.texto}"
  campo:
    backgroundColor: "{colors.superficie-alta}"
    textColor: "{colors.texto}"
    rounded: "{rounded.controle}"
    height: "{spacing.controle-lg}"
  painel:
    backgroundColor: "{colors.superficie-alta}"
    rounded: "{rounded.painel}"
  tile:
    rounded: "{rounded.quadro}"
---

# Design System: Biblioteca de Assets

> Os valores de cor, tipo, raio e altura são os de [`docs/design/TOKENS.md`](../../docs/design/TOKENS.md),
> traduzidos em [`src/app/globals.css`](src/app/globals.css); `src/lib/tokens.test.ts` trava a
> paridade entre os dois e o contraste de cada par de texto. A decisão e a emenda de 25/09/2026
> estão no [ADR 0024](../../docs/adr/0024-a-direcao-visual-do-bin.md). Este arquivo explica o
> sistema; mudou token, muda o `TOKENS.md` primeiro.

## Overview

**Creative North Star: "O bin do editor"**

O vocabulário visual vem da mesa de edição, não do jogo: grafite de software de edição, a arte
como quadro na proporção real, e as marcas que um editor reconhece — o xadrez de transparência,
as marcas de corte, o glifo de proporção. A interface é densa e calma; quem grita é a arte. Nada
de dourado, hextech ou moldura da Riot.

A profundidade é tonal (fundo → superfície → superfície elevada), nunca sombra. Há um único
destaque, o magenta de marcador, reservado para ação primária e foco. As oito cores de etiqueta
existem só como marcador pequeno ao lado do nome da categoria.

**Key Characteristics:**
- Grafite médio-escuro, tema só escuro (`color-scheme: dark`).
- Um destaque, magenta, para ação e foco; seleção em grafite elevado com peso e contorno.
- Uma família (Schibsted Grotesk), três pesos (400, 600, 800), algarismos tabulares onde há coluna.
- Três raios com hierarquia: quadro 2, controle 6, painel 12.
- Ornamento só do ofício: xadrez, marcas de corte, glifo de proporção.
- Um momento de movimento autoral: o painel que cresce do tile (240 ms).

## Colors

Grafite com corpo, não preto, para a arte saturada saltar; um magenta; oito etiquetas de mesma
luminosidade.

### Primary
- **Magenta de marcador** (`acento`): ação primária ("Baixar PNG", "Baixar zip"), anel de foco,
  cursor do campo, marca de confirmado. Texto sobre ele é o `fundo`. `acento-forte` é o `hover`
  da primária; `acento-suave` é o fundo do botão tonal e do que está selecionado para o lote.

### Neutral
- **Grafite de fundo** (`fundo`): a página, atrás da grade; também o texto sobre o magenta.
- **Superfície** (`superficie`): topo, barra lateral, trilho do controle segmentado.
- **Superfície elevada** (`superficie-alta`): painel, menus, avisos, `hover` de item, botão de contorno, campo.
- **Campo** (`campo`): `hover` do contorno, chip marcado, dica.
- **Linha / Linha forte** (`linha`, `linha-forte`): divisões; borda de controle e de campo.
- **Texto / Texto suave** (`texto`, `texto-suave`): principal; contagens, metadados, aviso legal.
- **Xadrez** (`xadrez-claro`, `xadrez-escuro`): textura de transparência, 1,14:1 entre si.
- **Véu** (`--veu`, `rgba(18, 19, 21, 0.72)`): escurece a página atrás do painel. Fora do tema.

### Tertiary
- **Etiquetas de categoria** (`etiqueta-*`, oito): OKLCH L 0,74, croma 0,10, só a matiz muda, e
  nenhuma a menos de 40° do magenta. Bolinha de 8 px ao lado do nome da categoria (barra lateral,
  grupo da busca). Categoria nova cai no `texto-suave`.

### Named Rules
**The One Voice Rule.** O magenta é ação e foco, e nada mais. Seleção de filtro e de segmento é
grafite elevado (`campo` / `superficie-alta`) com contorno e peso 600. A marca é desenhada na cor
do texto.

**The Never Alone Rule.** Cor nunca diz um estado sozinha: seleção tem marca além do contorno;
erro tem ícone e texto, e não é vermelho (não existe cor de erro); etiqueta sempre acompanha o nome.

**The Measured Contrast Rule.** Todo par de texto passa WCAG AA pelo cálculo da WCAG 2.1, rodado
no `tokens.test.ts`; o axe roda com `wcag2aa`/`wcag22aa` em `e2e/acessibilidade.spec.ts`.

## Typography

**Display Font:** Schibsted Grotesk (com `system-ui`, `sans-serif`)
**Body Font:** Schibsted Grotesk
**Label/Mono Font:** nenhuma mono; metadados usam `tabular-nums` da própria família.

**Character:** grotesca de redação, compacta e seca, feita para texto pequeno e denso; tem voz sem
disputar com o quadro. Servida pelo `next/font`, subconjunto latino, woff2 variável, `display: optional`.

### Hierarchy
A raiz é 14 px. Escala: 11, 12, 13, 14, 15, 16, 20, 26 px (ver `TOKENS.md`).
- **Display** (800, 26 px, 1.2, −0,01 em): título de página (Sobre) e nome do campeão no painel.
- **Headline** (600, 20 px, 1.2, −0,01 em): título de estado de página inteira (404).
- **Title** (600, 14 px, 1.3): nome no tile; até duas linhas nas galerias de nome longo e no seletor de skin.
- **Body** (400, 14 px; 1.6 em texto corrido): corpo, busca da categoria. Busca principal em 16 px; nome do arquivo na lista do painel em 15 px.
- **Label** (400/600, 12–13 px, 1.3): botões, chips e segmentos em 13 px; metadado e rótulo de seção em 13 px `texto-suave`; aviso legal e contagem curta em 11 px.
- **Marca** (800, 14 px, −0,02 em): o nome do produto ao lado do símbolo.

### Named Rules
**The No Caps Rule.** Nenhum rótulo em caixa-alta; o rótulo de seção é 13 px, peso 600, em `texto-suave`.

**The Thousand Point Rule.** Números com o ponto do milhar (`toLocaleString("pt-BR")`) em toda
parte; algarismos tabulares só onde há coluna para alinhar.

## Layout

- **Computador (`md`+):** grade de duas colunas — barra lateral de 208 px (`barra-lateral`) e
  conteúdo — sob um topo de 56 px na largura toda: marca à esquerda (na largura da barra), busca
  centralizada até 560 px (`busca-max`). A barra lateral lista as categorias com a bolinha de
  etiqueta, "Sobre" e o aviso legal. A casca tem altura fixa (`h-screen`) e cada região rola por dentro.
- **Celular:** busca no topo, categorias em abas que rolam de lado sem barra visível, painel em
  tela cheia com a ação fixa embaixo. Todo controle pequeno ganha, sob `pointer: coarse`, um alvo
  invisível de 44 px (`ALVO_DE_TOQUE`), sem mudar o desenho.
- **Tela baixa (`baixa:`, altura ≤ 500 px):** a casca solta e a página rola inteira.
- **Galerias:** colunas `auto-fill` a partir da largura-alvo do tile por densidade (112 / 152 /
  210 px). As galerias longas (painel de asset, busca) são virtualizadas por linha de altura fixa,
  sem medir elemento; a grade de 173 campeões não virtualiza e reserva altura com
  `content-visibility` e `contain-intrinsic-size`.
- **Ritmo:** margem lateral de 14 px; vãos de 8–14 px na grade conforme a densidade; controles
  medidos em altura (24 → 56 px, ver `TOKENS.md`).

### Named Rules
**The Box Owns The Size Rule.** Toda imagem mora numa caixa que já tem o tamanho final; nada pula
quando os bytes chegam. `e2e/desempenho.spec.ts` observa o `layout-shift` desde o primeiro script
(orçamento do Plano §7: CLS 0; o teste tolera 0,02).

**The Budget Rule.** Orçamento do Plano de Design §7, não negociável: JS inicial ≤ 190 KB, LCP
desktop ≤ 1,0 s, INP ≤ 200 ms, uma família com até três pesos. Decisão visual que estoura sai.

## Elevation & Depth

Plano, sem sombra de elevação. A ordem é tonal: `fundo`, `superficie`, `superficie-alta`, e o véu
escurece o que fica atrás do painel. Marcas sobre a arte usam `mix-blend-difference` em vez de sombra.

### Named Rules
**The Lighter Is Closer Rule.** Profundidade vem da superfície mais clara, nunca de `box-shadow`.

## Shapes

- **Quadro** (2 px): tile, prévia, miniatura — a arte é quadro, não cartão.
- **Controle** (6 px): botão, campo, chip, trilho do controle segmentado, tecla.
- **Painel** (12 px): painel centralizado, menu da busca, aviso.
- **Círculo** só na bolinha de etiqueta e na marca de seleção.
- Bordas de 1 px em `linha`/`linha-forte`.

### Named Rules
**The Craft Ornament Rule.** Os únicos ornamentos são do ofício: o **xadrez** (utilidade
`xadrez`, quadrados de 8 px) em todo asset com alfa (PNG, WebP; JPEG nunca), as **marcas de
corte** (utilidade `marcas-de-corte`, cantos de 10 × 1,5 px em `currentColor`; fora da prévia do
painel, dentro do tile no `hover`/foco) e o **glifo de proporção** (retângulo vazado nas medidas
reais do arquivo, tracejado quando desconhecidas). O símbolo da marca é um quadro 16:9 entre
marcas de corte.

## Components

Os primitivos moram em `src/components/ui/`. Ícones são Lucide (ADR 0017).

### Buttons (`botao`, `botao-icone`)
- **Shape:** controle (6 px); o tamanho é altura (24 · 26 · 28 · 30 · 32 px).
- **Primário:** magenta com texto `fundo`, peso 600. No máximo um por contexto.
- **Tonal:** a primária que se repete numa lista — `acento-suave` com borda magenta a 60%, cheia no `hover`.
- **Contorno** (padrão): `superficie-alta` com `linha-forte`; `hover` em `campo`. Ação secundária ("Original", fechar).
- **Fantasma:** sem borda, `texto-suave`; ganha superfície no `hover`.
- **Desabilitado:** opacidade 45% e cursor proibido. Foco: o anel global.

### Download pair (`par-de-download`)
"Baixar PNG" (primário ou tonal) e "Original" (contorno) lado a lado, sempre antes do download,
nunca num menu. Asset já PNG tem um botão só; `alinhado` reserva o lugar do segundo numa lista.
Formas compacta e só-ícone para tiles estreitos. O texto não muda com o estado: o ícone gira ao
baixar e vira ✓ por 1,2 s; o aviso "Baixado: <arquivo>" surge no canto (`surgir`, 160 ms).

### Chips (`chip`)
- **Style:** 28 px, borda `linha`, `texto-suave`, 13 px; caixa de seleção real escondida.
- **State:** marcado em `campo` com `linha-forte` e peso 600 — não magenta.

### Segmented control (`controle-segmentado`)
Rádios reais num `fieldset`, trilho `superficie` com borda `linha`; o segmento marcado ganha
`superficie-alta`, contorno e peso. Contagem opcional em `texto-suave` com ponto do milhar.

### Inputs / Fields (`campo`, `Tecla`)
- **Style:** 32 px (44 px na busca principal), `superficie-alta`, borda `linha-forte`, raio de controle.
- **Focus:** borda e cursor magenta; o anel fino (`data-anel="fino"`) cola na borda.
- **Tecla:** `kbd` em 12 px com borda `linha-forte`.

### Panel (`painel-lateral`)
Diálogo Radix com véu. Na borda direita (até 540 px) ou, com `centralizado`, uma folha de até
1320 × 900 px no centro, raio de painel, borda `linha-forte`, em duas colunas no painel do
campeão (prévia com todas as skins à vista; arquivos ao lado). No celular, tela cheia. Com
`origem`, nasce na caixa do tile e cresce até o lugar dele.

### Imagem, esqueleto, estado
- **Imagem:** caixa com tamanho final; pulsa ao carregar, entra em 150 ms de opacidade, e no erro diz que a fonte não respondeu (ou só o ícone, em miniatura).
- **Esqueleto:** `superficie-alta`, raio de controle, `pulsar` 1,2 s, sempre `aria-hidden`.
- **Estado:** vazio/erro/404 falam igual — ícone, título, o que fazer, detalhe técnico recolhido, ação opcional.

### Navigation
Barra lateral no computador, abas roláveis no celular; cada item leva a bolinha de etiqueta. O item ativo ganha peso 600 e `texto`: no computador, fundo `superficie-alta`; no celular, a aba ativa ganha borda no destaque (o lugar onde o magenta marca navegação atual).

### Motion
Movimento só em resposta a uma ação, só `transform` e `opacity`, curva `ease-saida`
(`cubic-bezier(0.2, 0.8, 0.2, 1)`). O único momento autoral é o painel crescendo do tile em
240 ms, com escala uniforme. Com `prefers-reduced-motion`, tudo vira instantâneo e o estado segue
dito por texto e ícone.

## Do's and Don'ts

### Do:
- **Do** usar `acento` só em ação primária, foco e confirmação; `tonal` quando a primária se repete numa lista.
- **Do** mostrar toda arte na proporção real, com xadrez se o formato tem alfa.
- **Do** manter o anel de foco em 2 px de magenta afastado 2 px, sobre o fundo, não sobre a arte.
- **Do** dar a todo controle um alvo de toque de 44 px no celular.
- **Do** reservar a altura de toda imagem e de toda linha de galeria antes do conteúdo chegar.
- **Do** mudar o `TOKENS.md` antes de mudar um token no `globals.css`.

### Don't:
- **Don't** usar sombra de elevação; a profundidade é a superfície mais clara.
- **Don't** usar o magenta para seleção de filtro, para a marca ou como decoração.
- **Don't** usar uma cor de etiqueta sozinha, grande ou como fundo.
- **Don't** escrever rótulo em caixa-alta espaçada, nem usar fonte mono.
- **Don't** dar zoom na arte no `hover`, nem entrada em *fade* nas seções.
- **Don't** imitar o cliente do jogo (dourado, hextech, molduras da Riot).
- **Don't** criar cor de erro: o estado é dito por ícone e texto.
