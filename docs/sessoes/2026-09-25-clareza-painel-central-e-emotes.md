# Sessão 25/09/2026 — clareza, o painel no centro e os emotes por emoção

## O pedido

O dono mandou prints do painel da Ahri e da galeria de emotes, com cinco pedidos:

- "As pessoas precisam ver com clareza todas as coisas". Havia também um defeito na direita da lista de arquivos: o botão cobria o peso.
- "Quando eu clico em algum campeão demora um pouco pra carregar todas as imagens."
- O painel do campeão no **centro** da tela, e não na direita.
- Os emotes "em categorias que façam sentido, por exemplo emojis representando emoções", nos grupos felizes e engraçados, fofos e amor, bravos e provocação, tristes e surpresos, com a opção de ver os mais recentes e os mais antigos.
- "O projeto ainda está meio feio… use as skills para melhorar o design." Perguntado, escolheu **manter o conceito do [ADR 0024](../adr/0024-a-direcao-visual-do-bin.md) e refazer a execução bem**. No meio do trabalho, lembrou: "o site precisa ficar bonito no final de tudo e com uma boa experiência para o usuário final".

Foram três PRs, cada um com os três checks da CI verdes antes do merge e conferido no ar.

| Ticket | PR | Entrega |
|---|---|---|
| T-89 | #120 | Texto mais claro e maior, o painel no centro em duas colunas, a linha de arquivo sem o defeito, "Baixar PNG" tonal, a splash pedida na intenção |
| T-90 | #121 | Os 2.369 emotes por emoção, revistos à mão, e a ordem "Mais recentes / Mais antigos" |
| T-91 | #122 | O acabamento, revisto pela skill de design e por uma revisão independente |

Capturas finais em [`docs/design/pedido-25-09/`](../design/pedido-25-09/). O sistema de design ficou registrado em [`apps/web/DESIGN.md`](../../apps/web/DESIGN.md), derivado do que está no ar.

## Clareza (T-89, T-91)

- O `texto-suave` passou de `#9B9EA3` para `#B3B6BB`: 7,09:1 na superfície, antes 5,36. Agora ele passa também sobre o `campo`. O teste de tokens trava pelo menos 6:1 em todo fundo de texto.
- A escala de texto do site subiu um degrau (12 → 13, 13 → 14), e o xadrez ficou mais discreto.
- **O defeito da direita.** A coluna de ações tinha largura fixa, e o "Baixar PNG" cobria o peso quando o painel estreitava. A linha ficou flexível. No T-91, o lugar do "Original" passou a ficar guardado nos arquivos que já são PNG, e o "Baixar PNG" parou de pular de lugar entre as linhas.
- **Nomes inteiros.** Nas galerias de item, runa, ward e emote, e no seletor de skins, o nome vai até duas linhas. Saíram "Amuleto da F…" e as duas skins "K/DA de Pr…".
- **Números.** O ponto do milhar em toda parte, o "N de N" só com filtro, e "266 wards, 532 arquivos". Os ícones de perfil agora vêm em ordem numérica; antes era 0, 1, 10, 1000.
- **O magenta só nas ações e no foco.** O chip marcado passou a grafite elevado, como o controle segmentado.

## O painel no centro (T-89)

- Uma folha de até 1320 × 900 px no centro da tela, com raio de 12 px, em duas colunas.
  - À esquerda, a prévia 16:9 e **todas** as skins em fileiras, sem rolagem lateral.
  - À direita, os arquivos.
- O véu em volta fecha o painel.
- A abertura que cresce do tile continua. No telefone, continua em tela cheia.

## As imagens mais cedo (T-89)

A splash que o painel abre agora é pedida no sinal de intenção, quando o ponteiro para no cartão, junto com a fatia do campeão. Na abertura, a prévia tem prioridade alta, e as miniaturas de skin e de arquivo têm prioridade baixa. Medido no ar (`peso-do-painel.mjs`, Ahri, mediana de 3):

| | Antes | Depois, clique direto | Depois, ponteiro 400 ms no cartão |
|---|---|---|---|
| Splash na tela, 4G | 577–588 ms | 527–564 ms | **115–125 ms** |
| Splash na tela, sem limite | 174–177 ms | 414–668 ms¹ | **125–132 ms** |
| Tudo na tela, 4G | 1.261–1.436 ms | 1.477–1.846 ms | 1.327–1.358 ms |

