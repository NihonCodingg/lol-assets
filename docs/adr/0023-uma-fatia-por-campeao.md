# ADR 0023 — Uma fatia por campeão

- **Status:** ✅ aceito (22/09/2026)
- **Data:** 2026-09-22
- **Decidido por:** o dono, que autorizou a exceção. O desenho é do agente.
- **Emenda:** o [ADR 0010](0010-navegacao-por-campeao-busca-por-skin.md) só no endereço das artes
  de campeão (a navegação e a busca não mudam), e a §6.1 da Spec (ordem de carga e
  fatiamento)
- **Exceção ao:** [ADR 0021](0021-o-projeto-entra-em-manutencao.md). O indexador sai da
  manutenção só para isto e volta a ela quando isto estiver no ar. **Não é precedente.**

## Contexto

Desde o T-10 as artes de campeão moram numa fatia só, `index-champion-{hash}.json`, com os 173
campeões juntos. Medido na produção em 22/09/2026:

- a fatia tem **13 MB** de JSON e **1,3 MB** comprimida (18.397 assets);
- abrir **um** campeão baixa a fatia inteira. Em 3G (1,6 Mbps, 150 ms), do toque até a primeira
  arte do painel, levava **13,4 s** para a Ahri e **18,4 s** para o Jax (mediana de 3, cache frio);
- o front usa 1 campeão dos 173 baixados: para o Jax, 115 assets de 18.397.

A frente de front-end (T-61, T-72) já tinha tirado desse caminho o que o front podia tirar:
adiantar a fatia na intenção e pintar o painel antes das artes. O que sobra é o tamanho do
arquivo, e o tamanho vem do indexador.

## Decisão

1. **A categoria `champion` vira uma fatia por campeão:** `index-champion-{championKey}-{hash}.json`,
   no mesmo formato de fatia de sempre (`IndexShard`), com um campo novo, `championKey`, que diz
   de quem ela é. As outras categorias não mudam.
2. **Quem aponta para a fatia de cada campeão é o catálogo:** `champions[].shard = {url, assets,
   bytes}`. É o documento que o front já tem na mão quando alguém toca num campeão, então abrir
   um painel custa **um** pedido, direto na fatia certa. O `sha256` fica de fora dessas
   referências: são 173 hashes de 64 caracteres que não comprimem, e o catálogo é o documento
   pesado da abertura (RNF-03). O hash curto continua no nome do arquivo, e o manifesto continua
   com o `sha256` das outras fatias.
3. **O manifesto deixa de listar `champion` em `shards[]`.** A barra lateral não lista campeões
   por ali (a contagem vem do catálogo), e ninguém mais busca a fatia única.
4. **A ordem de publicação passa a ser** assets → fatias (as de campeão incluídas) → catálogo →
   manifesto. O catálogo carrega os nomes das fatias de campeão, e por isso o hash dele depende
   delas. O `Publisher` recusa publicar um catálogo que aponte para fatia não publicada, como já
   recusava o manifesto.
5. **Contrato 2.0.0.** É uma mudança que quebra consumidores (a fatia única some), então sobe a
   versão maior. A assinatura de geração do indexador sobe para 4, e a próxima execução agendada
   reindexa mesmo sem patch novo.
6. **O front, a API e as conferências** passam a ler a fatia do campeão pelo catálogo: o
   `AssetsClient` ganha `loadChampion`, memorizado por campeão; a API serve os assets de campeão
   pela mesma via; o `conferir-publicacao` confere também as 173 fatias.
7. **Front e índice entram juntos.** O PR leva o código, e o índice novo é gerado pelo próprio
   workflow de indexação, rodado no branch do PR. Um merge publica os dois, sem janela em que o
   site novo lê índice velho ou o contrário, e sem código de compatibilidade com o 1.x.

## Consequências

- Abrir um campeão baixa só a fatia dele: dezenas de KB em vez de 1,3 MB.
- O catálogo cresce: 173 referências de cerca de 80 bytes cada. Isso fica medido no relatório,
  contra o limite de 150 KB comprimidos do RNF-03.
- São 173 arquivos a mais em `apps/web/public/indice`. A varredura de órfãos do ADR 0013 já apaga
  pelo prefixo `index-`, então as fatias de um patch velho somem como sempre.
- "Tudo de Jax" (RF-18) não muda: ele sempre usou só os assets de um campeão.
- **O indexador volta à manutenção do ADR 0021** assim que isto estiver no ar. Esta exceção foi
  autorizada pelo dono para esta mudança e para a conferência dos nomes em inglês (22/09/2026),
  e não abre caminho para outras.
