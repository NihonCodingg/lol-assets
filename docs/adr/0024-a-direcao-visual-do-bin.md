# ADR 0024 — A direção visual: o bin do editor

- **Status:** ✅ aceito (22/09/2026)
- **Data:** 2026-09-22
- **Decidido por:** o dono deu a direção no [Plano de Design](../design/PLANO-DE-DESIGN.md) (§3–§5) e
  mandou executá-lo. Os valores finais são do agente, na Fase 1 do plano.
- **Substitui:** a direção "escuro zinco + um violeta, Inter Tight + JetBrains Mono" (Claude Design
  v2, Onda 7) e a trava de 22 cores do `TOKENS.md`. O [ADR 0017](0017-icones-lucide.md) (ícones
  Lucide) continua valendo.

## Contexto

O site funciona e é rápido, mas a §2 do plano mostrou que ele tem cara de template escuro:
preto tingido (`#09090b`), violeta genérico, mono em todo rótulo pequeno, metadados unidos por
ponto médio, rótulos em caixa-alta espaçada, nenhuma marca. Nenhum desses traços diz nada sobre
quem usa o site: um editor de vídeo, com o Premiere aberto, que precisa do arquivo certo agora.

O plano define o conceito, o **bin do editor**: o vocabulário visual vem da mesa de edição, e não
do jogo (a política da Riot proíbe imitar o cliente). Ele também propõe a paleta base e três fontes
candidatas, e pede à Fase 1 o processo da skill `frontend-design`: um plano de tokens, uma revisão
contra os padrões genéricos e, só depois, código.

## O plano de tokens, primeira passada

| Eixo | Primeira proposta |
|---|---|
| Cor | O grafite do plano (`#1E2023`, `#272A2E`, `#363A3F`, `#E9E7E2`, `#9B9EA3`) e um magenta de marcador `#EA5DA9` como destaque |
| Etiquetas | Oito tons em OKLCH com a mesma luminosidade (L 0,74) e croma contido (0,10) |
| Tipo | Hanken Grotesk, a mais neutra das três candidatas, com 400, 500 e 700 |
| Marca | Um quadrado magenta com o nome ao lado |
| Forma | Raio de 8 px em tudo, sombra suave sob o painel |
| Hover do tile | A borda fica magenta e a arte cresce 2% |
| Barra lateral | O título "Categorias" em cima da lista, e as contagens à direita |

## A revisão contra a §2 e contra a skill

Cada linha abaixo é um ponto da primeira passada que caiu num padrão genérico ou falhou numa
medida. Todos foram corrigidos antes do código.

| Ponto | O problema | O que mudou |
|---|---|---|
| Destaque `#EA5DA9` | Medido: 4,56:1 sobre a superfície, mas **3,96:1** sobre a superfície elevada do painel. Texto em destaque dentro do painel reprovaria no AA | **`#F072B3`** (OKLCH 0,72 0,17 350): 5,33:1 na superfície, 4,63:1 na elevada, 6,04:1 no fundo, e 6,04:1 para o texto escuro do botão primário |
| Hanken Grotesk | No arquivo latino servido pelo Google, os algarismos são tabulares fixos e não há `tnum` nem `pnum`. E ela lê como a grotesca neutra de sempre, o lugar onde o Inter estava | Descartada (ver a comparação abaixo) |
| Quadrado colorido de marca | É o que o site tem hoje, com outra cor. A §2 o chama de "sem identidade" | Símbolo derivado do conceito: um quadro com marcas de corte, desenhado na cor do texto. O destaque fica para interação |
| Raio único de 8 px | O "kit de cartão SaaS" da skill: um raio em tudo, sem hierarquia | Três raios: **2 px** no tile (a arte é quadro, não cartão), **6 px** no controle, **12 px** no painel |
| Sombra sob o painel | A sombra cinza genérica. O plano diz que a profundidade vem de superfície mais clara | Sem sombra. O painel é a superfície elevada `#30343A`, e o véu atrás escurece o resto |
| Zoom de 2% no hover | É o padrão genérico que a §4 proíbe | O hover não se move: aparecem as marcas de corte, a borda fica no destaque e surge o download rápido |
| Título "Categorias" | Rótulo acima de conteúdo que não ajuda a decidir nada, e hoje em caixa-alta espaçada | Sai. A lista de categorias com a bolinha de etiqueta já diz o que é |
| Contagens em mono | O traço da §2 | Algarismos tabulares da própria família, em texto secundário |

