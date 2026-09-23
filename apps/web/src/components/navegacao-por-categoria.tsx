"use client";

/**
 * Navegação por categoria (RF-08) — o caminho de quem não sabe o nome.
 *
 * A home é a busca e a grade de campeões ([ADR 0010]). Isto é o outro caminho:
 * escolher uma categoria e ir reduzindo. Quem quer "um ícone de bota" não tem
 * termo para digitar, e é essa pessoa que este componente atende.
 *
 * **Nada é carregado antes do clique.** A fatia entra sob demanda, memoizada
 * pelo `AssetsClient` — abrir Itens, sair e voltar não busca de novo. Enquanto
 * ninguém abre categoria nenhuma, a home segue com manifesto e catálogo, que é
 * a promessa do RNF-03.
 *
 * Os filtros saem das `tags` que o T-21 escreveu no índice, e **só delas**: a
 * lista de grupos é derivada da fatia carregada, não declarada aqui. Ver
 * `lib/categorias.ts` para o porquê de cada rótulo.
 *
 * ## A galeria (T-48)
 *
 * Uma barra só em cima: voltar, o filtro por texto e os grupos pequenos em
 * linha. Grupo grande — as 32 classes de item — fica atrás de "Mais filtros",
 * que abre embaixo da barra e não por cima da galeria: dá para marcar três
 * classes sem o painel fechar a cada clique. A bandeja do lote fica no pé, como
 * no painel do campeão.
 *
 * O `Escape` mora aqui, pela mesma razão do painel do campeão: com a ampliação
 * aberta, fecha a ampliação; senão, volta aos campeões.
 *
 * ## No telefone (T-49)
 *
 * Voltar e o filtro por texto dividem a primeira linha; os grupos, "Mais filtros"
 * e "Mostrar tudo" vão numa linha só que rola de lado — em linhas quebradas,
 * eles tomavam a altura que sobrava para a galeria. O "N de M" sai: o título da
 * galeria já diz quantos. E os avisos da Riot ficam no fim da área que rola.
 */

import { ArrowLeft, CloudOff, ListChecks, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Asset, AssetCategory, IndexShard } from "@lol-assets/schema";

import { Ampliacao } from "@/components/ampliacao";
import { AvisosNoFim } from "@/components/avisos-da-riot";
import { BarraDeLote } from "@/components/barra-de-lote";
import { PainelDeAsset } from "@/components/painel-de-asset";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Chip } from "@/components/ui/chip";
import { Estado } from "@/components/ui/estado";
import { assetUrl } from "@/lib/asset-file";
import {
  descreverFiltro,
  filtrar,
  filtrosPadrao,
  grupoDaTag,
  gruposDeFiltro,
  prepararLista,
  rotuloDaCategoria,
  separarGrupos,
  type GrupoDeFiltro,
} from "@/lib/categorias";
import { alternar, selecionados, tudoDo } from "@/lib/selecao";
import { focarConteudo } from "@/lib/foco";
import { useFecharComVoltar } from "@/lib/voltar";
import { ALVO_DE_TOQUE, cn, ROLA_SEM_CORTAR_O_TOQUE } from "@/lib/utils";

/**
 * Um asset escolhido na busca do topo (T-82): a categoria abre com o nome dele
 * no filtro de texto e sem o filtro padrão — senão um item fora da loja, como
 * os de Arena, sumiria atrás do "compráveis". `vez` muda a cada escolha, para
 * escolher o mesmo item duas vezes funcionar duas vezes.
 */
export interface PedidoDaBusca {
  readonly categoria: AssetCategory;
  readonly consulta: string;
  readonly vez: number;
}

export interface NavegacaoPorCategoriaProps {
  /**
   * A categoria aberta, decidida de fora.
   *
   * Os botões moram na barra lateral desde o **T-41**; este componente virou o
   * conteúdo. Antes ele era dono dos dois, e a lista de categorias acabava
   * embaixo de 173 cartões de campeão — para chegar em "Itens" era preciso
   * rolar a grade inteira.
   */
  readonly aberta: AssetCategory | null;
  readonly pedido?: PedidoDaBusca | null;
  readonly carregar: (category: AssetCategory) => Promise<IndexShard>;
  /** Fecha a categoria e volta para a grade de campeões. */
  readonly onFechar: () => void;
  readonly assetsBaseUrl?: string;
}

