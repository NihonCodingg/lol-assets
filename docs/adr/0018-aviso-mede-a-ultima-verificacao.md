# ADR 0018 — O aviso de índice velho mede a última verificação, não a última mudança

- **Status:** ✅ aceito (14/09/2026)
- **Data:** 2026-09-14
- **Ticket:** T-51
- **Emenda:** o item 4 da §11 da Spec; a §6 (contrato **1.3.0**); a consequência do
  [ADR 0014](0014-onde-vive-o-indice-gerado.md) que previa um commit `chore(indice)` por patch
- **Respeita:** [0012](0012-onde-guardar-os-assets.md) (publicar é commitar, só com o
  `GITHUB_TOKEN`), [0013](0013-uma-versao-por-vez-no-indice.md) (uma versão por vez),
  [0014](0014-onde-vive-o-indice-gerado.md) (o índice mora no `main`) e
  [0016](0016-publicacao-na-vercel.md) (o manifesto sempre revalida)

## Contexto

Em 14/09/2026 o site publicado mostrava a todo visitante:

> Este índice foi gerado há 4 dias, em 10 de setembro de 2026 às 08:09. A indexação
> automática pode ter parado — o que está aqui continua funcionando, mas pode não ser o
> patch mais recente.

A indexação não tinha parado. Depois da indexação de 10/09 às 08:09 o workflow `Indexação`
rodou **17 vezes agendado, todas com sucesso**, cada uma em ~15 s: perguntou ao ddragon,
ouviu `16.18.1` e encerrou. O log da última, em 14/09 às 15:53 UTC:

```
{"event": "decisão de indexação", "needsIndex": false, "latest": "16.18.1", "indexed": "16.18.1"}
nada a fazer: já indexado em 16.18.1
```

O aviso do T-31 media `manifest.generatedAt`, e o `generatedAt` só anda quando o índice
muda — quando a Riot lança patch ou quando o indexador muda (T-38). "A indexação parou" e
"a Riot não lançou patch" davam o mesmo sintoma: nada commitado. Com patch a cada duas
semanas e limite de 72 h, o aviso ficava aceso **em ~11 de cada 14 dias** com tudo
funcionando. Era exatamente o que o T-31 dizia querer evitar: alarme falso é como se aprende
a ignorar alarme.

### O que restringe o desenho

O aviso precisa de um sinal que ande **quando a indexação roda e confere**, e que pare quando
ela para. Esse sinal tem que chegar ao navegador, e o site já tem um caminho para isso: o
`manifest.json`, buscado a cada visita e que **sempre revalida** (`max-age=0,
must-revalidate`, [ADR 0016](0016-publicacao-na-vercel.md)). Tudo o que o site sabe sobre o
índice chega por commit no `main` e deploy da Vercel ([ADR 0012](0012-onde-guardar-os-assets.md),
[ADR 0014](0014-onde-vive-o-indice-gerado.md)) — e cada commit no `main` é um deploy de
produção. É esse custo que a decisão pesa.

## Decisão

1. **O manifesto ganha `checkedAt`**: a última vez que a indexação automática conferiu que o
   índice publicado ainda é o do patch atual. É opcional, e ausente significa o mesmo que
   `generatedAt` — o caso de todo manifesto recém-gerado e dos anteriores a esta decisão.
   **Contrato 1.3.0.**
2. **`check --stamp`**: quando o passo "Há patch novo?" responde "nada a fazer", ele carimba
   `checkedAt` com a hora da verificação **se o carimbo anterior tem 24 h ou mais**
   (`INTERVALO_DO_CARIMBO`, em `scheduling.py`). Com patch novo não carimba: carimbar é afirmar
   que o publicado é o atual, e nesse caso quem reescreve o manifesto é a indexação.
3. **O carimbo é commitado como o índice**: mesmo passo, mesmo `git add` do diretório,
   mensagem `chore(indice): 16.18.1 conferido`. Carimbo junto de indexação que falhou não
   entra.
4. **O site mede a última verificação**: `velho` passa a ser "mais de 72 h desde
   `max(generatedAt, checkedAt)`". **O texto do aviso não muda** — continua dizendo quando o
   índice foi gerado, que é quando o conteúdo mudou. Quando o aviso acende, a geração tem pelo
   menos a idade da verificação, então "gerado há N dias" continua verdadeiro, com N de três
   para cima.
