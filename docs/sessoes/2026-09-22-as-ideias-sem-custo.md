# Sessão 22/09/2026 — as ideias sem custo

O dono abriu escopo para as ideias de "Ideias não executadas" que não exigem custo nem
consentimento externo: setas na galeria virtualizada, filtro das sombras das wards, `_fpo` fora do
índice e aviso de patch mais novo que o índice. Ficaram de fora, por decisão dele: imagens no
tamanho da tela (custo, [ADR 0012](../adr/0012-onde-guardar-os-assets.md)) e arte da wiki
(consentimento que ele ainda não pediu). **Terminadas as quatro, o projeto volta à manutenção.**

## 1. Setas na galeria virtualizada — já estava feito

Entrou no **T-63**, em 21/09, durante a primeira rodada da frente de front-end, e a linha saiu da
tabela de ideias naquele PR. Conferido na produção em 22/09, na galeria de 5.042 ícones de perfil:

| | |
|---|---|
| `→` a partir do primeiro tile | vai para o 2 |
| `↓` | desce uma linha (7 colunas) |
| `End` | chega ao 5.042, que não estava montado |
| `Home` | volta ao 1 |
| Tabs para atravessar a galeria | 4 |

Nada a fazer.

## 2. O filtro das sombras das wards (T-75)

**Antes, na produção (1440×900):** a galeria de wards tinha 532 tiles e **41,1 telas** de rolagem,
sem filtro nenhum — as wards não têm etiqueta no índice. Metade de cada tela era sombra (10 de 20
tiles na primeira).

São 266 pares: cada skin de ward tem a arte e a sombra que ela projeta no chão, com o mesmo nome.
O que as separa é o arquivo (`wardhero_1.png` e `wardheroshadow_1.png`), que o indexador já grava
no `refId` como `1` e `1-shadow`.

**O que mudou:** o front deriva a etiqueta de cada ward a partir do `refId`. A barra ganha o grupo
**Imagem**, com os chips **Arte** e **Sombra** e as contagens, no mesmo mecanismo de todos os
filtros. A categoria continua abrindo sem filtro.

| | Antes | Depois (com "Arte") |
|---|---|---|
| Telas de rolagem | 41,1 | **20,7** |
| Tiles | 532 | 266 de 532 |
| Sombras na primeira tela | 10 de 20 | **0** |

## 3. O `_fpo` fora do índice (T-76)

**Antes:** havia **1** arquivo de marcação em todo o índice publicado, o `emote_icon:0`
(`emote_fpo_inventory.png`) — o "Emote 0", um quadrado cinza com "FPO" escrito. Desde o T-48 o
front o escondia da galeria, mas ele continuava na fatia de emotes (2.358 assets), na API e em
qualquer outro consumidor do índice.

**O que mudou:** os catálogos simples do cdragon (emotes e wards) descartam arquivo cujo nome tem
`fpo` como palavra, e o anotam à parte. A geração do indexador subiu para 5, e o índice foi
gerado pelo workflow rodado no branch do PR. O filtro do front saiu: ele era o remendo até o dado
chegar limpo, e duas fontes de verdade para a mesma regra são uma a mais.

| | Antes | Depois |
|---|---|---|
| Arquivos de marcação no índice | 1 | **0** |
| Fatia de emotes | 2.358 | **2.357** |
| Filtro equivalente no front | existia | saiu |

## 4. O aviso de patch mais novo que o índice (T-77)

**Antes:** o site só avisava se a indexação **parou** (72 h sem verificação, T-31/T-51). Entre o
lançamento de um patch e a próxima indexação — o workflow roda a cada 6 h e leva ~40 min — o site
mostrava o patch anterior sem dizer nada.

O [ADR 0018](../adr/0018-aviso-mede-a-ultima-verificacao.md) tinha anotado a ideia com três
objeções. As três foram tratadas, e o ADR está emendado:

| Objeção | Como ficou |
|---|---|
| Uma requisição ao ddragon em toda visita | A lista (`versions.json`, 5 KB, CORS aberto) é pedida **depois de a página assentar** e fica guardada **6 h** no navegador — o intervalo da própria indexação |
| Acenderia a cada patch, nas horas normais | O texto diz isso: "a atualização automática traz o patch novo em algumas horas". É `role="status"`, e dá para dispensar até o próximo patch |
| Mede outra coisa | São dois avisos. Com o de índice velho aceso, este fica quieto |

O aviso é **fixo no canto**, e não uma faixa no topo: ele chega depois da página, e uma faixa
empurraria a grade — o salto de layout da chegada é zero desde o T-59. Medido no e2e, com o aviso
aberto: salto 0 e axe sem violação.

**No ar, depois do merge:**

| | Resultado |
|---|---|
| Hoje (índice no patch mais novo, 16.18.1) | nenhum aviso |
| Pedidos ao `versions.json` numa visita | 1 |
| Pedidos ao recarregar, dentro das 6 h | 0 |
| Com um patch novo simulado (16.99.1) | "Já saiu o patch 16.99.1. As artes aqui ainda são do 16.18.1; a atualização automática traz o patch novo em algumas horas." |

A chegada, antes e depois (produção, cache quente, 3 rodadas cada):

| | Antes | Depois |
|---|---|---|
| CLS, computador e telefone | 0 e 0 | **0 e 0** |
| Primeiro tile, computador | 403–439 ms | 417–448 ms |
| LCP, computador | 784–812 ms | 764–832 ms |

## Conferências no ar

- `conferir-publicacao.mjs`: tudo certo, com as 173 fatias de campeão imutáveis.
- Suíte: 537 testes unitários e 84 e2e.

## Achados de processo

- **O script de merge decidia com resultado velho.** Depois do T-73 (#101 mesclado com a CI
  pendente), ele passou a exigir os três checks presentes; no T-77 apareceu o outro lado do mesmo
  problema: `gh pr checks` devolvia o resultado da execução **anterior** enquanto a nova não
  registrava. Agora ele consulta os checks **pelo SHA da cabeça**, pela API, e recusa mesclar com
  qualquer check pendente. Na primeira versão dessa correção, o nome "Python (ruff, mypy, pytest)"
  nunca casava — os parênteses escapados viravam grupo no `grep` —, e o script esperava para
  sempre sem mesclar. A comparação passou a ser pelo nome exato. Nenhum PR foi mesclado com check
  vermelho ou pendente nesta sessão.
- **Um guarda de arquitetura precisou de ajuste.** O teste que impede o front de chamar a API
  opcional (ADR 0006) varre o código por `/versions`, e pegou a URL do ddragon
  (`/api/versions.json`). A rota da API é `/versions`, sem extensão, e continua proibida.
- **O GitHub não sincronizou a cabeça do PR** depois de um push: a CI não rodou, e a API do PR
  continuou apontando para o commit anterior por vários minutos. Um commit vazio destravou.

## O que fica

O projeto volta à **manutenção** ([ADR 0021](../adr/0021-o-projeto-entra-em-manutencao.md)), sem
escopo novo por conta própria. Em "Ideias não executadas" ficam as que dependem do dono: imagens no
tamanho da tela (custo), link direto para campeão ou categoria, Dependabot, remover a API FastAPI
e comparar o índice com o `versions.json` — esta última **sai da lista**, porque virou o T-77.

Em paralelo, o dono entregou o [Plano de Design](../design/PLANO-DE-DESIGN.md) do redesenho
visual. Ele está salvo como fonte de verdade e **ainda não em execução**: começa quando ele mandar
o comando das Fases 1 a 11, e a rodada de linha de base com pessoas (§9 do plano) é dele.
