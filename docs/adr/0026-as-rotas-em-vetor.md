# ADR 0026 — As rotas, em vetor: o contrato aceita SVG

- **Status:** ✅ aceito (30/09/2026)
- **Data:** 2026-09-30
- **Decidido por:** o dono pediu os ícones das rotas ("o ícone da jungle, top etc."). Entre o PNG
  de 136 px e o vetor, escolheu "o que tiver mais qualidade". O desenho é do agente.
- **Emenda:** o [ADR 0001](0001-formato-de-entrega-dos-assets.md), na regra 4 (asset com alfa é
  PNG ou SVG, nunca JPEG), e o contrato do índice, que vai de 2.0.0 para **2.1.0**.
- **Exceção ao:** [ADR 0021](0021-o-projeto-entra-em-manutencao.md), como o 0023 e o 0025.

## Contexto

O cliente do jogo tem os ícones das cinco rotas — topo, selva, meio, atirador e suporte — em dois
formatos no cdragon:

- **PNG** de 136 × 136 px (`rcp-fe-lol-parties/.../icon-position-<rota>.png`). Num vídeo em 1080p,
  ampliado, fica borrado.
- **SVG** (`rcp-fe-lol-static-assets/.../svg/position-<rota>.svg`): o mesmo desenho, dourado, entre
  350 e 600 bytes, com as cores no próprio arquivo e CORS aberto. Vetor não tem resolução.

O contrato só conhecia `png` e `jpeg`.

## Decisão

1. **O contrato 2.1.0 aceita `svg`**, a categoria `position` e o tipo `position_icon`. A mudança é
   aditiva: nenhum registro existente muda. Num SVG, `width` e `height` são as medidas que o
   desenho declara (a raiz, ou o `viewBox`), e `hasAlpha` é sempre verdadeiro.
2. **O indexador mede o SVG pelo texto da raiz**, sem renderizar nada. O ADR 0001 continua: o
   arquivo é servido como a fonte o publica. A lista das rotas é fechada, em
   `adapters/rotas.py`, pelo mesmo motivo dos emblemas de elo (ADR 0025): não há JSON do cliente
   que as liste.
3. **No site, "Baixar PNG" rasteriza o vetor em 1024 px** no navegador. A imagem é desenhada num
   canvas desse tamanho, e o vetor sai nítido. "Original" entrega o SVG, que o Premiere e o After
   Effects abrem. A ficha mostra "Vetor, PNG 1024×1024" em vez dos 34×34 que o desenho declara.
4. **Na tela**, a categoria se chama "Rotas" e ganha a décima cor de etiqueta, `#68BF9B`: matiz
   165°, entre wards e runas, com a mesma luminosidade das outras.

## Consequências

- Só a variante dourada entra; as versões azul, vermelha e apagada da fonte ficam de fora. O
  "Preencher" (*fill*) não existe em SVG e fica de fora também.
- A fatia tem 5 registros e só é pedida no clique (RNF-03). O custo continua zero.
- Qualquer categoria futura que a fonte sirva em vetor já cabe no contrato.
