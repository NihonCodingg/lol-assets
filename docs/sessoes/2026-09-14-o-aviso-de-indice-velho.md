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

## Depois do merge — 15/09/2026

O merge do #56 foi barrado primeiro pela checagem de permissão desta sessão ("merge sem
revisão"); com o ok explícito do dono, entrou às 00:42 UTC (`b411b09`), e a `Indexação` foi
disparada à mão ([34914303093](https://github.com/NihonCodingg/lol-assets/actions/runs/34914303093)):

| | |
|---|---|
| Decisão do `check` | `indexar: contrato do índice mudou de 1.2.0 para 1.3.0` — como previsto |
| Indexação | 00:42:56 → 01:04:12 UTC, 27.313 assets, 9 documentos órfãos varridos |
| Commit | `63dacdb` `chore(indice): patch 16.18.1`, do `github-actions[bot]` |
| Vercel | produção do `63dacdb` às **01:05 UTC**, sem deploy hook — responde o item 4 do [ADR 0016](../adr/0016-publicacao-na-vercel.md): a integração do Git publica o commit do bot |
| Site no ar | manifesto `1.3.0`, `generatedAt` 2026-09-15T00:42:56Z, **sem aviso**, 173 campeões |
| `conferir-publicacao.mjs` contra a URL publicada | **26 de 26** |

As duas execuções agendadas seguintes (08:42 e 14:20 UTC de 15/09) terminaram sem carimbar, e é
o certo: o índice tinha menos de 24 h. Os PRs da T-45 e da T-46 entraram depois deste, e o
conflito em `docs/adr/README.md` foi resolvido com as duas linhas.

**Uma correção:** a descrição do #56 dizia que a linha RNF-06 do mapa de cobertura tinha
ganhado o T-51. A edição foi planejada e não aplicada; entrou no PR de fechamento.

## O primeiro carimbo — 16/09/2026

| | |
|---|---|
| Execução | agendada, [35074752615](https://github.com/NihonCodingg/lol-assets/actions/runs/35074752615), às 08:37 UTC — a primeira depois das 24 h do índice |
| Log | `verificação carimbada no manifesto: 2026-09-16T08:37:12Z` e `nada a fazer: já indexado em 16.18.1` |
| Commit | `6239943` `chore(indice): 16.18.1 conferido`, do `github-actions[bot]`: uma linha no `manifest.json` |
| A anterior | 15/09 às 23:32 UTC, menos de 24 h depois do índice: não carimbou, como deve |
| As seguintes | 14:12, 18:54 e 23:39 UTC de 16/09: não carimbaram de novo, como devem |
| Site no ar | `checkedAt` 2026-09-16T08:37:12Z no `manifest.json` publicado, igual ao do repositório; `conferir-publicacao.mjs` com **26 de 26** |

A conferência agendada das 09:30 UTC não completou este PR; a sessão do redesenho conferiu à
mão, na mesma noite. Com isso o critério 5 fecha, e o T-51 também.

## Decisões do dono em 15/09/2026

- **O aviso continua dizendo quando o índice foi gerado.** Quem visita quer saber se a arte é
  do patch atual; a data da conferência é detalhe de operação e confundiria.
- **Nenhuma regra de permissão para `gh pr merge`.** O dono é o único revisor humano, e o merge
  é o último ponto em que ele olha o que entra. As sessões entregam o comando pronto.

## Só o dono pode fazer

- Mergear o PR de fechamento (#58): o carimbo chegou.
