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

## O que resta

- **O ok do dono no preview do T-45.** Só depois dele o merge.
- **T-46 a T-50**, um PR e um ok de cada vez.
- **O aviso de índice velho acende à toa no site no ar.** O indexador roda a cada ~5 horas e dá
  certo, mas só comita quando o patch muda; a data do índice para no último patch, e depois de
  72 horas o aviso diz que a indexação "pode ter parado". Sugerido como tarefa separada: o
  frescor deveria medir a última checagem, não a última mudança.
- Do T-33, ainda: o registro no Developer Portal da Riot e a confirmação de que a Vercel publica
  sozinha o commit do bot na próxima atualização do índice.
