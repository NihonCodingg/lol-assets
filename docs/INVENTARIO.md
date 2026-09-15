# Inventário — o que resta

> **15/09/2026.** Pedido do dono: a fase de construção acabou, e ele não quer ficar preso num
> ciclo infinito de tickets num projeto que já funciona e que usa. O que resta fica aqui, em
> três listas. **A lista A se executa; a B roda sozinha; a C espera a decisão dele.** Cada linha
> diz o que o item entrega a ele, não o que faz por dentro.

## Onde o projeto está

O site cumpre a Spec e está no ar desde 11/09/2026, usado pelo dono e por amigos: busca, grade
de 173 campeões, 27.313 assets em oito categorias, download individual e em lote, PNG gerado no
navegador, os avisos da Riot e custo zero. A conferência contra a URL publicada passa 26 de 26
por HTTP e 9 de 9 no navegador (15/09/2026).

## A — Essencial

**Em código, a lista A está vazia.** Sobram duas coisas que não são código e uma promessa da
Spec que nunca chegou à tela — e esta eu recomendo tirar da Spec em vez de construir.

| Item | O que te entrega | Com quem está |
|---|---|---|
| **D6 — registrar a Biblioteca de Assets no Developer Portal da Riot** (RNF-10, T-33) | O site passa a cumprir a condição que a Spec pôs para estar no ar | 🔑 Você — é conta sua. Passo a passo no [LANCAMENTO.md](LANCAMENTO.md) |
| **O primeiro carimbo diário do T-51** | O aviso falso de "a indexação pode ter parado" não volta. Sem o carimbo, ele reacende em 18/09/2026 às 00:43 UTC | Automático. A conferência agendada de 16/09, às 09:30 UTC, confirma e completa o #58 |
| **RNF-13 — avisar quando o arquivo baixado difere do índice** | Saber que a arte baixada não é a que o índice mediu | **Não entregue.** O `sha256Hex` existe desde o T-08, mas nenhuma tela o chama; o mapa de cobertura credita o T-15, e o aviso nunca foi feito. No plano, está no T-50 |

**Por que tirar o RNF-13 da Spec em vez de construir:**

