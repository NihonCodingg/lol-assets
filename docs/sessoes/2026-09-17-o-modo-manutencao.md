# Sessão 17/09/2026 — o projeto entra em manutenção

O pedido, logo depois de a fila da Onda 7 entrar: o dono registrou a Biblioteca de Assets no
Developer Portal da Riot, deu a lista A por fechada e a lista C por despachada, e definiu o modo
em que o projeto passa a operar — manutenção, com autonomia do agente dentro desse escopo. E
pediu que o modo ficasse escrito no `CLAUDE.md`, para que qualquer sessão futura entre nele por
padrão em vez de propor trabalho novo.

## O que foi feito

- **O modo de operação no [`CLAUDE.md`](../../CLAUDE.md)**, antes das regras herdadas do KICKOFF:
  o que o agente decide e executa sozinho, o que ele não faz e os três casos em que escreve ao
  dono.
- **O [ADR 0021](../adr/0021-o-projeto-entra-em-manutencao.md)**, com o porquê: o risco do
  projeto inverteu — era parar, agora é inventar trabalho.
- **O D6 fechado** em todo lugar que o dava como pendente: o T-33 (incluindo o critério 3 e a
  linha da onda de lançamento), a tabela de decisões da Spec, o `LANCAMENTO.md` e o inventário.
  O T-33 é o último ticket que estava aberto.
- **A lista C marcada como despachada** no inventário, e as ideias que estavam nela anotadas
  como **ideias não executadas**, no fim do [`TICKETS.md`](../TICKETS.md) — que é onde, daqui
  para a frente, morre toda oportunidade encontrada no caminho.

## Sobre o identificador do app

O dono mandou o App ID no chat. Ele **não** está no repositório: não é segredo, mas é um número
da conta dele que nada no projeto usa — o site não chama a API da Riot. O que o repositório
registra é a data e o tipo do registro (produto pessoal). Se um dia for preciso, o número está
no painel do Developer Portal dele.

## O que isso muda na prática

| | Antes | Agora |
|---|---|---|
| Fila de trabalho | `TICKETS.md` | o que a lista B do inventário acusar: issue da indexação, CI vermelha, site fora do ar |
| Achado no caminho | virava ticket | vira ideia anotada, e o trabalho segue |
| Relatório | um por lote | um por correção, em `docs/sessoes/`, sem aviso no chat |

O que continua igual: o `main` só por PR com a CI verde, o merge é do agente
([ADR 0020](../adr/0020-o-merge-e-do-agente.md)), a conferência contra o site no ar depois de
cada mudança do que é publicado, e as paradas — o que muda o produto ou contradiz a Spec
continua passando pelo dono.

## O que ficou pendente

Nada. Não há ticket aberto, nem PR aberto além deste, nem item na lista A.

## Próximo passo sugerido

Nenhum por iniciativa própria: o próximo trabalho é o que quebrar.
