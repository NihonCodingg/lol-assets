# ADR 0020 — O merge é do agente

- **Status:** ✅ aceito (17/09/2026)
- **Data:** 2026-09-17
- **Decidido por:** o dono
- **Revoga:** a decisão do dono de 15/09/2026 — "o merge é sempre do dono; nenhuma regra de
  permissão para `gh pr merge`" —, registrada em
  [2026-09-14-o-aviso-de-indice-velho.md](../sessoes/2026-09-14-o-aviso-de-indice-velho.md);
  e, daqui para a frente, a regra de entrega da Onda 7 de que cada etapa "só vai ao ar depois do
  ok do dono"
- **Respeita:** a regra 11 do [CLAUDE.md](../../CLAUDE.md) — o `main` só recebe merge por PR — e
  a CI de todo PR

## Contexto

Em 15/09/2026 o dono decidiu que o merge seria sempre dele. O motivo era bom no papel: ele é o
único revisor humano do projeto, e o merge é o último ponto em que alguém olha o que entra. As
sessões passaram a entregar o PR com a CI verde e o comando pronto
(`gh pr merge N --repo NihonCodingg/lol-assets --squash --delete-branch`), e nenhuma regra de
permissão foi criada — de propósito.

Dois dias depois, o que aconteceu foi outra coisa:

| | |
|---|---|
| PRs prontos, com CI verde, esperando só o merge em 17/09 | **7** — #58, #59, #60, #61, #63, #64 e #65 |
| Há quanto tempo o mais antigo esperava | o #60, desde 15/09 |
| Vezes que o vigia de espera (`fila.sh`) rodou | 3 — as duas primeiras venceram o prazo (3 h e 24 h) sem merge nenhum; a terceira foi desligada por este ADR |
| Respostas do dono no período | "pode seguir", "prossiga", "continue" — sem rodar os comandos |

Nas palavras do dono, em 17/09/2026: "na prática eu só colava comandos sem revisar, então a
barreira era simbólica e virou o gargalo do projeto".

A barreira não protegia nada que a CI já não protegesse, e custava dias: a fila da Onda 7 era
empilhada, e cada PR de cima precisava ser atualizado depois do merge do de baixo — ou seja, o
projeto inteiro parava a cada comando não colado.

## Decisão

1. **O agente mergeia.** Com a CI do PR verde, `gh pr merge --squash --delete-branch`, e segue a
   fila inteira sem consultar o dono entre um PR e outro. PR empilhado é atualizado logo depois
   do merge do de baixo, na mesma sessão.
2. **A regra de permissão existe:** `Bash(gh pr merge *)` em `permissions.allow` das
   configurações do usuário desta instalação (`~/.claude/settings.json`).
3. **O agente só para para:**
   - decisão que muda o que o produto faz ou promete — não escolha técnica interna;
   - medição que contradiga a Spec ou um ADR;
   - segredo, conta ou ação que só o dono pode fazer;
   - CI vermelha que ele não resolva.
4. **Relatório por lote, não por PR.** Um relatório por lote de trabalho concluído, em
   `docs/sessoes/`. No chat, só na parada por um dos motivos acima ou no fim de um lote.
5. **O vigia de espera de merge foi desligado em 17/09/2026** e não volta: o `fila.sh`, que
   esperava até 24 h por um merge do dono para então atualizar o PR seguinte, só existia por causa
   da decisão revogada.

## O que continua protegendo o `main`

- **A CI de todo PR:** Python (ruff, mypy, pytest), Web (eslint, tsc, vitest), e2e com
  Playwright, a API sobe no `docker compose`, e o preview da Vercel constrói.
- **Um PR por ticket**, com as decisões e cada teste mudado de propósito escritos na descrição —
  o dono pode auditar depois o que não revisou antes.
- **A conferência do site no ar** (`conferir-publicacao.mjs` e `conferir:navegador`) depois de
  cada lote que mexe no que é publicado.
- **Voltar é barato:** o squash é um commit só, reversível por `git revert` num PR; e a Vercel
  promove de volta o deploy anterior.
- **As paradas do item 3:** o que muda o produto ou contradiz a Spec continua passando pelo dono.

## Alternativas consideradas

- **Manter o merge manual.** Medido acima: virou gargalo, e a revisão que justificava a regra
  não acontecia.
- **Auto-merge do GitHub (`gh pr merge --auto`).** O GitHub mergearia sozinho quando a CI
  passasse. Exige ligar o auto-merge nas configurações do repositório — conta do dono — e não
  resolve os PRs empilhados, que precisam de atualização entre um merge e o próximo. Continuaria
  precisando de alguém para disparar cada um.
- **Aprovação por lote em vez de por PR.** Reduz as esperas, mas não as elimina: o dono escolheu
  parar só pelos motivos do item 3.
- **Commit direto no `main`, sem PR.** Descartado: perde a CI e o registro, e fere a regra 11.

## Consequências

**Boas**

- A fila anda no ritmo da CI, não no da disponibilidade do dono.
- O PR continua sendo o registro auditável de cada mudança.

**Custos aceitos**

- Um defeito que a CI não pega pode chegar ao ar sem olho humano antes. A conferência do site no
  ar e o rollback da Vercel limitam o estrago; os relatórios de lote dizem o que entrou.
- A regra vale para a instalação inteira, não só para este repositório — é onde o dono pediu.

## Como voltar atrás

Tirar `Bash(gh pr merge *)` do `permissions.allow` de `~/.claude/settings.json` e escrever o ADR
que revogue este. A memória do agente (`feedback-modo-continuo-de-tickets`) precisa acompanhar.