## Decisão

### 1. Cor

| Token | Valor | Papel | Contraste medido |
|---|---|---|---|
| `fundo` | `#1E2023` | Fundo da página | — |
| `superficie` | `#272A2E` | Topo, barra lateral, controles | — |
| `superficie-alta` | `#30343A` | Painel, menus, aviso de confirmação, hover | — |
| `linha` | `#363A3F` | Divisões | — |
| `linha-forte` | `#4A4F56` | Borda de controle e de campo | 1,75:1 na superfície (não é o único sinal do controle) |
| `texto` | `#E9E7E2` | Texto principal | 11,66:1 na superfície |
| `texto-suave` | `#9B9EA3` | Contagens, metadados, aviso legal | 5,36:1 na superfície; 4,66:1 na elevada |
| `acento` | `#F072B3` | Foco, seleção, ação primária | 5,33:1 na superfície; 4,63:1 na elevada |
| `acento-forte` | `#F990C4` | Hover da ação primária | 6,74:1 na superfície |
| `xadrez-claro` e `xadrez-escuro` | `#3A3D42` e `#2C2F33` | O fundo de transparência | 1,23:1 entre eles: é textura, não informação |

O texto sobre o destaque é o `fundo` (6,04:1). O anel de foco é o destaque com 2 px de largura e
**afastado 2 px** da borda do elemento: sobre uma arte clara o magenta cai para 2,71:1 contra o
branco, e o afastamento faz o anel ficar sobre o fundo da página (6,04:1), não sobre a imagem.

**Cores de etiqueta**, uma por categoria, todas com OKLCH L 0,74 e croma 0,10. Só a matiz muda.
Nenhuma fica a menos de 40° do destaque (350°):

| Categoria | Matiz | Valor | Na superfície |
|---|---|---|---|
| Campeões | 270° | `#92A8EB` | 6,19:1 |
| Itens | 65° | `#D79E65` | 6,16:1 |
| Runas | 185° | `#55BFB3` | 6,51:1 |
| Feitiços | 230° | `#61B7DE` | 6,41:1 |
| Ícones de perfil | 20° | `#E39191` | 5,99:1 |
| Emotes | 100° | `#B9AC5F` | 6,27:1 |
| Wards | 145° | `#82BC83` | 6,50:1 |
| Mapas | 305° | `#B99BDE` | 6,04:1 |

Elas aparecem só como marcador pequeno (a bolinha da barra lateral, o marcador do grupo na busca),
**sempre** ao lado do nome da categoria. Nenhum estado se diz só com cor: seleção tem marca além do
contorno, erro tem ícone e texto.

### 2. Tipo: Schibsted Grotesk, uma família só

As três candidatas do plano, medidas no arquivo latino que o `next/font` baixa:

| | Schibsted Grotesk | Hanken Grotesk | Familjen Grotesk |
|---|---|---|---|
| Arquivo (woff2, latino, variável) | 46,7 KB (400–900) | 34,7 KB (100–900) | 18,9 KB (400–700) |
| Algarismos tabulares | `tnum` e `pnum` | fixos, sem os dois | fixos, com `pnum` |
| Em 11–13 px, no escuro | firme, abertura boa | firme | as armadilhas de tinta e o desenho estreito ficam manchados no aviso legal de 11 px |
| Caráter | grotesca de redação, de desenho compacto e seco | grotesca neutra, perto do Inter | a mais peculiar das três |

