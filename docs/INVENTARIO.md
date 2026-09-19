# Inventário — o que resta

> **15/09/2026, atualizado em 17/09/2026.** Pedido do dono: a fase de construção acabou, e ele
> não quer ficar preso num ciclo infinito de tickets num projeto que já funciona e que usa. O que
> resta fica aqui, em três listas. **A lista A se executa; a B roda sozinha; a C espera a decisão
> dele.** Cada linha diz o que o item entrega a ele, não o que faz por dentro.
>
> **Desde 17/09/2026 o projeto está em manutenção** ([ADR 0021](adr/0021-o-projeto-entra-em-manutencao.md)):
> a lista A fechou, a C foi despachada, e o agente conserta o que quebra sem abrir trabalho novo.
> Oportunidade encontrada no caminho vira ideia anotada no fim do [TICKETS.md](TICKETS.md).
>
> **A Onda 8 (18/09) foi uma exceção pontual**, pedida e aprovada pelo dono para melhorar o
> design, e já encerrada: o relatório está em
> [2026-09-18-a-onda-8-a-arte-na-frente.md](sessoes/2026-09-18-a-onda-8-a-arte-na-frente.md). Ela
> não é precedente — o modo de manutenção voltou a valer como está no ADR.
>
> **Desde 17/09/2026 o merge é do agente** ([ADR 0020](adr/0020-o-merge-e-do-agente.md)): com a
> CI verde, ele mergeia e segue; só para por decisão de produto, contradição com a Spec ou um ADR,
> segredo ou conta do dono, ou CI vermelha que não resolva.

## Onde o projeto está

O site cumpre a Spec e está no ar desde 11/09/2026, usado pelo dono e por amigos: busca, grade
de 173 campeões, 27.313 assets em oito categorias, download individual e em lote, PNG gerado no
navegador, os avisos da Riot e custo zero. Desde 17/09/2026 está no ar também o redesenho da
Onda 7 — o painel do campeão como vitrine, as categorias em galeria, o telefone e o acabamento.
A conferência contra a URL publicada passa 26 de 26 por HTTP e 9 de 9 no navegador (18/09/2026,
depois da Onda 8).

## A — Essencial

**A lista A está vazia.** O último item, o D6, fechou em 17/09/2026.