5. **O limite continua 72 h.** Um teste do indexador lê o número do `frescor.ts` e exige que o
   intervalo do carimbo caiba três vezes nele.

## Por quê: quanto custa cada cadência

O preço de um sinal que viaja por commit é commit. Medido, não estimado.

**No repositório.** 365 carimbos diários commitados num clone do `main` (`9640eb5`), com
`git gc --aggressive` antes e depois:

| | `size-pack` |
|---|---:|
| antes | 3.674 KiB |
| depois de 365 carimbos | 3.901 KiB |
| **por carimbo** | **636 bytes** |

Um ano de carimbo diário são **~0,22 MiB** de histórico. Para comparar: cada patch custa ~0,38
MiB, e o índice inteiro, ~12 a ~21 MiB por ano ([ADR 0014](0014-onde-vive-o-indice-gerado.md),
[ADR 0015](0015-orcamento-do-indice-depois-da-segunda-fonte.md)). O gatilho do plano B do 0014
(`.git` acima de 200 MiB) nem se mexe.

**No `main` e na Vercel.** Cada commit é um deploy de produção. A folga abaixo é o menor
trecho sem nenhuma execução bem-sucedida capaz de acender o aviso: 72 h menos o maior carimbo
publicado numa semana normal, que é o intervalo mais o maior espaço entre duas execuções.
Medido de 10 a 14/09/2026: o Actions atrasa os agendamentos — o das 03:17 UTC saiu entre 07:56
e 08:56 todos os dias — e deixou até **9 h 46 min** entre duas execuções.

| Cadência do carimbo | Commits e deploys por ano | Folga antes do alarme falso |
|---|---:|---:|
| a cada execução (~4 por dia) | ~1.460 | ~62 h |
| **a cada 24 h** | **~340** | **~38 h** |
| a cada 48 h | ~170 | ~14 h |

(340 são os 365 dias menos os ~26 em que um patch já commita.) A cada execução quadruplica os
commits para comprar folga que não faz falta; a cada 48 h deixa uma noite de fila do Actions
acender o aviso. **24 h** é a cadência em que as duas contas fecham.

**Os deploys do carimbo não quebram nada.** Catálogo e fatias têm o hash do conteúdo no nome e
não mudam com o carimbo, então quem está com a página aberta durante o deploy não recebe o 404
que o [ADR 0016](0016-publicacao-na-vercel.md) descreve para troca de índice.

**O commit do bot não roda a CI.** Conferido: o commit `cf5022b` (`chore(indice): patch
16.18.1`, do `github-actions[bot]`) não tem nenhuma execução do workflow `CI`; o merge
`a8b3c4a`, do dono, tem. Push feito com o `GITHUB_TOKEN` não dispara workflow, então o carimbo
não gasta minutos de CI nem gera notificação.

**O `git log` fica mais cheio**, e esse é o custo que sobra: ~340 linhas `chore(indice): …
conferido` por ano. `git log --invert-grep --grep='^chore(indice)'` mostra só o código.

**E o carimbo prova o caminho inteiro.** Ele só chega ao site se o agendamento rodou, o
ddragon respondeu, o commit entrou e a Vercel publicou o commit do bot. O item 4 do
[ADR 0016](0016-publicacao-na-vercel.md) — a Vercel publica sozinha o commit do
`github-actions[bot]`? — deixa de esperar o próximo patch para ser respondido: se ela não
publicar, o aviso acende em três dias e está certo em acender.

## Alternativas consideradas

### Sem commit nenhum

- **O navegador pergunta à API do GitHub** qual foi a última execução bem-sucedida. Troca um
  arquivo estático por uma dependência de terceiro em toda visita: cota de 60 requisições por
  hora por IP sem autenticação, o IP de cada visitante indo para o GitHub, e o nome do
  repositório escrito no front — ele já mudou uma vez, e a API responde 301 ao nome antigo
  (regra 11 do CLAUDE.md). E prova menos: diz que o workflow rodou, não que o site recebeu.
- **Branch órfão lido do `raw.githubusercontent.com`.** Tira o ruído do `main`, mas põe o `raw`
  no caminho de toda visita (com as cotas para requisição não autenticada que o
  [ADR 0012](0012-onde-guardar-os-assets.md) já registrou), faz a integração do Git da Vercel
  tentar um preview a cada carimbo numa branch sem app, e também não prova que o site
  publicado recebeu nada.
