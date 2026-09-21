# ADR 0009 — Apelidos de busca são um JSON estático mantido à mão

- **Status:** aceito
- **Data:** 2026-09-03
- **Arquivo:** [`packages/schema/data/champion-aliases.json`](../../packages/schema/data/champion-aliases.json)

## Contexto

O protótipo mostrou que normalizar o texto (NFD, remover diacríticos, remover tudo que não
é alfanumérico) já resolve a maior parte: `kaisa` acha Kai'Sa, `belveth` acha Bel'Veth,
`chogath` acha Cho'Gath, sem tabela nenhuma.

O que a normalização **não** resolve é apelido: `mf`, `tf`, `j4`, `asol`. Nenhuma fonte
fornece isso — o KICKOFF §B.1.5 já registrava que é responsabilidade nossa. E a meta da
§A.7 de "≥ 95 % das buscas retornam o certo em primeiro lugar" depende justamente disso.

A tentação seria resolver com busca fuzzy mais esperta, embeddings ou um serviço. Para um
site de uso pessoal com 173 campeões, isso é complexidade sem retorno.

## Decisão

1. Os apelidos vivem em **um único JSON estático**, `packages/schema/data/champion-aliases.json`,
   **mantido à mão**. Sem gerador, sem script, sem serviço.
2. Formato: `{"aliases": {"<o que a pessoa digita, normalizado>": "<id interno do ddragon>"}}`.
   A chave é minúscula e alfanumérica; o valor é o campo `id` do `champion.json`.
3. **O `apps/web` importa o arquivo em tempo de build.** Ampliar a lista é editar o arquivo
   e abrir um PR — o merge na `main` publica o apelido novo no próximo deploy. **Não é
   preciso rodar o indexador nem nenhum comando.**
4. Só entra na tabela o que a normalização sozinha não acha. `kaisa` não precisa de
   apelido; `mf` precisa.
5. Um **teste de contrato** confere todos os ids da tabela contra o `champion.json` do
   patch atual. A grafia dos ids muda entre versões — os spikes flagraram
   `Fiddlesticks` × `FiddleSticks` —, e sem esse teste um apelido morre em silêncio.
6. A tabela inicial tem 55 entradas, todas validadas contra o patch 16.17.1.

## Consequências

- A meta da §A.7 passa a ser explicitamente satisfeita por **normalização + tabela
  manual**, não por busca inteligente. A §A.7 foi reescrita para dizer isso, porque medir
  uma meta sem saber como ela é atingida leva a otimizar a coisa errada.
- A cobertura da tabela é uma dívida permanente e barata: quando alguém não achar um
  campeão, a correção é uma linha.
- O arquivo fica em `packages/schema` porque é contrato compartilhado: o front usa para
  buscar, e o teste de contrato do indexador usa para validar. Não é dado de aplicação.
- Apelidos de **skin** (não de campeão) ficam fora por enquanto. Se aparecerem, o campo
  `aliases[]` de cada asset no índice já existe para isso.

## Emenda — 21/09/2026 (T-69): o vazio sugere o parecido

A decisão continua: o **ranking** é normalização mais apelidos, sem busca difusa. O que o T-69
acrescenta fica **fora** do ranking, no vazio.

Medido na produção com 50 consultas realistas, erros de dedo como "yasou", "yaso", "kattarina",
"ezrael" e "serafine" davam **zero resultados**. Isso não é apelido, e a tabela manual não daria
conta de todos. Só quando a busca de verdade não acha nada, o vazio oferece até três campeões
parecidos, como opções que o Enter abre:

- distância de edição com transposição;
- até 1 erro em consulta de até 5 letras, até 2 acima disso, nada abaixo de 4 letras;
- só nomes, ids e apelidos dos 173 campeões, que é o nível de navegação do ADR 0010.

Nenhuma consulta que já achava alguma coisa muda de resultado.
