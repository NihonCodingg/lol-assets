# ADR 0022 — O front-end vira frente contínua

- **Status:** ✅ aceito (18/09/2026)
- **Data:** 2026-09-18
- **Decidido por:** o dono
- **Emenda:** o [ADR 0021](0021-o-projeto-entra-em-manutencao.md), que punha o projeto inteiro em
  manutenção. O back-end continua lá; o front sai.
- **Respeita:** [0020](0020-o-merge-e-do-agente.md) (o merge é do agente, com a CI verde),
  [0010](0010-navegacao-por-campeao-busca-por-skin.md), [0001](0001-formato-de-entrega-dos-assets.md)
  e [0011](0011-virtualizacao-so-onde-se-paga.md), que esta frente não toca

## Contexto

O ADR 0021 pôs o projeto em manutenção em 17/09: conserta-se o que quebra, não se abre trabalho
novo. No dia seguinte o dono abriu uma exceção pontual para melhorar o design, e ela virou a
**Onda 8** — seis tickets, medidos antes e depois no site no ar
([relatório](../sessoes/2026-09-18-a-onda-8-a-arte-na-frente.md)).

O que a onda mostrou é que no front havia trabalho de sobra que **não** era gosto: a largura do
tile da galeria não vinha da imagem, vinha dos botões; as ações cobriam a arte em tela de toque;
532 wards apareciam em pares de nome igual; a categoria `item` escondia 614 assets sem dizer por
quê. Tudo isso era mensurável, e a correção mudou números — de 13% para 27% de arte no tile, de 6
para 10 colunas, de 30 para 50 tiles na tela.

O back-end é o oposto: indexação, contrato, publicação e infraestrutura estão estáveis há
semanas, rodam sozinhos e só aparecem quando quebram. Manter os dois na mesma velocidade custa
caro dos dois lados — trava o front e inventa trabalho no back.

## Decisão

O projeto passa a ter **duas velocidades**.

| | Regime | O que isso significa |
|---|---|---|
| Indexador, contrato, publicação, CI, infraestrutura | **Manutenção** (ADR 0021) | Conserta-se o que quebra. Nada de ticket novo. Oportunidade vira ideia anotada |
| Interface: UI, UX, acessibilidade e **desempenho percebido** | **Frente contínua** | O agente diagnostica, prioriza, abre ticket, executa, mergeia e confere no ar — sozinho |

### Como a frente trabalha

1. **Diagnóstico medido antes.** Nenhum ticket de interface começa sem número de partida, tirado
   do site no ar.
2. **Antes e depois no relatório.** O relatório da frente traz as duas medições, com o mesmo
   método.
3. **Atacar a causa, não o sintoma.** A lição do T-53: a largura do tile vinha dos botões. Se a
   correção não muda a causa, o número volta.
4. **A skill `frontend-design` é leitura obrigatória** antes de desenhar qualquer coisa de
   interface.

### O que define "bom" aqui — critérios, não gosto

- Os **2 cliques** da §A.4 continuam valendo (RF-15).
- **A arte domina o tile.** Cromo crescendo é regressão.
- **Teclado completo:** foco visível, atalhos funcionando, setas onde houver grade.
- **O axe continua verde e fica mais rigoroso**, nunca menos.
- **Desempenho percebido, medido:** tempo até o primeiro tile pintado, tempo até a prévia abrir,
  e **zero salto de layout**. Mede-se antes de otimizar, e o número vai para o relatório.

### Desempenho é restrição, não meta separada

Nada de animação pesada, biblioteca nova sem justificativa medida, ou efeito que custe quadro. A
virtualização do [ADR 0011](0011-virtualizacao-so-onde-se-paga.md) continua obrigatória. **Se uma
melhoria visual custar desempenho, ela não entra** — descarta-se, e o porquê fica escrito.

### O que a frente não toca

- **Os tokens são a fonte de verdade** ([TOKENS.md](../design/TOKENS.md)): mudou token, muda o
  TOKENS.md primeiro, com justificativa.
- **shadcn/ui sobre Radix**, e o **cmdk com o filtro embutido desligado** ([ADR 0011]).
- **[ADR 0010]** (navegar por campeão, buscar por skin) e **[ADR 0001]** (original e PNG, ficha
  antes do download) ficam intocados.
- **§B.5.1 do KICKOFF:** o produto não imita o visual do cliente do jogo.
- **Melhoria de interface não muda o que o produto faz.** Funcionalidade nova vai para "Ideias não
  executadas", no fim do [TICKETS.md](../TICKETS.md).

### Quando o agente para

- Precisa de conta, segredo ou decisão que só o dono pode tomar.
- A mudança exigiria alterar o que o produto promete.
- CI vermelha que ele não resolva.

Fora disso, não há pergunta de prioridade nem lista para aprovar: a ordem é do agente. O
relatório é **um por frente concluída**, em `docs/sessoes/`, e não há relatório por PR.

## Alternativas consideradas

- **Manter tudo em manutenção e abrir exceções.** Foi o que aconteceu em 18/09; a exceção durou
  um dia e produziu seis tickets. Repetir isso a cada onda é criar cerimônia para uma decisão que
  o dono já tomou duas vezes.
- **Tirar o projeto inteiro da manutenção.** Devolveria ao back-end o risco que o ADR 0021 veio
  cortar: inventar trabalho onde nada quebra.
- **Uma frente de front com lista aprovada por PR.** É o que o [ADR 0020](0020-o-merge-e-do-agente.md)
  já tinha revogado por virar gargalo.

## Consequências

**Boas**

- O front anda no ritmo do que a medição mostra, sem esperar pergunta.
- O back-end continua quieto, que é onde ele é bom.

**Custos aceitos**

- Muda mais coisa na tela entre uma sessão do dono e outra. O relatório por frente, com antes e
  depois medidos, é o que mantém isso auditável.
- O julgamento de "isto é interface" contra "isto é produto" fica com o agente. Na dúvida, é
  ideia anotada — não ticket.

## Como voltar atrás

O dono diz que o front volta à manutenção, e este ADR é revogado por outro. O modo vive no
[`CLAUDE.md`](../../CLAUDE.md), que é o que toda sessão lê antes de começar.