- **Deploy hook da Vercel sem commit, carimbando a hora do build.** Exige o segredo
  `VERCEL_DEPLOY_HOOK`, que é o plano B do [ADR 0016](0016-publicacao-na-vercel.md) e não
  existe; faz um deploy por carimbo do mesmo jeito; e mistura sinais — um merge de PR também
  builda, e esconderia uma indexação parada enquanto houvesse PR entrando.
- **Edge Config, KV ou função da Vercel.** Token da Vercel no Actions, que é segredo novo
  contra o [ADR 0012](0012-onde-guardar-os-assets.md), e fora da arquitetura estática do
  [ADR 0005](0005-arquitetura-estatica-custo-zero.md).

### Com commit, mas em outro lugar

- **Um arquivo novo** (`verificacao.json`) ao lado do índice. O site teria que buscar um
  segundo arquivo na abertura — mexendo em `page.tsx` e no componente do aviso, enquanto o
  redesenho do front (T-45 a T-50) trabalha nessas telas — e ganhar uma regra de cache nova no
  `cabecalhos.ts`. Seria contrato novo do mesmo jeito: o `1.1.0` subiu por um documento novo,
  o `index-status`.
- **No `status.json`.** Ele é o relatório da última **indexação** (T-12), com o `runId` e a
  duração dela; o carimbo de outra execução misturaria as duas. E o site também teria que
  passar a buscá-lo.
- **Reaproveitar o `generatedAt`**, sem campo novo e sem subir o contrato. O manifesto
  passaria a dizer "gerado em 14/09" sobre um conteúdo gerado em 10/09, divergindo do
  `generatedAt` do catálogo e das fatias. Mudar o significado de um campo sem mudar o nome é
  convite para alguém ler errado depois.

### Outra pergunta

- **Comparar com o `versions.json` do ddragon no navegador**: o aviso acenderia quando existe
  patch mais novo que o índice. Mede outra coisa — índice atrasado, não indexação parada —,
  acenderia a cada patch nas horas normais até a indexação rodar, e põe uma requisição ao
  ddragon em toda visita. Fica anotado como ideia, não como esta decisão.

## Consequências

- **A primeira execução depois do merge reindexa o 16.18.1**, com o motivo "contrato do índice
  mudou de 1.2.0 para 1.3.0" — é a regra do T-38 para contrato novo. São ~31 min e um commit
  `chore(indice): patch 16.18.1` com o índice inteiro reescrito (mudam o `schemaVersion` e o
  `generatedAt`). Isso também apaga o aviso do site na hora, porque o `generatedAt` anda. Daí
  em diante, um carimbo por dia sem patch.
- **~340 commits `chore(indice): … conferido` por ano no `main`**, cada um com uma linha do
  `manifest.json` e um deploy de produção.
- **O aviso acende entre ~38 h e 72 h depois de a indexação parar** — antes, acendia 72 h
  depois do último patch, parada ou não.
- **`check` sem `--stamp` continua só lendo.** Rodado à mão, não escreve nada; quem passa a
  opção é o workflow.
- **O fixture do e2e fica no 1.2.0, sem carimbo.** É um índice publicado antes desta decisão, e
  o site cai no `generatedAt` para ele — o caso de compatibilidade, exercitado de graça.
- **O limite do site e o intervalo do carimbo andam juntos**, e um teste lê os dois.

## Como voltar atrás

- **Menos commits:** subir `INTERVALO_DO_CARIMBO`. Com 48 h a folga cai para ~14 h; acima de
  24 h, rever o limite do site junto — o teste que lê os dois lados avisa.
- **Sem carimbo:** tirar o `--stamp` do workflow. O site volta sozinho ao comportamento do
  T-31, porque sem `checkedAt` ele mede o `generatedAt`. O campo pode ficar no contrato.
- **Se o ruído no `git log` incomodar**, o remédio é o intervalo, não outro canal: todo canal
  que chega ao site sem commit foi descartado acima, e o plano C do
  [ADR 0014](0014-onde-vive-o-indice-gerado.md) também precisaria de um commit no `main` para
  disparar o deploy.