| Item | O que te entrega | Estado |
|---|---|---|
| ~~**D6 — registrar a Biblioteca de Assets no Developer Portal da Riot**~~ (RNF-10, T-33) | O site cumpre a condição que a Spec pôs para estar no ar | ✅ **Registrado em 17/09/2026**, como produto pessoal. Fecha o T-33 |
| ~~O primeiro carimbo diário do T-51~~ | O aviso falso de "a indexação pode ter parado" não volta | ✅ Chegou em 16/09/2026 às 08:37 UTC, e o de 17/09 também. O fechamento (#58) entrou em 17/09 |
| ~~RNF-13 — avisar quando o arquivo baixado difere do índice~~ | Saber que a arte baixada não é a que o índice mediu | ✅ **Decidido pelo dono em 16/09/2026: sai da Spec.** O RNF-13 foi emendado — quem verifica é a conferência no navegador contra o site no ar —, e o T-50b fechou sem executar |

**Por que o RNF-13 saiu da Spec em vez de ser construído** (a recomendação de 15/09, aceita):

- No cdragon — 11.765 dos 27.313 assets, medido em 10/09 — o arquivo entregue quase nunca bate
  com o `sha256` do índice: o Cloudflare Polish recomprime na borda
  ([ADR 0019](adr/0019-o-sha256-do-cdragon-nao-confere-o-download.md)). O aviso só valeria para o
  ddragon.
- No ddragon, o arquivo só diverge na janela entre um patch e a reindexação — horas —, e a
  própria indexação fecha essa janela.
- O que o aviso mediria já é verificado pela conferência no navegador contra o site no ar
  (T-43, T-52).

## B — Manutenção: roda sozinha

| O que roda | Quando | O que te entrega | Quando falha |
|---|---|---|---|
| Indexação | 4×/dia (03:17, 09:17, 15:17 e 21:17 UTC; o Actions atrasa de 2 a 5 h) | O patch novo no site no mesmo dia em que a Riot publica, e reindexado quando o indexador ou o contrato mudam | Issue automática, com o motivo |
| Carimbo de verificação (T-51) | No máximo 1×/dia, sem patch novo | O aviso de índice velho só acende quando a indexação parou de verdade | O próprio aviso acende no site em 72 h |
| Testes de contrato das fontes | 1×/dia, às 06:23 UTC | Saber antes dos visitantes quando o ddragon ou o cdragon mudam caminho ou tamanho | Issue automática |
| Guarda de orçamento do índice | Em toda indexação | O site nunca fica pesado sem você saber: a indexação para sem publicar | Issue automática; a resposta planejada é o T-39 |
| CI | Em todo PR | Nada entra no `main` sem teste | O PR fica vermelho |
| `conferir-publicacao.mjs` e `conferir:navegador` | Depois de cada lote que mexe no que é publicado, e quando você quiser, contra a URL | A prova de que o site no ar está inteiro e no mesmo índice do repositório | Lista o que falhou |

Também é B o trabalho que só aparece quando algo muda:

- **T-39 — fatiar a `champion`** → o painel do campeão continua leve quando o índice crescer.
  Não executar antes de a guarda avisar; pelo ritmo medido, isso é daqui a ~1 ano (ADR 0015).

O que a B não faz sozinha: ler a issue e decidir a correção. O merge, desde o ADR 0020, é do
agente. E um risco que ela cobre sem ter sido desenhada para isso: o GitHub desliga o agendamento
de repositório público parado há 60 dias; o commit diário do carimbo deve contar como atividade
(provável, não medido), e, se o agendamento parar mesmo assim, o aviso de índice velho acende em
72 h.

## C — Desejável: **despachada** em 17/09/2026

Você encerrou a fase de construção: **nada daqui se executa sem você pedir**, e o agente não
propõe mais nem abre ticket por conta própria. A lista fica como memória do que foi considerado
e recusado por ora; as mesmas ideias estão anotadas no fim do [TICKETS.md](TICKETS.md).

A Onda 7 saiu desta lista antes disso: foi entregue e está no ar desde 17/09/2026 (T-47, T-47b,
T-48, T-49 — que fechou o T-44 — e T-50).

| Item | O que te entrega |
|---|---|
| D2 — consentimento da Weird Gloop | Arte acima de 1280×720, pela wiki (ADR 0004). É um pedido seu, por e-mail |
| Comparar com o `versions.json` do ddragon | Um aviso quando já existe patch mais novo que o índice (ideia anotada no ADR 0018) |
| Dependabot | Atualização de segurança das dependências sem você lembrar |
| Tirar o `_fpo` do índice | O "Emote 0" — um quadrado de marcação — sai também do índice; na tela já saiu no T-48 |

**O que só existe porque virou ticket e ninguém questionou depois:**

| Item | O que te entrega hoje | Minha sugestão |
|---|---|---|
| A API FastAPI (T-32, ADR 0006) | Nada: não está publicada, nada depende dela, e ela tem CI própria (`api.yml`) | Remover. Se um dia fizer falta, o histórico guarda |
| O código do R2 (`S3ObjectStore` e `publish/bucket.py`, do T-06) | A volta ao R2 sem reescrever, se o cartão deixar de ser problema (ADR 0012) | Manter: é pouco, está testado e documentado |

## Fechar sem executar

| Ticket | Estado |
|---|---|
| ⏸️ T-23 — zips por categoria pré-gerados | Só existe com storage, que o ADR 0012 recusou; o lote montado no navegador cobre o J3 |
| ⏸️ T-26 — seletor de versão | O ADR 0013 tirou o histórico da v1: não há versão para selecionar |
| ✅ T-44 — a faixa do topo no telefone | Fechado pelo T-49 em 17/09/2026: 92 px em 390×844 |
| ⏸️ T-50b — o aviso do RNF-13 | Fechado sem executar em 16/09/2026, por decisão do dono |

E um muda de lugar, não de estado: o **T-39** sai da fila e vira gatilho da lista B. O **T-33**
fechou com o registro na Riot, em 17/09/2026.

## Os PRs abertos

Nenhum além deste. Em 17/09/2026 entraram, nesta ordem: #58 (fechamento do T-51), #60 (T-52),
#59 (T-47), #66 (ADR 0020), #61 (T-47b), #63 (T-48), #64 (T-49), #65 (T-50), #67 (um teste
intermitente do indexador) e #62 (o inventário e o relatório do lote).

## Onde eu discordo do corte

Concordo com ele, com uma ressalva que continua valendo: **as sessões paralelas.** O
`docs/TICKETS.md` é o único arquivo que toda sessão edita. Em operação, com pouco trabalho, uma
sessão por vez resolve; se forem duas, que não mexam no mesmo ticket nem na tabela do mapa de
cobertura.
