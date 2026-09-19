# ADRs — decisões de arquitetura

Regra 12 do [CLAUDE.md](../../CLAUDE.md): toda decisão estrutural vira um registro aqui,
com contexto, decisão e consequências. A Spec referencia; não repete.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-formato-de-entrega-dos-assets.md) | Melhor fonte disponível, sem re-encode; PNG gerado no cliente | aceito — revoga "PNG sempre" |
| [0002](0002-nomes-canonicos-de-corte-de-splash.md) | `splash_centered` e `splash_wide` como nomes canônicos | aceito |
| [0003](0003-nome-publico-do-produto.md) | Nome público: **Biblioteca de Assets**; interno permanece | ✅ aceito — nome definido em 10/09 |
| [0004](0004-consentimento-da-wiki-e-teto-de-resolucao.md) | Consentimento da Weird Gloop vira prioridade | aceito — ação humana pendente |
| [0005](0005-arquitetura-estatica-custo-zero.md) | Arquitetura estática por padrão, custo de operação zero | ⚠️ emendado pelo 0012 |
| [0006](0006-api-como-componente-opcional.md) | API FastAPI fora do caminho crítico | aceito |
| [0007](0007-politica-de-versoes-e-orcamento.md) | Assets só da versão atual; orçamento de 10 GB | ⚠️ largamente emendado pelo 0012 |
| [0008](0008-catalogo-de-skins-e-seletor.md) | O catálogo é de skins; seletor de skin na v1 | ⚠️ emendado pelo 0010 |
| [0009](0009-apelidos-de-busca-mantidos-a-mao.md) | Apelidos em JSON estático mantido à mão | aceito |
| [0010](0010-navegacao-por-campeao-busca-por-skin.md) | Navegação por campeão, busca por skin; catálogo vira documento próprio | aceito — emenda o 0008 |
| [0011](0011-base-de-componentes-do-front.md) | shadcn/ui sobre Radix, TanStack Virtual, cmdk; Fuse.js fora | aceito |
| [0012](0012-onde-guardar-os-assets.md) | **Sem storage**: o índice aponta para as URLs das fontes | ✅ aceito — emenda 0005 e 0007; o `sha256` como detector, emendado pelo 0019 |
| [0013](0013-uma-versao-por-vez-no-indice.md) | **Uma versão por vez** no índice; histórico sai da v1 | ✅ aceito — emenda 0007 |
| [0014](0014-onde-vive-o-indice-gerado.md) | Índice gerado vive no `main`; crescimento medido | ✅ aceito |
| [0015](0015-orcamento-do-indice-depois-da-segunda-fonte.md) | Teto do índice vai a **24 MiB**; emotes, wards e chromas cabem | ✅ aceito — emenda 0007 e 0013 |
| [0016](0016-publicacao-na-vercel.md) | **Publicação na Vercel**: pnpm fixado, manifesto sempre revalida, `noindex` por padrão | ✅ aceito — emenda a §9 da Spec |
| [0017](0017-icones-lucide.md) | **Ícones: `lucide-react`**, sempre decorativos; o nome é do controle | ✅ aceito — emenda 0011 |
| [0018](0018-aviso-mede-a-ultima-verificacao.md) | **O aviso de índice velho mede a última verificação**: `checkedAt` no manifesto, carimbado no máximo 1×/dia | ✅ aceito — contrato 1.3.0; emenda a §11 da Spec |
| [0019](0019-o-sha256-do-cdragon-nao-confere-o-download.md) | **O `sha256` do cdragon não confere o download**: a borda recomprime (Cloudflare Polish); `isByteStable` diz em que fonte ele confere | ✅ aceito — emenda o RF-10, o RNF-13 e uma consequência do 0012; o aviso na tela saiu em 16/09 (T-50b) |
| [0020](0020-o-merge-e-do-agente.md) | **O merge é do agente**: com a CI verde ele mergeia e segue a fila; só para por decisão de produto, contradição com Spec ou ADR, segredo/conta ou CI vermelha | ✅ aceito — revoga a decisão do dono de 15/09/2026 |
| [0021](0021-o-projeto-entra-em-manutencao.md) | **O projeto entra em manutenção**: conserta o que quebra, não abre funcionalidade nova, escreve ao dono só em quatro casos | ✅ aceito — fecha a fase de construção |
| [0022](0022-o-front-end-vira-frente-continua.md) | **O front-end vira frente contínua**: o back fica em manutenção; UI, UX, acessibilidade e desempenho percebido viram trabalho ativo, com diagnóstico medido antes e depois | ✅ aceito — emenda o 0021 |