¹ Com o cache da CDN frio logo depois do deploy.

O "tudo na tela" em 4G é banda: as 21 miniaturas de skin somam 964 KB, e a fonte não tem tamanho menor. Redimensionar as imagens tem custo, que o dono recusou (ADR 0012).

## Os emotes por emoção (T-90)

A Riot não publica emoção. Os 2.369 emotes do 16.19.1 foram vistos em 38 folhas de contato de 64 cada, com o nome e o arquivo ao lado, e cada um foi posto num grupo:

| Grupo | Emotes |
|---|---|
| Felizes e engraçados | 590 |
| Fofos e amor | 209 |
| Bravos e provocação | 358 |
| Tristes e surpresos | 207 |
| **Símbolos, times e eventos** | 1.005 |

O quinto grupo não estava no pedido. Ele existe porque logos de time, brasões de ranque e emblemas de evento não têm emoção: sem ele, as quatro listas ficariam cheias de logo.

- **Onde mora.** A revisão fica em `lib/emotes-classificacao.ts`: para mudar um emote de grupo, basta mover o número de uma lista para outra. Um emote de patch novo ganha palpite pelo nome e pelo arquivo até ser revisto.
- **Na tela.** A emoção é um controle de uma escolha só, acima da galeria. A ordem abre nos mais recentes.
- **A data.** O `refId` serve de data, mas desde 2025 a Riot numera uma segunda série de ids em paralelo, a partir de 10.001. A conversão entre as duas foi calibrada pelos patches escritos nos nomes de arquivo.
- **Peso.** A tabela vive no pedaço das categorias: a home não paga nada por ela.

## O orçamento da §7, no ar depois dos três PRs

`orcamento.mjs`, mediana de 5, e `inp-painel.mjs`, telefone com CPU 4×, mediana de 5:

| Métrica | Limite | 23/09 | 25/09 |
|---|---|---|---|
| Primeiro tile | ≤ 450 ms | 397 ms | 394 ms |
| LCP | ≤ 1,0 s | 212 ms | 196 ms |
| CLS, computador e telefone | 0 | 0 | 0 |
| INP de tocar num campeão, frio / quente | ≤ 200 ms | 64 / 88 ms | 56 / 64 ms |
| JS da chegada | ≤ 190 KB | 173 KB | 173 KB |
| Famílias de fonte | 1 | 1 | 1 |

Uma primeira medição, logo depois do deploy do #122, deu 557 ms de primeiro tile, com a CDN fria. Cinco voltas depois, deu 394.

## A skill de design

A skill `impeccable` foi usada em modo Operate, como refinamento do mundo do ADR 0024, e não como troca de mundo.

- **Registro do produto.** O `PRODUCT.md` foi escrito com o que o dono confirmou.
- **Detector.** Rodou sobre os arquivos mudados e não achou nada.
- **Revisão independente.** Aprovou o painel central, os emotes, a ordem dos ícones e os nomes em duas linhas. Pediu oito correções, e cinco entraram no #122.
- **Fica para depois,** com o motivo:
  - A página Sobre só mostra "Campeões" na barra lateral e não tem a busca. As categorias vêm do manifesto que a home carrega, e resolver isso é navegação nova.
  - No telefone, a densidade divide a linha com as funções. A linha rola de lado e continua alcançável.
  - "Voltar aos campeões" continua no computador. Os e2e e o fluxo de teclado dependem dele.
- **Documentação.** O documentador registrou o `DESIGN.md` e apontou duas notas velhas, corrigidas: o `texto-20` no `TOKENS.md` e o "violeta" no `campo.tsx`.

## Testes que mudaram, e por quê

Todos estão explicados nos PRs:

- **O Tab no painel.** O teste clicava no canto da página para zerar o foco, e agora esse clique fecha o painel.
- **A vitrine.** Ela fica ao lado dos arquivos, não em cima deles.
- **Arte no tile do item.** O limite foi de 25% para 22%, porque o nome ganhou a segunda linha. Continua o dobro do "selo" de 13% que o T-53 corrigiu.
- **O nome da skin.** Agora cabe em até duas linhas.
- **As contagens.** Estão no formato novo.

## O que depende do dono

- A validação com pessoas (§9 do Plano de Design) continua com ele.
- Se algum emote estiver no grupo errado, basta dizer qual: a troca é mover um número de lista.
