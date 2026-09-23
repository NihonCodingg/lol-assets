# CLAUDE.md — regras de trabalho do projeto lol-assets

> As **Regras** abaixo são a cópia literal da §0.2 de [`docs/KICKOFF.md`](docs/KICKOFF.md).
> Se houver conflito, vale o KICKOFF (e, quando existirem, `docs/SPEC.md` e `docs/TICKETS.md`).
> O **modo de operação** vem depois delas e é o primeiro a ser lido: ele diz o que fazer hoje.

## Modo de operação: duas velocidades — desde 18/09/2026

O projeto está **pronto e no ar**, e o que resta está no [`docs/INVENTARIO.md`](docs/INVENTARIO.md).
Desde 18/09 ele tem **dois regimes** ao mesmo tempo
([ADR 0021](docs/adr/0021-o-projeto-entra-em-manutencao.md), emendado pelo
[ADR 0022](docs/adr/0022-o-front-end-vira-frente-continua.md)). Com a CI verde, o merge é seu
([ADR 0020](docs/adr/0020-o-merge-e-do-agente.md)).

### Back-end, indexação e infraestrutura: manutenção

- A indexação agendada continua rodando; se um patch quebrar algo — uma fonte mudar de caminho,
  um teste de contrato falhar, uma dimensão inesperada aparecer —, corrija e mergeie.
- CI vermelha, teste intermitente, dependência quebrada: conserte.
- Se o site sair do ar ou parar de atualizar, investigue e resolva.
- **Não abra ticket novo aqui**, não refatore e não "melhore" o que funciona. Oportunidade vira
  **ideia não executada**, no fim do [`docs/TICKETS.md`](docs/TICKETS.md).
- Em 22/09/2026 o dono abriu uma **exceção única** para o T-73 (fatia por campeão, ADR 0023) e o
  T-74 (nomes em inglês). Ela está encerrada e **não é precedente**: outra mudança aqui precisa
  de outra autorização dele.
- Também em 22/09/2026 ele abriu o escopo das **ideias sem custo** (T-75 a T-77: sombras das wards,
  `_fpo` fora do índice, aviso de patch novo). Está encerrado; o projeto voltou à manutenção.
  **Não abra escopo novo por conta própria.**
- **O [Plano de Design](docs/design/PLANO-DE-DESIGN.md) foi executado** em 22–23/09/2026, por
  comando do dono (T-78 a T-88, [ADR 0024](docs/adr/0024-a-direcao-visual-do-bin.md)). A direção
  dele vale para qualquer mudança de interface daqui em diante, e o orçamento da §7 continua limite
  duro. Pendente, e do dono: a validação com pessoas (§9). Não abra escopo novo por conta própria.

### Interface — UI, UX, acessibilidade e desempenho percebido: frente contínua

Área de trabalho ativa: **você diagnostica, prioriza, abre o ticket, executa, mergeia e confere
no ar, sozinho**. Sem lista para aprovar e sem parar entre tickets.

- **Leia a skill `frontend-design` antes de desenhar qualquer coisa de interface.** É leitura
  obrigatória de todo ticket de UI.
- **Diagnóstico medido antes**, do site no ar; **antes e depois no relatório**, com o mesmo
  método; e **atacar a causa** — no T-53, a largura do tile vinha dos botões, não da imagem.
- **O que define "bom" aqui:** os 2 cliques da §A.4; a arte domina o tile (cromo crescendo é
  regressão); teclado completo, com foco visível, atalhos e setas onde houver grade; o axe verde
  e **mais** rigoroso; e desempenho percebido medido — tempo até o primeiro tile pintado, tempo
  até a prévia abrir, zero salto de layout.
- **Desempenho é restrição:** nada de animação pesada, biblioteca nova sem justificativa medida
  ou efeito que custe quadro; a virtualização do [ADR 0011](docs/adr/0011-virtualizacao-so-onde-se-paga.md)
  é obrigatória. Melhoria visual que custe desempenho **não entra** — e o porquê fica escrito.
- **Não muda o que o produto faz.** Funcionalidade nova vai para "Ideias não executadas".
- Tokens do [`docs/design/TOKENS.md`](docs/design/TOKENS.md) são a fonte de verdade: mudou token,
  muda o TOKENS.md primeiro, com justificativa.

**Escreva ao dono só se:**

- algo quebrar e você não conseguir consertar;
- uma fonte mudar de um jeito que altere o que o produto entrega, ou a mudança exigir alterar o
  que o produto promete;
- precisar de conta, segredo ou decisão dele.

Relatório: **um por rodada**, em `docs/sessoes/`. Nunca por PR.

**Nesta frente, o relatório vai para o repositório, não para o chat** (pedido do dono em
21/09/2026). O registro é o arquivo em `docs/sessoes/`. Não escreva ao dono entre as rodadas: ao
fim de tudo, uma mensagem só, de no máximo 5 linhas, com quantas rodadas houve, a mudança mais
importante e o que depende dele. A frente para quando um diagnóstico completo não achar nada cujo
ganho medido justifique o custo.

