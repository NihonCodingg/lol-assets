# Sessão 14/09/2026 — o aviso de índice velho

O pedido: o site no ar dizia "Este índice foi gerado há 4 dias… A indexação automática pode
ter parado", e ela não tinha parado. O aviso precisava passar a significar "a indexação
conferiu pela última vez em X", não "o conteúdo mudou pela última vez em X".

## O que estava acontecendo

- Depois da indexação de 10/09 às 08:09 UTC, o workflow `Indexação` rodou **17 vezes
  agendado, todas com sucesso**, ~15 s cada: `nada a fazer: já indexado em 16.18.1`.
- Quando nada muda, nada é commitado — então o `generatedAt` do manifesto ficou parado em
  10/09. O aviso media o `generatedAt`, e 72 h depois acendeu para todo visitante.
- Com patch a cada duas semanas, o aviso ficaria aceso em ~11 de cada 14 dias com tudo
  funcionando.

## O que foi feito — T-51, PR #56

- **Contrato 1.3.0:** `checkedAt` opcional no manifesto (ausente = `generatedAt`).
- **`check --stamp`:** sem patch novo, carimba `checkedAt` se o último carimbo tem 24 h ou
  mais. O workflow commita o carimbo no mesmo passo do índice, como
  `chore(indice): 16.18.1 conferido`.
- **Site:** o aviso mede `max(generatedAt, checkedAt)` contra as mesmas 72 h. Mudou só o
  `frescor.ts`; o componente e o texto do aviso ficaram intactos.
- **Registro:** [ADR 0018](../adr/0018-aviso-mede-a-ultima-verificacao.md) com a medição e as
  alternativas; T-51 no TICKETS e uma nota no T-31; Spec §5.3, §6, §11 e §14; LANCAMENTO e
  README.

## Por que este desenho

Medido, não estimado:

| | |
|---|---|
| 365 carimbos diários commitados num clone do `main` | 3.674 → 3.901 KiB: **636 bytes por carimbo**, ~0,22 MiB/ano |
| Maior espaço entre duas execuções agendadas (10 a 14/09) | **9 h 46 min** — o agendamento das 03:17 UTC saiu entre 07:56 e 08:56 todo dia |
| Commit do bot dispara a CI? | **Não**: `cf5022b` não tem execução do `CI`; o merge `a8b3c4a`, do dono, tem |

Carimbando a cada 24 h são ~340 commits e deploys por ano, com ~38 h de folga antes de um
alarme falso. A cada execução seriam ~1.460; a cada 48 h a folga cai para ~14 h. Os canais
sem commit — API do GitHub no navegador, `raw` de branch órfão, deploy hook, Edge Config —
trocam um arquivo estático por dependência de terceiro ou segredo novo, e nenhum prova que o
site publicado recebeu o carimbo.

## Conferido

| | |
|---|---|
| `pytest` inteiro, `ruff check`, `ruff format --check`, `mypy` | verdes |
| `vitest` | 364 testes do web e 7 do schema; `eslint` e `tsc` verdes |
| CI do PR #56 | Python, Web (com o build de produção e o `conferir-publicacao`), e2e, docker e o preview da Vercel — tudo verde |
| `check` de verdade na branch, sem `--stamp` | `indexar: contrato do índice mudou de 1.2.0 para 1.3.0` — o que a primeira execução depois do merge vai fazer |
| Carimbo no `manifest.json` publicado de verdade | diff de **uma linha**, `"checkedAt": "2026-09-15T00:07:25Z",` — desfeito depois |
| O site com esse carimbo, no navegador | antes: o aviso, com o texto idêntico ao do site no ar; depois: sem aviso, 173 campeões na grade, nenhum erro no console |

Não há prints: a captura de tela do painel expirava (a janela estava atrás de outra), e a
conferência foi feita pelo DOM.

## O que foi assumido

- **Contrato novo, versão nova.** A §6 da Spec pede versão nova a cada mudança de contrato;
  o preço é reindexar o 16.18.1 (~31 min) na primeira execução depois do merge. É a regra do
  T-38 funcionando, e essa reindexação já apaga o aviso do site.
- **O fixture do e2e fica no 1.2.0, sem carimbo.** Exercita a compatibilidade, e o relógio
  fixado do #54 continua valendo.
- **O texto do aviso não mudou.** Quando ele acende, a geração tem pelo menos a idade da
  verificação, então "gerado há N dias" continua verdadeiro. Se o aviso deve dizer "a
  indexação não confere o índice desde X", é troca de texto — decisão do dono.
- **Trabalho isolado numa worktree** (`D:\PROJETOS\lol-assets-T-51`), para não tocar no
  checkout da outra sessão, que está na `feat/T-45-fundacao-visual`.
- **ADR 0018 e T-51**: o 0017 e os T-45 a T-50 já estão reservados na branch da Onda 7.

## O que ficou pendente

- **O merge do PR #56.** A CI está verde; o merge foi barrado pela checagem de permissão desta
  sessão ("merge sem revisão") e ficou com o dono.
- **Depois do merge:** a próxima execução — agendada para ~08:00 UTC, ou disparada à mão —
  reindexa o 16.18.1 e publica. Será o primeiro commit do bot depois da publicação na Vercel,
  o que responde o item 4 do [ADR 0016](../adr/0016-publicacao-na-vercel.md). Conferir no ar:
  `manifest.json` com `schemaVersion` 1.3.0 e o aviso sumido.
- **~24 h depois:** o primeiro `chore(indice): 16.18.1 conferido`, com `checkedAt` no
  manifesto do site. Fecha o critério 5 do T-51.
- **Um conflito de uma linha** em `docs/adr/README.md` para quem mergear por último entre este
  PR e o da T-45: manter as duas linhas, a do 0017 antes da do 0018.

## Próximo passo sugerido

Mergear o #56 e disparar a `Indexação` à mão, sem entradas, para não esperar o agendamento;
~35 min depois, rodar o `conferir-publicacao.mjs` contra o site no ar.

## Só o dono pode fazer

- Mergear o PR #56, ou autorizar a sessão a mergear.
- Se quiser, decidir a troca de texto do aviso — hoje ele diz quando o índice foi gerado, não
  quando foi conferido.
