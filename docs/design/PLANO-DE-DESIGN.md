# Plano de Design — Biblioteca de Assets

> Entregue pelo dono em 22/09/2026. Este documento substitui a direção visual atual e é a fonte
> de verdade do redesenho. O [`TOKENS.md`](TOKENS.md) será reescrito a partir dele. Onde este plano
> conflitar com instruções anteriores sobre estética, este plano vence.
>
> **Estado:** salvo, **ainda não em execução**. A execução começa quando o dono mandar o comando
> das Fases 1 a 11 (§10). A rodada de linha de base com pessoas (§9) é dele e vem antes.

## 1. Para quem é, e o que "bom" significa

Quem usa: editor de vídeo de conteúdo de League of Legends, com Premiere ou After Effects aberto,
no meio de uma edição. Precisa de um asset agora, várias vezes por semana. Não quer ler instrução,
não quer conta, não quer pensar na ferramenta — quer o arquivo certo na pasta.

As tarefas reais (são elas que medem o sucesso do redesenho, na §9):

| # | Tarefa |
|---|---|
| T1 | Baixar o square do Jax em PNG |
| T2 | Baixar a splash da skin "Arcane Jinx" / "Jinx de Arcane" |
| T3 | Baixar, num zip só, as splashes de todas as skins da Ahri |
| T4 | Encontrar e baixar o ícone do item Gume do Infinito |
| T5 | Baixar a runa Eletrocutar com fundo transparente |
| T6 | Copiar o link direto de uma splash para mandar a um cliente |
| T7 | No celular, achar e salvar um emote |
| T8 | Descobrir qual corte da splash serve para uma thumbnail 16:9 |

"Bom" significa, nesta ordem:

1. Acha na primeira tentativa, pelo nome que a pessoa tem na cabeça (português, inglês, apelido,
   com erro de digitação).
2. Sabe exatamente o que vai baixar antes de baixar: forma, tamanho, se tem transparência.
3. O arquivo chega pronto para usar: nome legível, formato certo, transparência preservada.
4. Parece uma ferramenta profissional em que se confia — não um template, não um site de fã
   improvisado.
5. É rápido, em qualquer aparelho.

## 2. Diagnóstico honesto do estado atual

O site funciona e é rápido, mas parece um template escuro genérico. Vários traços dele são
exatamente os padrões que denunciam design gerado sem direção:

