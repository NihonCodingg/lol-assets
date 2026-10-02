# Sessão 26/09–02/10/2026 — Ranks, Rotas em vetor e a barra da Sobre

Três pedidos do dono, um PR cada, todos com a CI verde antes do merge e conferidos no site
publicado.

| Ticket | PR | Entrega |
|---|---|---|
| T-92 | #124 | A categoria **Ranks**: os dez emblemas de elo, de Ferro a Desafiante ([ADR 0025](../adr/0025-a-categoria-rank-volta.md)) |
| T-93 | #125 | A categoria **Rotas**: os cinco ícones de rota em SVG, e o contrato 2.1.0 com o formato `svg` ([ADR 0026](../adr/0026-as-rotas-em-vetor.md)) |
| T-94 | este | A barra lateral da Sobre aberta direto mostra as dez categorias |

## Ranks (T-92)

O ADR 0012 tinha tirado `rank` da v1: o emblema montado só existia no zip de 61,5 MB da Riot. Em
26/09 o cdragon já servia o emblema montado de cada divisão, em PNG com alfa e CORS aberto.

- **Indexador.** A lista fechada das dez divisões fica em `adapters/ranked.py`. Não há JSON do
  cliente que as liste, e por isso ela mora fora do `cdragon.py`, onde um teste proíbe montar
  caminho.
- **Arquivos.** Platina e Esmeralda vêm em 2560×1440; as outras divisões, em 1280×720.
- **Na tela.** A nona cor de etiqueta (`#50BDCB`), a ordem do jogo e uma prévia aproximada 2,8×.
  O emblema ocupa o meio de um quadro transparente, e sem o zoom virava um selo.
- **Fora.** O "Unranked" só existe como brasão de 48 px, pequeno demais para vídeo.

## Rotas, em vetor (T-93)

O dono pediu "o que tiver mais qualidade". O PNG da fonte tem 136 px; o SVG não tem resolução.

- **Contrato 2.1.0, aditivo.** Entraram o formato `svg`, a categoria `position` e o tipo
  `position_icon`. A regra 4 do ADR 0001 passou a ser "alfa nunca é JPEG".
- **Indexador.** Mede o SVG pelo texto da raiz, sem renderizar nada.
- **Site.** "Baixar PNG" desenha o vetor num canvas de 1024 px, e "Original" entrega o SVG.
  Conferido no ar: o PNG da Selva, baixado pela interface, saiu com 1024×1024, nítido.
- **Fora.** O "Preencher", que não existe em SVG, e as variantes de cor.

## A barra da Sobre (T-94)

A lista de categorias vinha só do manifesto que a home carrega. Quem abria `/sobre` direto via
"Campeões" e mais nada. A pendência vinha da revisão de design de 25/09 e ficou mais visível com
as duas categorias novas.

Agora, fora da home, a barra busca o manifesto sozinha. São 3 KB, com `fetch` direto, sem levar o
cliente do índice para o layout. Cada categoria é um link que volta à home já aberta nela.
Conferido: na Sobre aberta direto, a barra tem as dez categorias, e "Rotas" abre a galeria com
cinco tiles. A frase "Nas categorias" da Sobre também passou a citar ranks e rotas.

## Números

O JS da chegada continua em 163 KB, dentro dos 190 do orçamento. A página Sobre tem 106 KB. As
fatias novas só são pedidas no clique.

## O que fica

- Com dez etiquetas, a próxima cor de categoria terá menos de 20° de separação das vizinhas.
- Continuam fora, da revisão de 25/09:
  - a busca global na Sobre, que precisaria do catálogo;
  - a densidade dividindo a linha com as funções, no telefone.
- A validação com pessoas (§9 do Plano de Design) continua do dono.