/** Referência estável: sem ela, todo `useMemo` a jusante recalcula por render. */
const SEM_ASSETS: readonly Asset[] = [];

const ID_DE_MAIS_FILTROS = "mais-filtros";

type Carga =
  | { fase: "vazia" }
  | { fase: "carregando" }
  | { fase: "erro"; motivo: string }
  | { fase: "pronta"; assets: readonly Asset[] };

export function NavegacaoPorCategoria({
  aberta,
  pedido = null,
  carregar,
  onFechar,
  assetsBaseUrl,
}: NavegacaoPorCategoriaProps) {
  const [carga, setCarga] = useState<Carga>({ fase: "vazia" });
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [consulta, setConsulta] = useState("");
  const [selecao, setSelecao] = useState<ReadonlySet<string>>(new Set());
  const [maisFiltrosAbertos, setMaisFiltrosAbertos] = useState(false);
  const [ampliado, setAmpliado] = useState<Asset | null>(null);
  // Voltar sai da categoria e volta aos campeões, não sai do site (T-70). Trocar
  // de uma categoria para outra não empilha: é a mesma camada.
  useFecharComVoltar(aberta !== null, onFechar);
  // Muda a cada "Tentar de novo": é o que faz o efeito de carga rodar outra vez.
  // O `AssetsClient` esquece a promessa que falhou, então a nova vai à rede.
  const [tentativa, setTentativa] = useState(0);

  /**
   * Carrega a fatia quando a categoria aberta muda.
   *
   * Efeito, e não manipulador de clique, porque quem clica agora é a barra
   * lateral: este componente descobre a mudança pela prop. O `cancelado` é o
   * de sempre — trocar de categoria duas vezes rápido não pode deixar a
   * resposta da primeira sobrescrever a da segunda.
   */
  useEffect(() => {
    if (aberta === null) {
      setCarga({ fase: "vazia" });
      return;
    }

    let cancelado = false;
    setConsulta("");
    setMarcadas(new Set());
    setSelecao(new Set());
    setMaisFiltrosAbertos(false);
    setAmpliado(null);
    setCarga({ fase: "carregando" });

    (async () => {
      try {
        const shard = await carregar(aberta);
        if (cancelado) return;
        // O arquivo de marcação (`_fpo`) saía aqui desde o T-48; desde o T-76 o
        // indexador não o põe mais no índice.
        const assets = shard.assets;
        // O filtro padrão depende das etiquetas que a fatia traz (§B.1.6 do
        // KICKOFF), então só dá para calculá-lo depois de ela chegar.
        setMarcadas(filtrosPadrao(aberta, gruposDeFiltro(assets)));
        setCarga({ fase: "pronta", assets });
      } catch (erro) {
        if (cancelado) return;
        setCarga({ fase: "erro", motivo: erro instanceof Error ? erro.message : String(erro) });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [aberta, carregar, tentativa]);

  // O pedido da busca vale quando a fatia da categoria dele está pronta — na
  // chegada dela, ou na hora, se a categoria já estava aberta.
  const pronto = carga.fase === "pronta";
  useEffect(() => {
    if (!pedido || pedido.categoria !== aberta || !pronto) return;
    setConsulta(pedido.consulta);
    setMarcadas(new Set());
  }, [pedido, aberta, pronto]);

  useEffect(() => {
    if (aberta === null) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      // Primeiro a ampliação. O Radix marca o evento como tratado — é assim que
      // ele deixa a tecla para nós —, então isto vem antes do `defaultPrevented`.
      if (ampliado) {
        setAmpliado(null);
        return;
      }
      if (evento.defaultPrevented) return;
      // No campo de filtro com texto, o `Escape` apaga o texto — é o que o
      // navegador faz num campo de busca —, e não tira a pessoa da categoria.
      const alvo = evento.target;
      if (alvo instanceof HTMLInputElement && alvo.type === "search" && alvo.value) return;
      onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberta, ampliado, onFechar]);

  const assets = carga.fase === "pronta" ? carga.assets : SEM_ASSETS;
  const grupos = useMemo(() => gruposDeFiltro(assets), [assets]);
  const { naBarra, maisFiltros } = useMemo(() => separarGrupos(grupos), [grupos]);
  const lista = useMemo(() => prepararLista(assets), [assets]);
  const filtrados = useMemo(() => filtrar(lista, marcadas, consulta), [lista, marcadas, consulta]);
  // O lote alcança o que o filtro deixou na tela — nunca a fatia inteira por
  // baixo dele. "Selecionar todos" com 5.042 escondidos seria uma armadilha.
  const noLote = useMemo(() => selecionados(filtrados, selecao), [filtrados, selecao]);

  // Quantos filtros marcados estão dentro de "Mais filtros": fechado, o botão
  // precisa dizer que tem alguma coisa ligada lá dentro.
  const escondidas = useMemo(() => {
    const chaves = new Set(maisFiltros.map((grupo) => grupo.chave));
    return [...marcadas].filter((tag) => chaves.has(grupoDaTag(tag))).length;
  }, [marcadas, maisFiltros]);

  /**
   * A categoria `item` abre filtrada (§B.1.6), e na produção isso aparecia como
   * "254 de 868" sem dizer por quê — 71% do catálogo fora da tela sem
   * explicação. Enquanto ninguém mexeu nos filtros, a barra diz qual é o padrão
   * e quantos ele esconde.
   */
  const padrao = useMemo(
    () => (aberta ? filtrosPadrao(aberta, grupos) : new Set<string>()),
    [aberta, grupos],
  );
  const noPadrao =
    padrao.size > 0 &&
    padrao.size === marcadas.size &&
    [...padrao].every((tag) => marcadas.has(tag)) &&
    !consulta.trim();

  // Estável, porque vai para cada tile da galeria, que é memorizado.
  const alternarNoLote = useCallback((id: string) => setSelecao((antes) => alternar(antes, id)), []);

  const alternarFiltro = useCallback((tag: string) => {
    setMarcadas((antes) => {
      const proximo = new Set(antes);
      if (!proximo.delete(tag)) proximo.add(tag);
      return proximo;
    });
  }, []);

  if (!aberta) return <section aria-label="Categorias" className="flex min-h-0 flex-1 flex-col" />;

  const rotulo = rotuloDaCategoria(aberta);
  const pronta = carga.fase === "pronta";


  return (
    <section aria-label="Categorias" className="flex min-h-0 flex-1 flex-col baixa:min-h-auto">
      <div className="flex-none border-b border-linha bg-superficie">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2">
          <Botao
            variante="fantasma"
            tamanho="md"
            className="-ml-1.5 px-1.5 max-md:min-h-controle-xl"
            onClick={() => {
              onFechar();
              // O botão some com a categoria: o foco vai para os campeões que
              // entram no lugar, e não para o topo da página (T-71).
              requestAnimationFrame(focarConteudo);
            }}
          >
            <ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />
            Voltar aos campeões
          </Botao>

          {pronta && (
            <>
              <label className="relative flex items-center max-md:min-w-0 max-md:flex-1">
                <span className="sr-only">Filtrar por texto</span>
                <Search
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-2.5 size-3.5 text-texto-suave"
                />
                <Campo
                  type="search"
                  data-anel="fino"
                  value={consulta}
                  placeholder="Nome ou arquivo"
                  onChange={(evento) => setConsulta(evento.target.value)}
                  className="h-controle-md w-52 pr-2 pl-8 text-12 max-md:h-controle-xl max-md:w-full max-md:text-13"
                />
              </label>

              {/* No telefone, uma linha que rola de lado; no computador este
                  `div` some (`contents`) e os filtros quebram na barra. */}
              {(naBarra.length > 0 || maisFiltros.length > 0 || marcadas.size > 0) && (
                <div
                  className={cn(
                    "flex items-center gap-x-3 max-md:-mx-3.5 max-md:w-[calc(100%+1.75rem)] max-md:overflow-x-auto max-md:px-3.5 max-md:[scrollbar-width:none] md:contents",
                    ROLA_SEM_CORTAR_O_TOQUE,
                  )}
                >
                  {naBarra.map((grupo) => (
                    <GrupoDeChips
                      key={grupo.chave}
                      grupo={grupo}
                      marcadas={marcadas}
                      onAlternar={alternarFiltro}
                    />
                  ))}

                  {maisFiltros.length > 0 && (
                    <Botao
                      variante={maisFiltrosAbertos ? "contorno" : "fantasma"}
                      tamanho="md"
                      aria-expanded={maisFiltrosAbertos}
                      aria-controls={ID_DE_MAIS_FILTROS}
                      className={ALVO_DE_TOQUE}
                      onClick={() => setMaisFiltrosAbertos((aberto) => !aberto)}
                    >
                      <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                      Mais filtros
                      {escondidas > 0 && (
                        <span className="rounded-quadro bg-acento-suave px-1 tabular-nums text-11 text-acento">
                          {escondidas}
                        </span>
                      )}
                    </Botao>
                  )}

                  {/* §B.1.6: a categoria `item` abre filtrada, e isto é a saída. */}
                  {marcadas.size > 0 && (
                    <Botao
                      variante="fantasma"
                      tamanho="md"
                      className={ALVO_DE_TOQUE}
                      onClick={() => setMarcadas(new Set())}
                    >
                      Mostrar tudo
                    </Botao>
                  )}
                </div>
              )}

              <p className="ml-auto hidden tabular-nums text-11 tabular-nums text-texto-suave md:block">
                {filtrados.length} de {assets.length}
              </p>

              {noPadrao && assets.length > filtrados.length && (
                <p className="w-full text-11 leading-cartao text-texto-suave">
                  Esta categoria abre filtrada por {descreverFiltro(marcadas, "", grupos).join(" e ")}
                  . {assets.length - filtrados.length} ficam de fora até você mostrar tudo.
                </p>
              )}
            </>
          )}
        </div>

        {pronta && maisFiltrosAbertos && maisFiltros.length > 0 && (
          <div
            id={ID_DE_MAIS_FILTROS}
            // No telefone são dez linhas de classes: com altura máxima, a galeria
            // continua aparecendo embaixo.
            className="flex flex-col gap-2 border-t border-linha px-3.5 pt-2 pb-2.5 max-md:max-h-48 max-md:overflow-y-auto"
          >
            {maisFiltros.map((grupo) => (
              <GrupoDeChips
                key={grupo.chave}
                grupo={grupo}
                marcadas={marcadas}
                onAlternar={alternarFiltro}
              />
            ))}
          </div>
        )}
      </div>

      {(carga.fase !== "pronta" || filtrados.length === 0) && (
        // Carregando, erro e vazio: o que houver, e os avisos embaixo, na mesma
        // área que rola.
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto baixa:overflow-visible">
          {carga.fase === "carregando" && <Carregando rotulo={rotulo} />}
          {/* Centrado na área que sobra: colado no topo, com 700 px de vazio
              embaixo, o aviso parecia o começo de uma lista que não veio. */}
          <div className="flex flex-1 flex-col justify-center">
          {carga.fase === "erro" && (
            <Estado
              role="alert"
              icone={CloudOff}
              titulo={`Não deu para carregar ${rotulo}`}
              detalhe={carga.motivo}
              acao={<Botao onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Botao>}
            >
              O índice desta categoria não chegou. Confira a conexão e tente de novo.
            </Estado>
          )}
          {pronta && (
            <Vazio
              descricao={descreverFiltro(marcadas, consulta, grupos)}
              onLimpar={() => {
                setConsulta("");
                setMarcadas(new Set());
              }}
            />
          )}
          </div>
          <AvisosNoFim className="mt-auto" />
        </div>
      )}

      {pronta && filtrados.length > 0 && (
        <>
          <PainelDeAsset
            titulo={rotulo}
            assets={filtrados}
            assetsBaseUrl={assetsBaseUrl}
            onClose={onFechar}
            fecharComEsc={false}
            selecao={selecao}
            onAlternar={alternarNoLote}
            onAmpliar={setAmpliado}
            fim={<AvisosNoFim />}
            acoes={
              <Botao
                variante="fantasma"
                tamanho="md"
                className={ALVO_DE_TOQUE}
                onClick={() => setSelecao(tudoDo(filtrados, true))}
              >
                <ListChecks aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                Selecionar os {filtrados.length} filtrados
              </Botao>
            }
          />

          {/* No pé, como no painel do campeão: com 40 selecionados, o botão
              de baixar não pode estar a uma rolagem de distância. */}
          <BarraDeLote
            assets={noLote}
            rotulo={rotulo}
            assetsBaseUrl={assetsBaseUrl}
            onLimpar={() => setSelecao(new Set())}
          />
        </>
      )}

      {ampliado && (
        <Ampliacao
          asset={ampliado}
          url={assetUrl(ampliado, assetsBaseUrl)}
          onFechar={() => setAmpliado(null)}
        />
      )}
    </section>
  );
}

/** Um grupo de filtro: o nome do grupo e uma opção por etiqueta, com a contagem. */
function GrupoDeChips({
  grupo,
  marcadas,
  onAlternar,
}: {
  grupo: GrupoDeFiltro;
  marcadas: ReadonlySet<string>;
  onAlternar: (tag: string) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-none flex-wrap items-center gap-1.5 max-md:flex-nowrap">
      <legend className="float-left mr-1 tabular-nums text-11 text-texto-suave">
        {grupo.rotulo}
      </legend>
      {grupo.opcoes.map((opcao) => (
        <Chip key={opcao.tag} marcado={marcadas.has(opcao.tag)} onAlternar={() => onAlternar(opcao.tag)}>
          {opcao.rotulo} <span className="ml-1 tabular-nums text-11">({opcao.total})</span>
        </Chip>
      ))}
    </fieldset>
  );
}

/** A forma da galeria enquanto a fatia não chega, e a frase para quem não vê. */
function Carregando({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden baixa:min-h-dvh">
      <p className="px-3.5 py-2 text-12 text-texto-suave">Carregando {rotulo}…</p>
      {/* A forma do que vem: a arte, e a linha do nome embaixo dela (T-56). Um
          bloco liso não dizia que ali vinha uma galeria. */}
      <div
        aria-hidden="true"
        className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2 px-3.5"
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulsar flex-col overflow-hidden rounded-quadro border border-linha bg-superficie-alta"
            style={{ animationDelay: `${(i % 6) * 0.06}s` }}
          >
            <div className="h-24 bg-superficie-alta" />
            <div className="flex h-10 items-center px-2">
              <div className="h-2.5 w-3/4 rounded-quadro bg-superficie-alta" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Critério 4: o vazio diz **o que** foi filtrado, não só que deu zero. E ensina a
 * sair dele (T-50): a frase do que fazer, e o botão que limpa tudo de uma vez.
 */
function Vazio({ descricao, onLimpar }: { descricao: readonly string[]; onLimpar: () => void }) {
  return (
    <Estado
      role="status"
      icone={SearchX}
      titulo="Nenhum asset com esses filtros"
      acao={<Botao onClick={onLimpar}>Limpar filtros</Botao>}
    >
      <p>Tente outro nome, ou desmarque um dos filtros.</p>
      {descricao.length > 0 && (
        <ul
          aria-label="Filtro aplicado"
          className="mt-2.5 flex flex-wrap justify-center gap-1.5 tabular-nums text-11 text-texto-suave"
        >
          {descricao.map((parte) => (
            <li key={parte} className="rounded-controle border border-linha-forte px-2 py-0.75">
              {parte}
            </li>
          ))}
        </ul>
      )}
    </Estado>
  );
}
