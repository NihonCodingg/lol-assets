# Sessão 14/09/2026 — Onda 7, o front incrível

O pedido: o front "incrível, lindo, intuitivo e fácil de usar".

## As decisões do dono

| | |
|---|---|
| Direção | Evoluir o visual atual — escuro zinco, um violeta, Inter Tight e JetBrains Mono |
| Frentes | Primeira impressão, achar o que quer, ver e baixar, celular |
| Público principal | O editor com pressa, no PC |
| Entrega | Cada etapa num PR com preview da Vercel; **só vai ao ar depois do ok dele**, no mesmo link |
| Avisos da Riot no celular | No fim da página; no computador continuam no pé da barra lateral |

Com o mesmo link, os amigos que já usam o site não recebem endereço novo: o merge no `main`
publica sozinho em `biblioteca-de-assets.vercel.app`.

## O plano

Seis tickets, do T-45 ao T-50, na [TICKETS.md](../TICKETS.md#onda-7--o-front-incrível), na
ordem do maior ganho visível. Tese: **a arte na frente, a ferramenta à mão.** As 22 cores do
tema bastam — o teste de tokens trava 22 e proíbe cor saturada fora do violeta —, então estado
se diz com ícone e texto, não com vermelho e verde.

## T-45 — fundação

O vocabulário que as telas novas vão falar, já aplicado no cartão de arte.

- `lucide-react` ([ADR 0017](../adr/0017-icones-lucide.md)) e Radix Tooltip, pelo ADR 0011.
- Primitivos: `Dica`, `BotaoIcone`, `ParDeDownload`, `Esqueleto`, `Imagem`.
- Tokens `texto-16`, `texto-22`, `controle-xl`, `curva-saida`, e `prefers-reduced-motion`.
- O cartão de arte: download com ícone, "Copiar URL" com confirmação, e prévia que diz "a fonte
  não respondeu" quando a fonte cai (RNF-07), em vez do texto alternativo estourando a caixa.

### Achados

- **O `TOKENS.md` prometia um teste que não existia** — o que impede `texto-fraco` e
  `texto-tenue` de virarem cor de texto. Agora existe, em `tokens.test.ts`.
- **O aviso flutuante do plano não funcionaria.** "Link copiado" num *toast* ficaria fora do
  painel do campeão, que é um diálogo, e o Radix esconde do leitor de tela tudo o que está fora
  do diálogo aberto. A confirmação foi para o botão: o ícone vira ✓, a dica abre, e uma região
  `role="status"` dentro do cartão anuncia.
- **O Radix fecha a dica no clique** — certo para a dica que nomeia, errado para a que responde.
  A `Dica` ganhou `aberta`.
- **Imagem em cache não avisa.** O `load` (ou o `error`) de uma imagem que já estava em cache
  pode passar antes de o React ouvir. A `Imagem` confere `complete` e `naturalWidth` ao montar;
  como o índice só tem PNG e JPEG, `complete` sem pixels é imagem quebrada.
- **O e2e falhava pelo calendário.** A fixture diz ter sido gerada em 09/09, e o aviso de índice
  velho acende depois de 72 horas: desde 12/09, todo e2e via o aviso. Caíram o teste do T-31 e o
  da categoria em 375×720, onde a lista ficou sem nenhuma linha. O relógio da página agora para
  no dia da fixture ([#54](https://github.com/NihonCodingg/lol-assets/pull/54), em PR próprio,
  antes deste), e o defeito de layout que o teste achou virou critério do T-49.

### Conferido

| | |
|---|---|
| Testes de unidade | **374 de 374** — 17 novos, nenhum existente alterado |
| `tsc` e `eslint` | limpos |
| e2e | **36 de 36**, já com o relógio do #54 |
| Build de produção | limpo |
| Prints | antes (site no ar) e depois (build local), 1440×900 |

## T-46 — a home

A primeira impressão: a busca na frente e a arte nítida. Empilhado sobre o T-45, que ainda
espera o ok.

- **Busca:** campo de 44 px com ícone e `/`, e os resultados flutuando sobre a grade, cada um com
  a arte e o que ele é — "Campeão · 18 skins", "Skin · Jax". Escolher fecha a lista e limpa o
  campo; `Escape` fecha e o segundo apaga; clicar fora fecha. O rodapé da lista conta os
  resultados e mostra as teclas.
- **Grade:** o *tile* 380×380 da skin base no lugar do `square` de 128 px esticado. Uma barra só,
  com as funções, a contagem e a densidade, presa no topo a partir de `md`. Esqueleto com a forma
  da home no carregamento.
- **Densidade — fecha o T-40:** densa ou confortável, guardada no `localStorage`; sem ele, densa.
- **Barra lateral:** ícone e contagem em cada categoria; "Início" saiu, e a marca virou o link
  para a home; os avisos da Riot passaram da fonte mono para a da interface, inteiros e literais.

### Achados

- **A contagem não pode entrar no botão.** Dentro dele, "Itens 868" viraria o nome acessível —
  e quem usa leitor de tela, como os testes, procura "Itens". Ela fica ao lado, só para o olho.
- **O cmdk declara o campo sempre como `aria-expanded`.** A lista flutuante fica montada e só
  escondida quando fechada, para o `aria-controls` não apontar para o nada.
- **O anel de foco dobrava no campo de busca.** Borda violeta mais anel de 2 px, e o campo abre
  focado: era a primeira coisa que se via. `data-anel="fino"` cola um anel de 1 px na borda.
- **Tirar "Início" tirou o caminho de volta da página Sobre.** A marca virou o link. E os botões
  de categoria, que aparecem na Sobre depois de passar pela home, marcam a categoria sem sair de
  lá — existe desde o T-41, e foi para o T-50.
- **O vitest não conta colunas.** O jsdom não faz layout: as colunas da densidade são contadas
  no e2e `densidade.spec.ts`, que também recarrega a página.

### Conferido

| | |
|---|---|
| Testes de unidade | **390 de 390** — 16 novos, nenhum existente alterado |
| `tsc` e `eslint` | limpos |
| e2e | **37 de 37**, com o novo `densidade.spec.ts` |
| Build de produção | limpo; a home com 165 kB no primeiro carregamento (era 163) |
| Detector do skill de design | nenhum achado |
| Prints | antes (site no ar) e depois (build local), 1440×900 e 390×844 |

## T-47 — a vitrine do painel do campeão

O painel abre na arte. Dividido em dois, como o plano previa: este é a vitrine; as artes em
grade, a ampliação e o feedback de download vão para o T-47b.

- **Vitrine:** a splash centralizada da skin no topo, em 16:9, com o nome da skin em destaque e
  o campeão embaixo. Antes de a fatia chegar, o *tile* desfocado segura o lugar.
- **Seletor de skin:** uma faixa de *tiles* de 72 px — rádios de verdade, escondidos: as setas
  trocam de skin, e o Tab entra no grupo numa parada só.
- **Um fechar só**, o `×` do canto, parado enquanto o painel rola. O painel foi a
  `min(880px, 92vw)`.

### Achados

- **Rádio não tem nome próprio.** O teste de Tab identificava cada parada por `aria-label` ou
  texto, e o rádio não tem nenhum dos dois — o nome vem do rótulo. A marca passou a levar o
  `type`.
- **`alt` vazio é decisão, não esquecimento.** O teste de "nenhuma imagem sem alt" reprovava as
  miniaturas decorativas. A regra ficou mais precisa: `alt` vazio só vale com `aria-hidden`, e a
  `Imagem` põe o `aria-hidden` sozinha quando o `alt` é vazio. A splash, que é conteúdo, ganhou
  alt de verdade.
- **A dica do fechar abria sozinha.** O diálogo põe o foco no primeiro botão ao abrir, e o
  primeiro botão é o fechar — cuja dica, que abre no foco, cobria a arte toda vez. Agora o foco
  vai para o próprio painel, e o primeiro Tab chega no fechar.
- **O índice e o CommunityDragon discordam.** A conferência do site no ar depois do T-46 falhou
  num download do cdragon: os 8 emotes conferidos baixam com tamanho e sha256 diferentes do
  índice, e os valores do índice são os mesmos desde 11/09. Não é da interface; virou tarefa
  separada, com a evidência.

### Conferido

| | |
|---|---|
| Testes de unidade | **404 de 404** — 7 novos; os do seletor migrados de `<select>` para rádio |
| `tsc` e `eslint` | limpos |
| e2e | **39 de 39**, com o novo `painel.spec.ts` |
| Build de produção | limpo; a home com 166 kB no primeiro carregamento |
| Prints | antes (site no ar) e depois (build local), 1440×900 e 390×844 |

## T-47b — as artes em grade

A segunda metade do T-47, empilhada sobre ele.

- **Grade por família:** splash e tela de carregamento, retratos, passiva e habilidades — cada
  arte com a prévia na proporção real, e nunca maior que o arquivo: o ícone de 64 px continua
  com 64 px, nítido.
- **Ampliação:** a prévia é um botão; a arte abre no tamanho que a tela aguenta. O `Escape`
  fecha na ordem ampliação → chromas → painel, e é o painel que manda na tecla.
- **Retorno do download:** o ícone do botão gira enquanto baixa e vira ✓ por dois segundos; o
  leitor de tela ouve "Arquivo baixado".
- **Bandeja:** as cinco primeiras miniaturas do que foi selecionado, e quantas faltam.

### Achados

- **Por tipo, eram sete cabeçalhos para dez cartões.** A família junta o que se procura junto,
  e uma família sozinha não ganha cabeçalho.
- **Trocar o texto do botão mudaria o nome dele.** "Baixando…" no lugar de "Baixar original"
  faria quem procura o botão — gente e teste — não achá-lo no meio do download. O retorno ficou
  no ícone e no anúncio.
- **A ampliação não tem `Escape` próprio.** Dois donos para a tecla fechariam a ampliação e o
  painel de uma vez; o painel, que já ordenava os chromas antes dele, ordena a ampliação também.

### Conferido

| | |
|---|---|
| Testes de unidade | **417 de 417** — 13 novos, nenhum existente alterado |
| `tsc` e `eslint` | limpos |
| e2e | **40 de 40**, com o da ampliação |
| Build de produção | limpo; a home com 168 kB no primeiro carregamento |

## T-48 — as categorias em galeria

- **Galeria:** a lista de linhas vira *tiles* com a imagem na frente, o nome e a ficha embaixo,
  sempre à vista. As ações — original, PNG, copiar e a caixa do lote — aparecem por cima da
  prévia no *hover* e no foco, e ficam sempre à vista no toque. A prévia amplia, como no painel.
- **Filtros numa barra só:** voltar, o filtro por texto com ícone e os grupos pequenos. As 32
  classes de item ficam atrás de "Mais filtros", em pt-BR, e o botão conta as que estão marcadas
  lá dentro.
- **Um fechar só:** o "fechar" do painel de assets saiu de vez; quem fecha é quem o contém.
- **O "Emote 0" saiu:** era `emote_fpo_inventory.png`, um quadrado de marcação.

### Achados

- **O Radix Tooltip pesava na rolagem.** Com seis *tiles* por linha, cada linha que entra monta
  seis dicas. A medida A/B no build de produção: 21,7 ms por quadro com a galeria como estava,
  19,0 ms com os *tiles* memorizados, 16,6 ms sem a dica. A dica do copiar, na galeria, virou CSS
  (`dicaLeve`), com o mesmo desenho; no painel do campeão continua a do Radix.
- **O `twMerge` não conhecia as medidas com nome.** `cn("h-controle-lg", "h-controle-md")`
  mantinha as duas classes, e quem vencia era a ordem do CSS — o mesmo tipo de defeito do T-28,
  com o sinal trocado. As `--spacing-*` entraram na configuração, com teste.
- **O teste de "cartões não se sobrepõem" só servia para uma coluna:** comparava cada cartão com
  o anterior, e numa galeria o vizinho da mesma linha começa na mesma altura. Virou comparação
  de retângulo com retângulo, e ganhou a conferência de que há mais de uma coluna.
- **Duas etiquetas da Riot para a mesma coisa:** `SpellBlock` (99 itens) e `MagicResist` (33, 23
  com as duas). Em pt-BR as duas seriam "Resistência mágica"; viraram uma opção.

### Conferido

| | |
|---|---|
| Testes de unidade | **451 de 451** — 34 novos; 4 mudados de propósito (o rótulo cru da classe e o `boots` que virou "Botas", o "fechar" do painel, a dica do copiar na galeria) |
| `tsc` e `eslint` | limpos |
| e2e | **40 de 40**; os dois de sobreposição agora comparam retângulos, e o axe da categoria roda com "Mais filtros" aberto e um *tile* em *hover* |
| Rolagem (critério 1) | 16,7 ms por quadro nos 5.042 ícones de perfil, 17,5 ms nos emotes; no máximo 66 *tiles* no DOM |
| Build de produção | limpo; a home com 170 kB no primeiro carregamento |

## T-49 — o celular

- **Faixa do topo em duas linhas:** a marca, e uma linha que rola de lado com as categorias e
  as seções. Eram 274 px de 844 antes da busca; agora são 92.
- **Avisos da Riot no fim da página**, no telefone: depois da grade, da galeria, do vazio. No
  computador continuam no pé da barra lateral. A 404 ganhou página própria para tê-los.
- **Funções da home e filtros da categoria** numa linha que rola de lado, em vez de três linhas
  quebradas; o filtro por texto divide a linha com "Voltar aos campeões".
- **Painel do campeão em tela cheia**, com botões de 44 px em tela de toque, e a bandeja do lote
  com os botões numa linha própria.
- O aviso de índice velho ficou mais baixo, e a busca tem 44 px em toda largura.

### Achados

- **O telefone mostrava o site reduzido, e a fixture não deixava ver.** Com o índice real, a
  linha de categorias passa de 390 px. A coluna implícita do grid do `body` crescia até ela, e a
  página inteira ficava com 668 px de largura. Corrigida a coluna, sobrou 537: a caixa escondida
  (`sr-only`) de cada chip de função é `position: absolute`, e sem ancestral posicionado escapava
  da linha que rola. O e2e agora alarga as duas linhas antes de medir.
- **A raiz tem 14 px**, então `min-h-11` dá 38,5 px, e não 44. O alvo de toque usa o token
  `controle-xl`, que é px.
- **`next dev` apaga o build de produção** na mesma pasta `.next`: rodar o e2e entre um build e o
  `next start` dos prints obriga a construir de novo.

### Conferido

| | |
|---|---|
| Testes de unidade | **456 de 456** — 5 novos |
| `tsc` e `eslint` | limpos |
| e2e | **46 de 46** — 6 novos em `e2e/celular.spec.ts`; 1 mudado de propósito (os avisos em tela estreita: agora são duas cópias, e vale a visível) |
| Faixa do topo em 390×844 | **92 px** (eram 274) |
| Computador | sem mudança visível na home |

## T-50 — o acabamento

- **Vazio, erro e 404 falam igual** (`Estado`): ícone, título em português, o que fazer, o
  detalhe técnico pequeno e a ação. O erro de carga da categoria e o do painel do campeão ganharam
  "Tentar de novo"; o do catálogo, "Recarregar".
- **O vazio da categoria** diz o que tente, mostra o que estava filtrado e tem "Limpar filtros".
- **O aviso de índice velho** ganhou ícone e a frase principal em destaque.
- **Microcopy:** maiúscula só no início da frase, erro começando com "Não deu para…", "Copiar
  link" no lugar de "Copiar URL", e o rodapé com "Patch" e "2.121 skins".
- **Sobre:** uma seção "Como usar" — apelidos na busca, original contra PNG, o zip das categorias.
- **Na Sobre, as categorias levam para a home** já abertas; antes marcavam e ficavam lá.

### Achados

- **"Failed to fetch" era o título do erro** em três lugares: o painel do campeão, a categoria e
  o catálogo. Nenhum dizia o que fazer.
- **O RNF-13 depende do T-52** (#60): comparar o `sha256` no cdragon avisaria em todo download,
  porque a borda dele recomprime o PNG. Foi para o T-50b, e o dono o fechou no mesmo dia: o aviso
  sai da Spec, e o RNF-13 passa a dizer que quem verifica é a conferência no navegador.
- **O teste do "carregando" teria passado sem esperar nada:** o ajudante da categoria esperava
  `/^carregando /` sumir, e com a maiúscula a frase nunca casaria. Mudou junto com o texto.

### Conferido

| | |
|---|---|
| Testes de unidade | **463 de 463** — 7 novos; 11 mudados de propósito, todos pela microcopy |
| `tsc` e `eslint` | limpos |
| e2e | **46 de 46**; 2 mudados pela microcopy ("Já é PNG", "Carregando as artes…") |
| Inspeção | 13 estados em 1440×900 e 390×844; um lote de correções e a segunda rodada limpa |

## O que resta

- **T-45 e T-46 estão no ar** desde 15/09 ([#55](https://github.com/NihonCodingg/lol-assets/pull/55)
  e [#57](https://github.com/NihonCodingg/lol-assets/pull/57)), com o ok do dono. No ar, o
  `conferir-publicacao` passou limpo, e o `conferir:navegador` deu 8 de 9 — o que falhou é a
  divergência do cdragon, anterior a esta onda. Ela ganhou causa e PR próprio numa tarefa
  separada: o T-52 ([#60](https://github.com/NihonCodingg/lol-assets/pull/60)) — a borda do
  cdragon recomprime o PNG.
- **O T-47 e o T-47b têm o ok do dono** (16/09); o merge é dele, um de cada vez.
- **O ok do dono nos previews do T-48, do T-49 e do T-50.**
- ~~O T-50b (RNF-13)~~ — fechado sem executar em 16/09, por decisão do dono; o RNF-13 foi
  emendado na Spec.
- **Tirar o `_fpo` do índice**, no indexador — o T-48 só o esconde na tela.
- ~~O aviso de índice velho acendendo à toa no site no ar~~ — resolvido no T-51
  ([#56](https://github.com/NihonCodingg/lol-assets/pull/56)), na tarefa separada que o dono
  iniciou em outra sessão: o aviso passou a medir a última verificação. Os ramos do T-45 e do
  T-46 receberam o `main` com ele; o único conflito foi a tabela de ADRs, onde a 0017 e a 0018
  entraram no mesmo lugar. Depois do merge: **397 de 397** na unidade e **37 de 37** no e2e.
- **Confirmado em 15/09:** a Vercel publica sozinha o commit do bot. O `chore(indice): patch
  16.18.1` (`63dacdb`, de `github-actions[bot]`) virou deploy de produção sem ninguém mexer.
- Do T-33, ainda: o registro no Developer Portal da Riot.