## Regras

1. Ler `docs/KICKOFF.md` (este arquivo) antes de qualquer coisa. Depois que existirem, `docs/SPEC.md` e `docs/TICKETS.md` têm precedência sobre ele.
2. Nunca inventar um endpoint, path ou formato de asset. Se não está na Parte B, testar primeiro e registrar o resultado em `docs/SPIKES.md`.
3. Nenhuma requisição automatizada à wiki (`wiki.leagueoflegends.com`) enquanto `WIKI_CONSENT_GRANTED` não estiver documentado em `docs/SPIKES.md` com data e evidência. O adaptador pode existir, mas desligado por flag.
4. Requisições ao ddragon e cdragon sempre com `User-Agent: lol-assets-indexer/{versão} (+https://github.com/NihonCodingg/lol-assets; contato do mantenedor)`, concorrência ≤ 4, backoff exponencial em 429/5xx.
5. PRs com no máximo ~500 linhas de lógica (exclui lockfiles, fixtures e snapshots). Se um ticket não cabe, dividir o ticket, não inflar o PR.
6. TDD nos módulos de lógica (indexador, fusão, conversão, busca). UI pode ter testes mais leves, mas o fluxo "buscar → baixar" tem teste e2e.
7. Nada de segredo no código. Variáveis de ambiente documentadas em `.env.example`.
8. Commits em Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Idioma do código e dos identificadores: inglês. Idioma de docs e commits: português.
9. Ao terminar qualquer tarefa, relatar em português: o que foi feito, o que foi assumido, o que ficou pendente, e qual o próximo passo sugerido. Esse relatório também é salvo em `docs/sessoes/AAAA-MM-DD-{tema}.md` e commitado.
10. Se algo na Parte B se mostrar errado na prática, corrigir `docs/PESQUISA` via PR com a evidência, não contornar em silêncio.
11. **Git:** remoto único é `https://github.com/NihonCodingg/lol-assets.git` (renomeado de `PROJETO-ASSETS-LOL` em 09/09/2026; o GitHub redireciona o `git`, mas a API responde 301 e para). `main` só recebe merge via PR, com a CI verde — e o merge é do agente, que segue a fila sem consultar o dono entre PRs ([ADR 0020](docs/adr/0020-o-merge-e-do-agente.md)). Trabalho em branches `feat/T-XX-descricao`, `docs/...`, `chore/...`. Etapas 1–4 (bootstrap, spikes, protótipo, spec) podem ir direto na `main` porque ainda não há código de produção; a partir dos tickets, só PR. Push ao final de cada bloco, sem exceção — trabalho não enviado é trabalho que não existe.
12. Decisões de arquitetura viram ADRs em `docs/adr/NNNN-titulo.md` (contexto, decisão, consequências). A Spec referencia os ADRs, não os repete.

## Onde as coisas ficam

| Caminho | Conteúdo |
|---|---|
| `docs/KICKOFF.md` | Processo (Parte 0), ideia (Parte A), pesquisa das fontes (Parte B) |
| `docs/SPIKES.md` | Números reais medidos nos spikes |
| `docs/SPEC.md` | Especificação (etapa 4) |
| `docs/TICKETS.md` | Tickets de execução (etapa 5) |
| `docs/adr/` | Decisões de arquitetura (regra 12) |
| `docs/sessoes/` | Relatório de cada sessão (regra 9) |
| `apps/web/` | Front-end Next.js |
| `apps/api/` | API FastAPI |
| `packages/indexer/` | Adaptadores, fusão, conversão e publicação |
| `packages/schema/` | Contrato do índice (JSON Schema + tipos TS + modelos Pydantic) |
| `docs/evidencias/spikes/` | JSONs brutos das medições (o `prototype/` foi apagado no T-01) |

## Comandos

```bash
pnpm install          # dependências JS/TS de todo o workspace
uv sync               # dependências Python de todo o workspace
pnpm -r lint          # eslint
pnpm -r typecheck     # tsc --noEmit
pnpm -r test          # vitest
uv run ruff check .   # lint Python
uv run ruff format --check .
uv run mypy .         # tipos Python
uv run pytest         # testes Python
```

## Etiqueta de rede (regra 4, obrigatória em qualquer adaptador)

- `User-Agent: lol-assets-indexer/{versão} (+https://github.com/NihonCodingg/lol-assets; contato do mantenedor)`
- Concorrência ≤ 4 requisições simultâneas por host.
- Backoff exponencial em 429 e 5xx.
- `wiki.leagueoflegends.com`: **proibido** enquanto `WIKI_CONSENT_GRANTED` não estiver documentado em `docs/SPIKES.md` com data e evidência (regra 3).