- Preto tingido (#0B0B0B/#111) no lugar de uma escolha de cor. Não diz nada sobre o assunto.
- Roxo genérico como destaque. É a cor padrão de "app de IA".
- Mono em rótulos pequenos ("13 skins", "868", "(46)") — deixa com cara de painel de
  desenvolvedor, e mono foi recomendação nossa que se espalhou demais.
- Metadados unidos por ponto médio ("1280×720 · JPEG · 121 KB") — padrão de template.
- Sem identidade: um quadrado roxo e o nome em texto.
- Hierarquia plana: sidebar, filtros, grade e rótulos pesam igual. O olho não sabe onde pousar.
- Busca subdimensionada, encostada à esquerda, com faixa vazia ao lado.
- Tiles inertes: nada indica que são clicáveis nem o que acontece ao clicar.
- Aviso legal espremido e cortado no rodapé da sidebar.

O que funciona e fica: a densidade da grade, a arte como protagonista, a velocidade (CLS 0, LCP
~0,8 s), o teclado completo, a busca tolerante, a virtualização, os 2 cliques.

## 3. Conceito: o bin do editor

A identidade não pode vir do mundo visual do League of Legends — a política da Riot proíbe
imitar o cliente do jogo. Ela vem do mundo de quem usa: a mesa de edição.

No Premiere, o lugar onde o editor guarda o material é o bin. Este site é um bin que já vem
cheio. O vocabulário visual sai daí: proporção de quadro, marcas de corte, fundo xadrez de
transparência, cor de etiqueta por tipo de mídia, resolução como linguagem nativa.

### A única ousadia: o quadro

Todo asset é mostrado na sua proporção real, e a proporção vira informação visual em vez de
texto:

- Um glifo de proporção — um pequeno retângulo desenhado nas proporções exatas do arquivo —
  acompanha cada variante. Splash é um retângulo largo, loading é alto e estreito, square é
  quadrado. O editor entende de relance qual serve para a thumbnail 16:9 (tarefa T8), sem ler
  número.
- Na prévia ampliada, marcas de corte nos cantos e, opcionalmente, a guia de área segura 16:9
  sobreposta.
- Assets com canal alfa aparecem sobre fundo xadrez, como em qualquer software de edição. Quem vê
  xadrez sabe que tem transparência.

Todo o resto é calmo e disciplinado. A ousadia é gasta só aqui.

### Princípios

- A arte é o conteúdo; a interface é a mesa de luz. Cromo neutro, recuado.
- Proporção é informação. Nunca mostrar um asset numa forma que não é a dele sem indicar isso.
- Transparência se vê. Xadrez em todo asset com alfa, sempre.
- Cor é etiqueta, não decoração. Cada categoria tem uma cor de etiqueta fixa, como as label
  colors de um editor de vídeo, usada só em marcadores pequenos e sempre acompanhada de texto ou
  ícone.
- As palavras são do usuário. "Baixar PNG", "Baixar original", "Copiar link", "Baixado". A ação
  mantém o mesmo nome do botão até o aviso de confirmação.
- Uma ousadia só. Antes de publicar cada tela, remova um enfeite.

## 4. Sistema visual (proposta)

O Claude Code refina estes valores seguindo o processo da skill de frontend-design (§10, Fase 1),
mas não pode trocá-los por um dos padrões genéricos listados na §2.

### Cor

Base em grafite de software de edição, não preto. Editores passam o dia em interfaces
cinza-médio-escuras; um grafite com corpo cansa menos a vista e deixa a arte saturada saltar.

| Papel | Valor proposto | Uso |
|---|---|---|
| Fundo | `#1E2023` | Fundo da página |
| Superfície | `#272A2E` | Sidebar, barra de busca, painéis |
| Linha | `#363A3F` | Divisões, bordas de controle |
| Texto | `#E9E7E2` | Texto principal |
| Texto secundário | `#9B9EA3` | Contagens, metadados |
| Destaque | a definir na Fase 1 | Foco, seleção, ação primária |

Regras para o destaque: não pode ser roxo, dourado, azul-petróleo (identidade da Riot),
verde-ácido nem vermelhão (padrões genéricos). Candidato a avaliar: um magenta de marcador, que é
cor de etiqueta clássica de editor de vídeo. Contraste mínimo AA sobre a superfície.

Cores de etiqueta por categoria: oito tons com a mesma luminosidade e saturação contida
(Campeões, Itens, Runas, Feitiços, Ícones de perfil, Emotes, Wards, Mapas). Aparecem só como
marcador pequeno ao lado do nome da categoria e nos resultados de busca agrupados. Nunca carregam
significado sozinhas.

### Tipografia

- Uma família, com personalidade, escolhida de propósito — não Inter, não Geist, não a fonte
  padrão do shadcn. Candidatas a avaliar: Schibsted Grotesk, Hanken Grotesk, Familjen Grotesk.
  Escolha e justifique no ADR.
- Algarismos tabulares da própria família para resoluções, tamanhos e contagens. Mono sai dos
  rótulos. Mono só sobrevive, se sobreviver, no nome de arquivo técnico.
- Escala tipográfica definida com pesos e espaçamentos intencionais. Nomes de campeão com peso
  suficiente para serem lidos de relance na grade densa.
- Sem rótulos em caixa-alta espaçada ("CATEGORIAS", "FUNÇÃO", "PROJETO"). Se um rótulo não ajuda
  a decidir nada, ele sai.
- Auto-hospedada via next/font, subset latino, no máximo três pesos.

### Forma

- Hierarquia de raio, não um raio único em tudo: tiles com raio pequeno (a arte é quadro, não
  cartão), controles com raio médio, painel com raio maior.
- Sem sombra cinza genérica sob cada elemento. Profundidade vem de superfície mais clara, não de
  sombra.

### Movimento

Movimento só em resposta a uma ação e para mostrar o que mudou:

- O momento orquestrado: abrir um campeão — a arte cresce do tile para o painel. É a única
  animação elaborada do site.
- Confirmação de download: o botão vira um sinal de confirmado por um instante.
- Sem zoom em hover em todos os tiles e sem entradas em fade nas seções — são o padrão genérico.
  O hover se comunica sem movimento (ver §6).
- Só transform e opacity. `prefers-reduced-motion` desliga tudo que não for essencial.

## 5. Layout

### Desktop — home

```
┌──────────────────────────────────────────────────────────────────────┐
│ [marca]         [ Buscar campeão, skin, item ou runa          / ]  ⊞ │
├─────────────┬────────────────────────────────────────────────────────┤
│ ● Campeões  │  Todas │ Assassino │ Atirador │ Lutador │ Mago │ …     │
│ ● Itens     │ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐      │
│ ● Runas     │ │    ││    ││    ││    ││    ││    ││    ││    │      │
│ ● Feitiços  │ └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘      │
│ ● Ícones    │ Aatrox Ahri   Akali  Akshan Alistar …                  │
│ ● Emotes    │ 13     22     22     5      17                          │
│ ● Wards     │                                                        │
│ ● Mapas     │                                                        │
│             │                                                        │
│ Sobre       │                                                        │
│ aviso legal │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

Busca centralizada no topo, com presença. Filtro de função como controle segmentado. O ● é a
cor de etiqueta da categoria.

### Desktop — painel do campeão

```
┌────────────────────────────────────────────────────────────────────┐
│ Ahri                                                      Esc  ✕   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │⌐                                                              ¬│ │
│ │              splash da skin selecionada, 16:9                  │ │
│ │L                                                              ┘│ │
│ └────────────────────────────────────────────────────────────────┘ │
│ [Clássica] [Arcana] [K/DA] [Popstar] [Guardiã Estelar] …   →       │
│                                                                    │
│ ▭  Splash centralizada   1280×720   JPEG   121 KB  [Baixar PNG] [Original] [⧉] │
│ ▭  Splash larga          1215×717   JPEG   167 KB  [Baixar PNG] [Original] [⧉] │
│ ▯  Tela de carregamento   308×560   JPEG    48 KB  [Baixar PNG] [Original] [⧉] │
│ ▢  Square                 120×120   PNG     27 KB  [Baixar PNG]            [⧉] │
│                                              [☐ Selecionar para o lote]    │
└────────────────────────────────────────────────────────────────────┘
```

▭ ▯ ▢ são os glifos de proporção. As marcas de corte estão nos cantos da prévia. Metadados em
colunas alinhadas com algarismos tabulares, sem ponto médio.

### Celular

```
┌──────────────────────┐
│ [ Buscar…         ]  │  ← fixo no topo
│ Campeões Itens Runas…│  ← abas roláveis
│ ┌────┐┌────┐┌────┐   │
│ │    ││    ││    │   │
│ └────┘└────┘└────┘   │
│ Aatrox Ahri  Akali   │
└──────────────────────┘
   toque no campeão ↓
┌──────────────────────┐
│ ✕  Ahri              │  ← painel em tela cheia
│ ┌──────────────────┐ │
│ │   splash 16:9    │ │
│ └──────────────────┘ │
│ [Clássica][Arcana] → │
│ ▭ Splash  1280×720   │
│ ▯ Loading  308×560   │
├──────────────────────┤
│ [ Baixar PNG ]  [⧉]  │  ← barra de ação fixa embaixo
└──────────────────────┘
```

## 6. Especificação por tela e componente

### Marca

Wordmark próprio para "Biblioteca de Assets", com um símbolo derivado do conceito (um quadro com
marcas de corte, por exemplo). Funciona em 16 px (favicon) e no topo. Não usa nenhum elemento
visual da Riot.

### Busca

- Campo grande, centralizado no topo, com foco automático e atalho `/`. Texto de apoio: "Buscar
  campeão, skin, item ou runa".
- Resultados agrupados por tipo (Campeões, Skins, Itens, Runas…), cada grupo com sua cor de
  etiqueta e no máximo alguns itens, com "ver todos" quando houver mais.
- Miniatura de cada resultado na proporção real.
- Navegação por setas e Enter; o resultado ativo tem prévia maior ao lado.
- Sem resultado: "Nada encontrado para 'xyz'." seguido das sugestões por proximidade que já
  existem (T-69), e da dica de buscar pelo nome em inglês.

### Tile da grade

- Arte na proporção do tipo, nome embaixo com peso de leitura, contagem de skins como texto
  secundário discreto (não mono, não badge chamativo).
- Hover sem movimento: marcas de corte aparecem nos cantos, a borda assume a cor de destaque e
  surge um botão de download rápido (baixa o square direto — a tarefa T1 cai para um clique).
- Estado selecionado para lote: marca de seleção e contorno na cor de destaque.

### Painel do campeão

- Prévia grande da skin selecionada no topo, com marcas de corte e alternância para mostrar a
  guia de área segura 16:9.
- Faixa de skins rolável horizontalmente, com setas do teclado; a skin ativa é inequívoca.
- Lista de variantes com glifo de proporção, nome em linguagem do usuário, dimensões, formato e
  tamanho em colunas alinhadas, e as ações. "Baixar PNG" é a ação primária visual; "Baixar
  original" e "Copiar link" são secundárias.
- Seleção para o lote dentro do painel.

### Categorias — tratamento próprio de cada uma

- Itens: grade de ícones; o filtro "compráveis / todos" diz em texto quantos itens estão ocultos
  e por quê.
- Runas: agrupadas por árvore, sempre sobre fundo xadrez (têm alfa).
- Feitiços: poucos itens — tiles maiores.
- Ícones de perfil e Emotes: milhares de itens; grade densa virtualizada, com campo de filtro
  próprio no topo da categoria.
- Wards: arte e sombra mostradas como um único card com alternância, não dois tiles com o mesmo
  nome.
- Mapas: tiles largos, na proporção real.

### Estados

- Carregando: esqueleto com a proporção exata do que vai aparecer, para não haver salto.
- Vazio: convite a agir, não humor. "Nenhum item nesta categoria com esse filtro. Limpar filtro."
- Erro: o que aconteceu e como resolver, na voz da interface, com botão "Tentar de novo". O
  detalhe técnico fica disponível, mas depois da explicação.
- Sem conexão: avisa e mantém o que já foi carregado utilizável.

### Feedback de ação

- Aviso de confirmação (toast) discreto no canto: "Baixado: Ahri_Arcana_splash.png" — com o nome
  real do arquivo, para o editor saber o que procurar na pasta.
- "Link copiado" ao copiar.
- O botão de download mostra o estado de confirmado por um instante.

### Lote

- Barra inferior aparece quando há ao menos um item selecionado: quantidade, tamanho total
  estimado, "Baixar zip" e "Limpar seleção".
- Durante a montagem: progresso com "Cancelar", foco preservado (T-68).

### Aviso legal

Texto completo, legível, sem corte, em área própria no rodapé da sidebar ou num rodapé da
página — sempre visível sem clique, como a política exige, mas tipograficamente recuado para não
competir com a arte.

### Mudanças de comportamento autorizadas por este plano

Estas mudam levemente o que o produto faz e ficam explicitamente liberadas:

- Download rápido do square direto do tile (um clique).
- Avisos de confirmação de download e de cópia.
- Arrastar a imagem do tile ou da prévia direto para a área de trabalho ou para o editor de
  vídeo, entregando o arquivo em resolução total (verificar comportamento no Chrome, Edge e
  Firefox; se algum não entregar o arquivo certo, registrar e não prometer).
- Guia de área segura 16:9 na prévia.

Qualquer outra funcionalidade nova continua indo para "Ideias não executadas".

## 7. Orçamento de desempenho (não negociável)

Medido em produção, antes e depois, com os mesmos scripts das rodadas anteriores:

| Métrica | Hoje | Limite após o redesenho |
|---|---|---|
| CLS | 0 | 0 |
| LCP (desktop) | ~0,8 s | ≤ 1,0 s |
| Primeiro tile | ~420 ms | ≤ 450 ms |
| INP (celular, CPU 4×) | 120–224 ms | ≤ 200 ms |
| JS inicial | 174 KB | ≤ 190 KB |
| Fontes | — | 1 família, ≤ 3 pesos, woff2 com subset |

Se uma decisão visual estourar um limite, ela é simplificada ou sai. Registrar a troca no
relatório.

## 8. Acessibilidade

- WCAG 2.2 AA, com contraste verificado na paleta nova (texto, texto secundário, destaque sobre
  superfície, cores de etiqueta).
- Foco visível na cor de destaque, com espessura suficiente sobre as imagens.
- Cor nunca carrega significado sozinha: etiquetas de categoria sempre com texto; seleção sempre
  com marca além do contorno.
- Todos os testes axe e e2e continuam verdes, e os testes de foco das rodadas 4 a 9 não podem
  regredir.

## 9. Validação com pessoas reais

Métricas automáticas dizem se o site é rápido e acessível. Só gente usando diz se é bom. Este é
o critério de sucesso real do redesenho.

Como fazer: 3 a 5 amigos editores, cada um por videochamada compartilhando a tela. Você lê uma
tarefa da §1 por vez e fica calado — não ajuda, não explica. Anota:

- conseguiu ou não;
- quanto tempo levou;
- onde hesitou, clicou errado ou perguntou algo.

No fim, uma pergunta: "De 1 a 5, você usaria isso no seu dia a dia de edição?"

Quando: uma rodada agora, no site atual (é a linha de base), e outra depois do redesenho. Sem a
primeira, não dá para provar que a segunda melhorou.

Metas depois do redesenho:

- ≥ 90% das tarefas concluídas sem ajuda;
- mediana ≤ 20 s por tarefa;
- nota média ≥ 4.

Registrar em `docs/design/testes/AAAA-MM-DD.md`. Cada hesitação observada vira item de correção.

## 10. Execução — fases para o Claude Code

Cada fase é um ou mais PRs de até ~500 linhas de lógica, com CI verde antes do merge e
verificação no site publicado.

1. **Direção.** Seguir o processo da skill de frontend-design: montar o plano de tokens (cor,
   tipo, layout, princípios) a partir desta §4, revisá-lo contra os padrões genéricos da §2 e
   corrigir o que soar como padrão, e só então codificar. Registrar a direção final em ADR.
2. **Fundação.** Novo TOKENS.md, fonte, marca e favicon, e os primitivos: botão, controle
   segmentado, etiqueta de categoria, tile, glifo de proporção, fundo xadrez, marcas de corte,
   aviso de confirmação.
3. **Casca.** Topo com busca central, sidebar, aviso legal, layout responsivo.
4. **Grade de campeões e tiles**, com hover sem movimento e download rápido.
5. **Busca** com resultados agrupados e prévia.
6. **Painel do campeão**, com o momento orquestrado de abertura.
7. **Categorias**, cada uma com o tratamento da §6.
8. **Estados e feedback:** carregando, vazio, erro, sem conexão, avisos de confirmação.
9. **Lote.**
10. **Celular completo.**
11. **Polimento e autocrítica.** Tirar capturas de cada tela, revisá-las contra este plano e a
    §2, remover um enfeite de cada tela, conferir o orçamento de desempenho e a acessibilidade.
    Salvar capturas de antes e depois em `docs/design/redesenho/`.

## 11. Definição de pronto

- Todas as telas redesenhadas, com capturas de antes e depois.
- Orçamento da §7 cumprido, medido em produção.
- axe e e2e verdes; nenhum teste de foco ou acessibilidade afrouxado.
- Nenhum dos padrões genéricos da §2 sobrevivendo sem justificativa escrita.
- Teste com pessoas reais da §9 feito, com as metas batidas ou com os pontos de falha virando
  correção.

## 12. O que fica com o dono do projeto

- Direção visual: a proposta desta §4 vale por padrão. Se discordar da cor, da fonte ou do
  conceito, diga antes de começar — ou depois das capturas da Fase 11.
- Testes com pessoas: rodar a linha de base agora e a segunda rodada depois. É a única parte que
  nenhuma sessão automática consegue fazer.
