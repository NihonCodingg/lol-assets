# Tokens do design

> **A fonte de verdade do tema.** Reescrito em 22/09/2026 a partir do
> [Plano de Design](PLANO-DE-DESIGN.md) e do [ADR 0024](../adr/0024-a-direcao-visual-do-bin.md)
> (o bin do editor). A versão anterior (zinco, violeta, Inter Tight e JetBrains Mono) está no
> histórico do git.
>
> `apps/web/src/lib/tokens.test.ts` compara esta página com `globals.css` valor a valor, nos
> dois sentidos, e mede o contraste de cada par de texto. Mudou token, muda aqui primeiro.

## Cor

> **T-89, 25/09/2026.** O dono achou o site difícil de ler: o texto secundário subiu de
> `#9b9ea3` (5,36:1 na superfície) para `#b3b6bb` (7,09:1), a escala de texto de todo o site subiu
> um degrau (o metadado de 12 para 13 px, o nome de 13 para 14), e o xadrez ficou mais discreto
> (1,14:1 entre os quadrados, antes 1,23), para a arte aparecer mais do que o fundo.

Grafite de software de edição, não preto: um cinza-médio-escuro com corpo cansa menos a vista e
deixa a arte saturada saltar. A profundidade vem da superfície mais clara, nunca de sombra.

### Superfícies e linhas

| Token | Valor | Onde |
|---|---|---|
| `fundo` | `#1e2023` | fundo da página, atrás da grade |
| `superficie` | `#272a2e` | topo, barra lateral, controle segmentado |
| `superficie-alta` | `#30343a` | painel, menus, avisos, `hover` de item, botão de contorno |
| `campo` | `#383c42` | `hover` do botão de contorno, dica. `texto` 8,98:1, `texto-suave` 5,45:1 |
| `linha` | `#363a3f` | divisões |
| `linha-forte` | `#4a4f56` | borda de controle e de campo |

### Texto

Contraste pela fórmula da WCAG 2.1. **Os números são computados**, e o mesmo cálculo roda no
teste.

| Token | Valor | s/ `fundo` | s/ `superficie` | s/ `superficie-alta` | Onde |
|---|---|---:|---:|---:|---|
| `texto` | `#e9e7e2` | 13,21 | 11,66 | 10,13 | texto principal |
| `texto-suave` | `#b3b6bb` | 8,03 | 7,09 | 6,15 | contagens, metadados, aviso legal |

### Destaque — um só

| Token | Valor | Onde |
|---|---|---|
| `acento` | `#f072b3` | foco, seleção, ação primária, marca de confirmado |
| `acento-forte` | `#f990c4` | `hover` da ação primária |
| `acento-suave` | `#45293a` | fundo do que está selecionado (o `texto` sobre ele: 10,42:1) |

Magenta de marcador, cor de etiqueta clássica de editor de vídeo. Não é roxo, dourado, verde-azulado
(Riot), verde-ácido nem vermelhão. Sobre ele, o texto é o `fundo` (6,04:1). Como texto: 6,04:1
sobre o fundo, 5,33:1 sobre a superfície, 4,63:1 sobre a superfície elevada.

### Transparência

| Token | Valor | Onde |
|---|---|---|
| `xadrez-claro` | `#35383d` | quadrados claros do fundo de transparência |
| `xadrez-escuro` | `#2c2f33` | quadrados escuros do fundo de transparência |

O xadrez é a utilidade `xadrez` (quadrados de 8 px) e vai em **todo** asset cujo formato tem alfa
(PNG, WebP). JPEG não tem alfa e não recebe xadrez.

### Etiquetas de categoria

Oito tons com a mesma luminosidade (OKLCH L 0,74) e croma contido (0,10). Só a matiz muda, e
nenhuma fica a menos de 40° do destaque (350°). Aparecem só como marcador pequeno ao lado do nome
da categoria, **nunca sozinhas**.

| Token | Valor | Matiz | s/ `superficie` |
|---|---|---:|---:|
| `etiqueta-campeoes` | `#92a8eb` | 270° | 6,19 |
| `etiqueta-itens` | `#d79e65` | 65° | 6,16 |
| `etiqueta-runas` | `#55bfb3` | 185° | 6,51 |
| `etiqueta-feiticos` | `#61b7de` | 230° | 6,41 |
| `etiqueta-icones` | `#e39385` | 30° | 6,03 |
| `etiqueta-emotes` | `#b9ac5f` | 100° | 6,27 |
| `etiqueta-wards` | `#82bc83` | 145° | 6,50 |
| `etiqueta-mapas` | `#b99bde` | 305° | 6,04 |

### Fora do tema

| Valor | Onde |
|---|---|
| `rgba(18, 19, 21, 0.72)` (`--veu`) | véu atrás do painel |
| `rgba(240, 114, 179, 0.32)` | `::selection` |

## Tipografia

