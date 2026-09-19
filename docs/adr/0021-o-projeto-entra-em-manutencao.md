# ADR 0021 — O projeto entra em manutenção

- **Status:** ✅ aceito (17/09/2026)
- **Data:** 2026-09-17
- **Decidido por:** o dono
- **Fecha:** a fase de construção — a lista A do [inventário](../INVENTARIO.md) ficou vazia e a
  lista C foi despachada
- **Respeita:** o [ADR 0020](0020-o-merge-e-do-agente.md) (o merge é do agente, com a CI verde)

> **Emendado em 18/09/2026 pelo [ADR 0022](0022-o-front-end-vira-frente-continua.md):** o
> back-end — indexação, contrato, publicação e infraestrutura — continua em manutenção, como está
> escrito aqui. A **interface** saiu: UI, UX, acessibilidade e desempenho percebido viraram frente
> contínua, onde o agente propõe e executa sozinho.

## Contexto

Em 17/09/2026 o projeto ficou pronto: o site cumpre a Spec e está no ar, a Onda 7 do redesenho
entrou, o carimbo diário do índice funciona, e o **D6 fechou** — a Biblioteca de Assets está
registrada no Developer Portal da Riot como produto pessoal, que era a última condição que a
Spec punha para o site estar no ar (RNF-10).

O risco do projeto inverteu. Durante meses o risco era parar; agora é **inventar trabalho**: um
agente com tempo e um `TICKETS.md` aberto acha sempre o que refatorar, o que "melhorar" e que
funcionalidade propor, num site que o dono já usa como está. Nas palavras dele em 15/09, quando
pediu o inventário: ele não quer ficar preso num ciclo infinito de tickets num projeto que já
funciona.

## Decisão

O projeto opera em **manutenção**. O agente tem autonomia dentro desse escopo, sem consultar o
dono e sem escrever a ele a cada ação.

**Decide e executa sozinho:**

- a indexação agendada continua rodando; se um patch quebrar algo — uma fonte mudar de caminho,
  um teste de contrato falhar, uma dimensão inesperada aparecer —, corrige e mergeia;
- CI vermelha, teste intermitente, dependência quebrada: conserta;
- se o site sair do ar ou parar de atualizar, investiga e resolve;
- registra cada correção em `docs/sessoes/`, sem mandar relatório.

**Não faz:**

- não abre ticket de funcionalidade nova — oportunidade vira **ideia não executada** no fim do
  `TICKETS.md`, e o trabalho segue;
- não refatora, não reorganiza, não "melhora" o que funciona;
- não muda o que o produto faz ou promete sem perguntar.

**Escreve ao dono só se:**

- algo quebrar e ele não conseguir consertar;
- uma fonte mudar de um jeito que altere o que o produto entrega;
- precisar de conta, segredo ou decisão dele.

## O que isso muda na prática

| | Antes (construção) | Agora (manutenção) |
|---|---|---|
| Ticket novo | aberto quando havia lacuna | só por pedido do dono; o resto vira ideia anotada |
| Achado em código | virava ticket de melhoria | não se mexe no que funciona |
| Relatório | um por lote de trabalho | um por correção, em `docs/sessoes/`, sem aviso no chat |
| Fila de trabalho | `TICKETS.md` | o que a lista B do inventário acusar: issue da indexação, CI vermelha, site fora do ar |

O que continua igual: o `main` só por PR com a CI verde, a conferência contra o site no ar
depois de cada mudança do que é publicado, e as paradas do ADR 0020 — o que muda o produto ou
contradiz a Spec continua passando pelo dono.

## Alternativas consideradas

- **Continuar abrindo tickets da lista C.** É o que o dono cortou: nenhum item dela é promessa
  da Spec, e ele prefere decidir um a um quando quiser.
- **Parar de tudo e só responder quando ele pedir.** Deixaria a lista B sem dono: a indexação
  agendada quebra sozinha quando uma fonte muda, e é justamente isso que não pode esperar por
  ele.
- **Congelar o repositório.** O site depende de fontes vivas; congelar é escolher que ele
  apodreça.

## Consequências

**Boas**

- O projeto para de crescer e passa a durar: o trabalho que sobra é o que a realidade impõe.
- Nenhuma sessão futura precisa perguntar "o que fazer agora": se não há nada quebrado, não há
  nada a fazer.

**Custos aceitos**

- Melhorias reais deixam de acontecer por iniciativa do agente. Ficam anotadas como ideias, e
  o dono pega quando quiser.
- O julgamento de "isto está quebrado" contra "isto podia ser melhor" fica com o agente. Na
  dúvida, é ideia anotada, não ticket.

## Como voltar atrás

O dono pede uma onda nova. O modo está escrito no [`CLAUDE.md`](../../CLAUDE.md), que é o que
toda sessão lê antes de começar; mudar lá muda o padrão.