**Escolha: Schibsted Grotesk**, com três pesos: **400** (texto), **600** (nomes e botões) e
**800** (marca e título do painel). Ela foi desenhada para as marcas de jornal da Schibsted, que
precisam de texto pequeno e denso legível: é o trabalho dela aqui, com o nome do campeão na grade
e a coluna de resolução no painel. Tem personalidade sem disputar com o quadro, que é a única
ousadia do conceito. A Familjen é mais barata em bytes e mais marcante, mas a peculiaridade dela
brigaria com o quadro, e ela suja o texto pequeno. A Hanken não tem o que a distinga do padrão que
o plano manda deixar.

- **Algarismos tabulares** (`tabular-nums`) em resolução, peso, contagem e progresso. O resto do
  texto fica com os proporcionais.
- **O mono sai de todos os rótulos**, e sai do site: o nome de arquivo aparece na mesma família.
  O JetBrains Mono deixa de ser baixado.
- **Custo:** hoje a chegada baixa 75 KB de fonte (Inter Tight com 44 KB e JetBrains Mono com 31 KB).
  Depois, 47 KB, num arquivo só.
- **Escala** (a raiz é 14 px): 11, 12, 13, 14, 16, 20 e 26 px. Títulos de 20 px ou mais com −0,01 em.
  Nenhum rótulo em caixa-alta.

### 3. Forma e profundidade

- Raios: **2 px** no tile e na prévia, **6 px** nos controles, **12 px** no painel e nos menus.
  O `full` só em bolinha e marca de seleção.
- Nenhuma sombra de elevação. A ordem de profundidade é fundo, superfície e superfície elevada, e
  o véu do painel escurece o que fica atrás.

### 4. O quadro

- **Glifo de proporção**: um retângulo vazado, desenhado a partir de largura e altura reais do
  arquivo, ao lado de cada variante.
- **Marcas de corte**: quatro cantos de 1,5 px na cor do texto, na prévia do painel e no hover e
  foco do tile.
- **Fundo xadrez**: em todo asset cujo formato tem alfa (PNG e WebP). JPEG não tem alfa e não
  recebe xadrez.
- **Guia de área segura 16:9**: alternância na prévia do painel.

### 5. Movimento

Só dois momentos, os dois em resposta a uma ação e só com `transform` e `opacity`:

- **Abrir um campeão.** O painel nasce na posição e no tamanho do tile tocado e cresce até o
  lugar dele, em 240 ms, com escala uniforme (a arte não se deforma no caminho).
- **Confirmar um download.** O botão mostra o sinal de confirmado por 1,2 s, e o aviso "Baixado:
  <arquivo>" aparece no canto.

Com `prefers-reduced-motion`, os dois viram troca instantânea, e o aviso continua. O pulso do
esqueleto fica, também desligado por essa preferência.

### 6. Layout

- **Computador:** um topo de 56 px na largura toda, com a marca à esquerda, a busca centralizada
  (até 640 px) e a densidade à direita. Abaixo, a barra lateral de 216 px (categorias com a
  bolinha de etiqueta, "Sobre" e o aviso legal inteiro, recuado em 11 px) e o conteúdo, alinhado à
  esquerda. As funções dos campeões são um controle segmentado.
- **Celular:** a busca fixa no topo, as categorias em abas roláveis, e o painel em tela cheia
  com a barra de ação fixa embaixo.

## Consequências

- O `TOKENS.md` é reescrito a partir desta decisão, e o `tokens.test.ts` passa a travar **estes**
  valores: a paridade com o CSS, o contraste AA de cada par de texto, e as oito etiquetas com a
  mesma luminosidade. O teste antigo, com 22 cores e matiz única, sai com o design antigo.
- A regra do CLAUDE.md sobre UX ("não tratar UX como gosto") e a trava do TOKENS.md cedem ao
  plano, por ordem do dono. A regra que fica é a mesma de sempre: mudou token, muda o
  `TOKENS.md` antes.
- Os critérios de "bom" do plano (§1) e o orçamento de desempenho (§7) valem para cada PR do
  redesenho. Se uma decisão desta página estourar um limite, ela é simplificada, e a troca vai
  para o relatório.
- A validação com pessoas (§9) é do dono. A rodada de linha de base não foi feita antes do
  redesenho.
