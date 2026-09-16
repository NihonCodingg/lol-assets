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
 */

import { ArrowLeft, ListChecks, Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Asset, AssetCategory, IndexShard } from "@lol-assets/schema";

import { Ampliacao } from "@/components/ampliacao";
import { BarraDeLote } from "@/components/barra-de-lote";
import { PainelDeAsset } from "@/components/painel-de-asset";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Chip } from "@/components/ui/chip";
import { assetUrl } from "@/lib/asset-file";
import {
  descreverFiltro,
  ehMarcacao,
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
        // Marcação não é arte: sai antes de contar, filtrar ou selecionar.
        const assets = shard.assets.filter((asset) => !ehMarcacao(asset));
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
  }, [aberta, carregar]);

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
    <section aria-label="Categorias" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-borda bg-fundo-barra">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2">
          <Botao variante="fantasma" tamanho="md" className="-ml-1.5 px-1.5" onClick={onFechar}>
            <ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />
            Voltar aos campeões
          </Botao>

          {pronta && (
            <>
              <label className="relative flex items-center">
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
                  className="h-controle-md w-52 pr-2 pl-8 text-12"
                />
              </label>

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
                  onClick={() => setMaisFiltrosAbertos((aberto) => !aberto)}
                >
                  <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                  Mais filtros
                  {escondidas > 0 && (
                    <span className="rounded-min bg-acento-suave px-1 font-mono text-10 text-acento-mais-claro">
                      {escondidas}
                    </span>
                  )}
                </Botao>
              )}

              {/* §B.1.6: a categoria `item` abre filtrada, e isto é a saída. */}
              {marcadas.size > 0 && (
                <Botao variante="fantasma" tamanho="md" onClick={() => setMarcadas(new Set())}>
                  Mostrar tudo
                </Botao>
              )}

              <p className="ml-auto font-mono text-11 tabular-nums text-texto-suave">
                {filtrados.length} de {assets.length}
              </p>
            </>
          )}
        </div>

        {pronta && maisFiltrosAbertos && maisFiltros.length > 0 && (
          <div
            id={ID_DE_MAIS_FILTROS}
            className="flex flex-col gap-2 border-t border-borda px-3.5 pt-2 pb-2.5"
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

      {carga.fase === "carregando" && <Carregando rotulo={rotulo} />}
      {carga.fase === "erro" && (
        <p role="alert" className="px-3.5 py-3 text-13 text-acento-mais-claro">
          Falhou ao carregar: {carga.motivo}
        </p>
      )}

      {pronta &&
        (filtrados.length === 0 ? (
          <Vazio descricao={descreverFiltro(marcadas, consulta, grupos)} />
        ) : (
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
              acoes={
                <Botao
                  variante="fantasma"
                  tamanho="md"
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
        ))}

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
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="float-left mr-1 font-mono text-10 uppercase tracking-rotulo text-texto-suave">
        {grupo.rotulo}
      </legend>
      {grupo.opcoes.map((opcao) => (
        <Chip key={opcao.tag} marcado={marcadas.has(opcao.tag)} onAlternar={() => onAlternar(opcao.tag)}>
          {opcao.rotulo} <span className="ml-1 font-mono text-10">({opcao.total})</span>
        </Chip>
      ))}
    </fieldset>
  );
}

/** A forma da galeria enquanto a fatia não chega, e a frase para quem não vê. */
function Carregando({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="px-3.5 py-2 text-12 text-texto-suave">carregando {rotulo}…</p>
      <div
        aria-hidden="true"
        className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-3 px-3.5"
      >
        {Array.from({ length: 18 }, (_, i) => (
          <div
            key={i}
            className="h-42 animate-pulsar rounded-medio bg-campo"
            style={{ animationDelay: `${(i % 6) * 0.06}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Critério 4: o vazio diz **o que** foi filtrado, não só que deu zero. */
function Vazio({ descricao }: { descricao: readonly string[] }) {
  return (
    <div role="status" className="px-3.5 py-20 text-center">
      <p className="mb-1 text-14 font-medium">Nenhum asset com esse filtro.</p>
      {descricao.length > 0 && (
        <ul
          aria-label="Filtro aplicado"
          className="flex flex-wrap justify-center gap-1.5 font-mono text-11 text-texto-suave"
        >
          {descricao.map((parte) => (
            <li key={parte} className="rounded-padrao border border-borda-forte px-2 py-0.75">
              {parte}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
