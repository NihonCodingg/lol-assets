# Sessão 15/09/2026 — o inventário

O pedido: com o site no ar, os tickets passando de 50, PRs esperando carimbo de deploy e sessões
paralelas disputando o mesmo arquivo, separar o que resta em essencial, manutenção e desejável —
e seguir com o que estiver desbloqueado do essencial. O resultado está em
[INVENTARIO.md](../INVENTARIO.md).

## O que foi feito

- **O inventário**, com as três listas, os tickets que eu fecharia sem executar, os PRs abertos e
  onde eu discordo do corte. Um ponteiro para ele no "Como ler" do TICKETS.
- **O #58 deixou de conflitar com o #60.** A nota "Mergeado em 15/09/2026" ficava no fim do bloco
  do T-51, colada onde o #60 insere o T-52 — conflito certo em qualquer ordem. Subiu para a
  abertura do T-51. Simulado com `git merge-tree`: o #58, o #59 e o #60 entram em qualquer ordem,
  sem conflito entre si nem com o `main`.
- **As decisões do dono, registradas** no #58 (T-51 e relatório do T-51) e na memória das
  sessões:
  - o aviso de índice velho continua dizendo quando o índice foi **gerado**;
  - nenhuma regra de permissão para `gh pr merge`: o merge é sempre dele, e a sessão entrega o
    comando pronto.
- **A conferência agendada de 16/09** confere o primeiro carimbo e, se ele estiver no ar,
  completa o #58, com o push e a edição do PR aprovados pelo dono. Nunca mergeia.

## O que foi medido

| | |
|---|---|
| Uso do `sha256Hex` fora de teste | nenhum — o RNF-13 nunca chegou à tela |
| Simulações de merge entre #58, #59, #60 e `main` | todas limpas |
| Execuções agendadas de 15/09 depois da reindexação | 08:42 e 14:20 UTC, sem carimbar — o índice tinha menos de 24 h |

## O que foi assumido

- **Lista A** é o que a Spec promete e falta, mais o que impede o site de estar usável. A Onda 7
  ficou na C: foi pedido do dono, mas nenhum item dela é promessa da Spec.
- **Não havia nada desbloqueado na lista A para executar em código.** O D6 é conta do dono, o
  carimbo é automático, e o RNF-13 depende do #60 e da decisão do dono. Nenhum código foi escrito
  nesta sessão.
- **O inventário não fecha ticket nenhum.** Ele recomenda; o dono decide.

## O que ficou pendente

- A decisão sobre o RNF-13: tirar da Spec ou construir no T-50.
- Os fechamentos sugeridos (T-23, T-26, T-44) e a passagem do T-39 para a lista B.
- O primeiro carimbo, em 16/09, e o #58 que ele completa.

## Próximo passo sugerido

Registrar o D6 e decidir o RNF-13. Com isso e o carimbo de amanhã, a lista A fica vazia de
verdade, e o projeto passa a ser só a lista B rodando e a C esperando.

## Só o dono pode fazer

- Registrar a Biblioteca de Assets no Developer Portal (D6).
- Mergear o #60, este PR e, depois do carimbo, o #58.
- Decidir o RNF-13, os fechamentos sugeridos e o que da lista C vale fazer.
