# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Editores de vídeo de conteúdo de League of Legends, com o Premiere ou o After Effects aberto, no
meio de uma edição. Precisam de um asset agora, várias vezes por semana, e querem o arquivo certo
na pasta sem ler instrução, sem criar conta e sem pensar na ferramenta. O uso principal é no
computador; o celular serve para achar e salvar um emote ou uma arte.

## Product Purpose

A Biblioteca de Assets é um catálogo das artes do jogo — campeões e skins, itens, runas,
feitiços, ícones de perfil, emotes, wards e mapas — que diz onde cada arte está, em que
resolução e formato, e entrega o arquivo em dois cliques. Sucesso é achar na primeira tentativa,
pelo nome que a pessoa tem na cabeça (português, inglês, apelido, com erro de digitação); saber o
que vai baixar antes de baixar (forma, tamanho, transparência); e receber o arquivo pronto para
usar.

## Positioning

É um bin de editor que já vem cheio: a proporção, a transparência e a resolução de cada arquivo
aparecem como informação visual, e o PNG é gerado no próprio navegador a partir da fonte, sem
servidor e sem guardar nada.

## Operating Context

Tarefas reais (Plano de Design, §1): baixar o square do Jax em PNG; baixar a splash de uma skin;
baixar num zip as splashes de todas as skins de um campeão; achar o ícone de um item; baixar uma
runa com fundo transparente; copiar o link direto de uma splash; no celular, achar e salvar um
emote; descobrir qual corte serve para uma thumbnail 16:9. Nos emotes, a busca é por emoção —
o editor procura "um emote bravo" ou "um fofo" para um momento do vídeo.

## Capabilities and Constraints

- Índice estático publicado junto do site; os arquivos vêm direto do Data Dragon e do Community
  Dragon, sem storage próprio e sem custo (ADR 0012).
- Os avisos legais da Riot aparecem inteiros em toda página (RF-21); nada imita o cliente do jogo.
- Orçamento de desempenho da §7 do Plano de Design é limite duro: CLS 0, LCP ≤ 1,0 s, primeiro
  tile ≤ 450 ms, INP ≤ 200 ms no celular com CPU 4×, JS da chegada ≤ 190 KB, uma família de fonte.
- WCAG 2.2 AA; teclado completo; axe e e2e verdes.
- As categorias de emoção dos emotes são uma classificação feita pelo projeto (a Riot não publica
  uma), revisada a partir da arte de cada emote.

## Brand Commitments

Nome "Biblioteca de Assets" (ADR 0003). Direção visual do ADR 0024: o bin do editor — grafite,
um destaque magenta, cores de etiqueta por categoria, o quadro (glifo de proporção, marcas de
corte, xadrez de transparência) como a única ousadia. Confirmado pelo dono em 25/09/2026: manter o
conceito e refazer a execução bem melhor — mais clara, texto maior, mais contraste, bonita no
final e com boa experiência para quem usa.

## Product Principles

1. A arte é o conteúdo; a interface é a mesa de luz.
2. Tudo à vista com clareza: nada importante escondido atrás de rolagem lateral ou texto miúdo.
3. Sabe o que vai baixar antes de baixar.
4. Rápido em qualquer aparelho; nenhuma melhoria visual passa do orçamento.

## Accessibility & Inclusion

WCAG 2.2 AA, com contraste verificado por teste; foco visível; cor nunca carrega significado
sozinha; `prefers-reduced-motion` respeitado.