- No cdragon — 11.765 dos 27.313 assets, medido em 10/09 — o arquivo entregue quase nunca bate
  com o `sha256` do índice: o Cloudflare Polish recomprime na borda (ADR 0019, que chega com o
  #60). O aviso só valeria para o ddragon.
- No ddragon, o arquivo só diverge na janela entre um patch e a reindexação — horas —, e a
  própria indexação fecha essa janela.
- O que o aviso mediria já é verificado pela conferência no navegador contra o site no ar
  (T-52), quando você a roda.

Aceitar custa uma emenda curta na Spec — o RNF-13 passa a dizer que o `sha256` descreve a origem
medida e que a conferência do navegador verifica o ddragon — e tira um item do T-50. Manter custa
um PR pequeno depois do #60, dentro do redesenho. **A decisão é sua.**

## B — Manutenção: roda sozinha

| O que roda | Quando | O que te entrega | Quando falha |
|---|---|---|---|
| Indexação | 4×/dia (03:17, 09:17, 15:17 e 21:17 UTC; o Actions atrasa de 2 a 5 h) | O patch novo no site no mesmo dia em que a Riot publica, e reindexado quando o indexador ou o contrato mudam | Issue automática, com o motivo |
| Carimbo de verificação (T-51) | No máximo 1×/dia, sem patch novo | O aviso de índice velho só acende quando a indexação parou de verdade | O próprio aviso acende no site em 72 h |
| Testes de contrato das fontes | 1×/dia, às 06:23 UTC | Saber antes dos visitantes quando o ddragon ou o cdragon mudam caminho ou tamanho | Issue automática |
| Guarda de orçamento do índice | Em toda indexação | O site nunca fica pesado sem você saber: a indexação para sem publicar | Issue automática; a resposta planejada é o T-39 |
| CI | Em todo PR | Nada entra no `main` sem teste | O PR fica vermelho |
| `conferir-publicacao.mjs` e `conferir:navegador` | Na CI, e quando você quiser, contra a URL | A prova, a qualquer hora, de que o site no ar está inteiro e no mesmo índice do repositório | Lista o que falhou |

Também é B o trabalho que só aparece quando algo muda:

- **T-39 — fatiar a `champion`** → o painel do campeão continua leve quando o índice crescer.
  Não executar antes de a guarda avisar; pelo ritmo medido, isso é daqui a ~1 ano (ADR 0015).
- **T-52, no #60 — o `sha256` do cdragon** → a conferência do site no ar para de acusar falso
  nos downloads do cdragon. É o caso típico de "uma fonte mudou": pronto, esperando o seu merge.
- **T-51, no #58 — o fechamento em docs** → o registro de que o carimbo funciona. Espera o
  carimbo.

O que a B não faz sozinha, de propósito: ler a issue e decidir a correção, e mergear — o merge
é seu. E um risco que ela cobre sem ter sido desenhada para isso: o GitHub desliga o agendamento
de repositório público parado há 60 dias; o commit diário do carimbo deve contar como atividade
(provável, não medido), e, se o agendamento parar mesmo assim, o aviso de índice velho acende em
72 h.

## C — Desejável: espera a sua decisão

A Onda 7 inteira está aqui. Ela foi pedido seu e é real, mas nenhum item dela é promessa da
Spec — e cada etapa entra sozinha, então parar depois de qualquer uma não deixa nada pela metade.

| Item | O que te entrega |
|---|---|
| T-47, no #59 — a vitrine da skin | Um painel de campeão com a skin em destaque |
| T-47b — as artes em grade | Cada arte na proporção dela, ampliar num clique e ver que o download saiu |
| T-48 — categorias em galeria | Categorias com imagem em vez de lista, e filtros com nome de gente |
| T-49 — celular (fecha o T-44) | O site inteiro usável no telefone |
| T-50 — acabamento | Vazios e erros que dizem o que fazer, a microcopy revisada, e o botão de categoria da página Sobre levando à home |
| D2 — consentimento da Weird Gloop | Arte acima de 1280×720, pela wiki (ADR 0004). É um pedido seu, por e-mail |
| Comparar com o `versions.json` do ddragon | Um aviso quando já existe patch mais novo que o índice (ideia anotada no ADR 0018) |
| Dependabot | Atualização de segurança das dependências sem você lembrar |

**Um defeito latente mora no T-49:** em 375×720, com o aviso de índice velho na tela, a lista da
categoria fica sem nenhuma linha. Com o T-51 o aviso quase nunca aparece; **se algum amigo usa
o site pelo celular, o T-49 sobe para a lista A.**

**O que só existe porque virou ticket e ninguém questionou depois:**

| Item | O que te entrega hoje | Minha sugestão |
|---|---|---|
| A API FastAPI (T-32, ADR 0006) | Nada: não está publicada, nada depende dela, e ela tem CI própria (`api.yml`) | Remover. Se um dia fizer falta, o histórico guarda |
| O código do R2 (`S3ObjectStore` e `publish/bucket.py`, do T-06) | A volta ao R2 sem reescrever, se o cartão deixar de ser problema (ADR 0012) | Manter: é pouco, está testado e documentado |

## Fechar sem executar

| Ticket | Por quê |
|---|---|
| ⏸️ T-23 — zips por categoria pré-gerados | Só existe com storage, que o ADR 0012 recusou; o lote montado no navegador cobre o J3. Se o R2 voltar, o ADR 0012 já diz como reabrir |
| ⏸️ T-26 — seletor de versão | O ADR 0013 tirou o histórico da v1: não há versão para selecionar |
| ⏳ T-44 — a faixa do topo no telefone | O T-49 já diz "fecha o T-44": é o mesmo trabalho com dois números |

E dois mudam de lugar, não de estado: o **T-39** sai da fila e vira gatilho da lista B, e o
**T-33** fica aberto só pelo D6.

## Os PRs abertos

Simulado com `git merge-tree` em 15/09/2026: **nenhum par de PRs abertos conflita**, entre si
ou com o `main`. A única ordem que importa é a do empilhamento: o #61 contém o #59, então o #59
entra antes.

| PR | Lista | Estado |
|---|---|---|
| #60 — T-52 | B | Pronto, CI verde |
| #59 — T-47 | C | Esperando o seu ok no preview |
| #61 — T-47b | C | Empilhado sobre o #59; espera o ok no preview, depois dele |
| #58 — o fechamento do T-51 | A | Rascunho até o carimbo; a conferência de 16/09 completa |

## Onde eu discordo do corte

Concordo com ele, com duas ressalvas:

1. **O RNF-13** é a única coisa que a letra da Spec põe na lista A e que falta. Eu a tiraria da
   Spec, pelos motivos acima.
2. **As sessões paralelas.** O risco de conflito de hoje não foi azar: o `docs/TICKETS.md` é o
   único arquivo que toda sessão edita. Em operação, com pouco trabalho, uma sessão por vez
   resolve; se forem duas, que não mexam no mesmo ticket nem na tabela do mapa de cobertura.