Uma família: **Schibsted Grotesk**, pelo `next/font`, subconjunto latino, um woff2 variável.
Três pesos: **400** (texto), **600** (nomes, botões, item ativo) e **800** (marca, título do
painel). Nada de mono: resolução, peso, contagem e progresso usam `tabular-nums` da própria
família. Nenhum rótulo em caixa-alta.

| Token | Família |
|---|---|
| `fonte-interface` | `"Schibsted Grotesk", system-ui, sans-serif` |

### Escala

A raiz é 14 px.

| Token | Tamanho | Onde |
|---|---:|---|
| `texto-11` | 11px | aviso legal, contagem, dica curta |
| `texto-12` | 12px | botão, metadado, controle segmentado |
| `texto-13` | 13px | nome no tile, item de lista, corpo compacto |
| `texto-14` | 14px | corpo, campo de busca da categoria, nome no tile |
| `texto-15` | 15px | nome do arquivo na lista do painel (T-89) |
| `texto-16` | 16px | campo de busca principal |
| `texto-20` | 20px | título de estado de página inteira (404) |
| `texto-26` | 26px | título de página (Sobre) e nome da skin no painel do campeão (T-89) |

### Entrelinha e espacejamento

| Token | Valor | Onde |
|---|---|---|
| `entrelinha-apertada` | `1.2` | títulos |
| `entrelinha-cartao` | `1.3` | nome e contagem do tile |
| `entrelinha-solta` | `1.6` | aviso legal, texto corrido |
| `espacejamento-titulo` | `-0.01em` | títulos de 20 px ou mais |
| `espacejamento-marca` | `-0.02em` | nome do produto |

## Raio

Uma hierarquia, não um raio em tudo: a arte é quadro, não cartão.

| Token | Valor | Onde |
|---|---:|---|
| `raio-quadro` | 2px | tile, prévia, miniatura |
| `raio-controle` | 6px | botão, campo, chip, controle segmentado |
| `raio-painel` | 12px | painel, menu da busca, aviso |

## Altura de controle

| Token | Valor | Onde |
|---|---:|---|
| `controle-min` | 17px | caixa de seleção no tile |
| `controle-xs` | 24px | seta de skin anterior/próxima |
| `controle-sm` | 26px | segmento do controle segmentado, fechar |
| `controle-md` | 28px | botão de variante, chip |
| `controle` | 30px | botão da barra do lote |
| `controle-lg` | 32px | botão do cabeçalho |
| `barra` | 36px | faixa de título |
| `paleta-rodape` | 34px | rodapé do menu da busca |
| `paleta-campo` | 44px | campo do menu da busca |
| `cabecalho` | 48px | cabeçalho do painel |
| `bandeja` | 52px | barra do lote |
| `topo` | 56px | o topo do site, com a busca |
| `controle-xl` | 44px | campo de busca principal; alvo de toque no celular |

## Largura

| Token | Valor | Onde |
|---|---:|---|
| `barra-lateral` | 208px | coluna da esquerda |
| `busca-max` | 560px | campo de busca do topo |
| `alvo-cartao-compacto` | 112px | largura-alvo do tile (compacto, T-55) |
| `alvo-cartao-denso` | 152px | largura-alvo do tile (denso) |
| `alvo-cartao-confortavel` | 210px | largura-alvo do tile (confortável) |

## Altura de tela

| Variante | Condição | O que muda |
|---|---|---|
| `baixa:` | `max-height: 500px` | a janela volta a rolar inteira; a galeria virtual ganha a altura da tela |

Entrou no T-67: com zoom de 400%, o cromo de altura fixa ocupava a tela inteira e a galeria
ficava com 0 px.

## Movimento

Movimento só em resposta a uma ação, para mostrar o que mudou, e só com `transform` e `opacity`:

1. **Abrir um campeão:** o painel nasce na posição e no tamanho do tile tocado e cresce até o
   lugar dele, com escala uniforme.
2. **Confirmar um download:** o botão mostra o sinal de confirmado, e o aviso "Baixado:
   <arquivo>" surge no canto (`surgir`, 160 ms).

Além deles, o pulso do esqueleto (`pulsar`, 1,2 s) e o giro do ícone enquanto um arquivo baixa. Sem
zoom no `hover` e sem entrada em *fade* nas seções. Toda transição de estado usa a mesma curva:

| Token | Valor |
|---|---|
| `curva-saida` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

Com `prefers-reduced-motion`, tudo vira instantâneo, e o estado continua dito por texto e ícone.

## Foco

```css
:focus-visible { outline: 2px solid var(--color-acento); outline-offset: 2px }
```

O anel é o destaque, **afastado 2 px**: sobre uma arte clara o magenta cai para 2,71:1 contra o
branco, e o afastamento o põe sobre o fundo da página (6,04:1). Seleção para o lote tem contorno
no destaque **e** marca de seleção; a cor nunca diz o estado sozinha.
