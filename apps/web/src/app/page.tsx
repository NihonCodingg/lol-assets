"use client";

/**
 * A página: grade de campeões, busca e painel.
 *
 * A ordem de carga é a do [ADR 0010] e está verificada em rede: manifesto e
 * catálogo na abertura, fatia de assets **só no primeiro clique** num campeão.
 * A home desenha 173 cartões sem baixar um único registro de asset.
 *
 * Enquanto o catálogo não chega, a tela já tem a forma da home — o campo da
 * busca e a grade em esqueleto (T-46) —, e o leitor de tela ouve que está
 * carregando.
 */

import { CloudOff } from "lucide-react";
import dynamic from "next/dynamic";
import { startTransition, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { Asset, Catalog, CatalogChampion, CatalogSkin, IndexManifest } from "@lol-assets/schema";

import { AvisoDeIndiceVelho } from "@/components/aviso-de-indice-velho";
import { AvisoDePatchNovo } from "@/components/aviso-de-patch-novo";
import { AvisosNoFim } from "@/components/avisos-da-riot";
import { EsqueletoDaGrade, GradeDeCampeoes } from "@/components/grade-de-campeoes";
import { useNavegacao } from "@/components/navegacao-context";
import type { PedidoDaBusca } from "@/components/navegacao-por-categoria";
import { PaletaDeBusca } from "@/components/paleta-de-busca";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Estado } from "@/components/ui/estado";
import { AssetsClient } from "@/lib/assets-client";
import { CATEGORIAS_DA_BUSCA, nomeDoAsset } from "@/lib/busca-agrupada";
import { categoriasDisponiveis } from "@/lib/categorias";
import { conexaoDoNavegador, devePreaquecer } from "@/lib/preaquecer";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * O painel do campeão e as categorias chegam depois da home (T-83).
 *
 * Nenhum dos dois aparece na chegada, e juntos eram o maior pedaço do JS da
 * home — o orçamento da §7 do Plano de Design é 190 KB. Eles são pedidos no
 * primeiro momento ocioso depois de o catálogo chegar (`preCarregar`), e o
 * sinal de intenção por um campeão também os pede: quem toca num tile encontra
 * o código já baixado.
 */
const carregarPainel = () => import("@/components/painel-do-campeao");
const carregarCategorias = () => import("@/components/navegacao-por-categoria");
const PainelDoCampeao = dynamic(() => carregarPainel().then((m) => m.PainelDoCampeao), { ssr: false });
const NavegacaoPorCategoria = dynamic(
  () => carregarCategorias().then((m) => m.NavegacaoPorCategoria),
  { ssr: false },
);

function preCarregar(): void {
  void carregarPainel();
  void carregarCategorias();
}

/** O índice é servido pelo próprio app, de `public/indice` (ADR 0012). */
const BASE_INDICE = process.env.NEXT_PUBLIC_INDEX_BASE_URL ?? "/indice";

/**
 * Onde os assets COPIADOS moram. Vazio na opção B do ADR 0012 — nada é
 * copiado, então cada asset vale pela `sourceUrl`. A variável continua lida
 * para o dia em que houver bucket de novo.
 */
const BASE_ASSETS = process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; motivo: string }
  | { fase: "pronto"; manifest: IndexManifest; catalog: Catalog };

interface Aberto {
  readonly champion: CatalogChampion;
  /** Skin que a busca pediu; sem ela o painel abre na base. */
  readonly skinNum?: number;
  /** A caixa da arte do tile tocado: o painel cresce dela (T-83). */
  readonly origem?: DOMRect | null;
}

/** A caixa da arte do tile de um campeão na grade, se ele está na tela. */
function caixaDoTile(champion: CatalogChampion): DOMRect | null {
  const arte = document.querySelector(`[data-cartao-key="${champion.championKey}"]`)?.firstElementChild;
  return arte instanceof HTMLElement ? arte.getBoundingClientRect() : null;
}

export default function HomePage() {
  const cliente = useMemo(() => new AssetsClient(BASE_INDICE), []);
  const { aberta, abrir, registrar, lugarDaBusca, comTopo } = useNavegacao();
  /**
   * A busca mora no miolo do topo (T-80), que é do layout: vai para lá por
   * portal. Até o topo registrar o lugar, ela não aparece — o topo desenha o
   * esqueleto dela. Sem provedor nenhum (a página montada sozinha), ela fica no
   * alto da página, com a borda e o respiro que o topo daria.
   */
  const noTopo = (busca: ReactNode) =>
    lugarDaBusca ? (
      createPortal(busca, lugarDaBusca)
    ) : comTopo ? null : (
      <div className="flex flex-none items-center border-b border-linha px-3.5 py-2">{busca}</div>
    );
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [erroDoPainel, setErroDoPainel] = useState<string | null>(null);
  /** Um item, uma runa ou um feitiço escolhido na busca: a categoria abre nele (T-82). */
  const [pedido, setPedido] = useState<PedidoDaBusca | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const manifest = await cliente.loadManifest();
        const catalog = await cliente.loadCatalog(manifest);
        if (vivo) setEstado({ fase: "pronto", manifest, catalog });
      } catch (erro) {
        if (vivo) {
          setEstado({ fase: "erro", motivo: erro instanceof Error ? erro.message : String(erro) });
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [cliente]);

  // A barra lateral desenha os botões de categoria, e ela só sabe quais existem
  // — e quanto cada uma tem — depois que o manifesto chega. Este é o único
  // ponto em que os dois se encontram (T-41).
  useEffect(() => {
    if (estado.fase !== "pronto") return;
    registrar(
      categoriasDisponiveis(versaoAtual(estado.manifest).shards),
      estado.catalog.champions.length,
    );
  }, [estado, registrar]);

  /**
   * A fatia de um campeão começa a chegar no sinal de intenção por ele (T-61):
   * o ponteiro que para no cartão, o foco, o toque, o resultado em destaque na
   * busca. Desde o ADR 0023 cada campeão tem a sua, e o clique encontra a
   * promessa já em andamento — o `AssetsClient` guarda a promessa, e esquece a
   * que falhar (o clique tenta de novo, e mostra o erro se for o caso).
   */
  // O código do painel e das categorias, no primeiro ócio depois do catálogo.
  const pronto = estado.fase === "pronto";
  useEffect(() => {
    if (!pronto) return;
    // O Safari não tem `requestIdleCallback`: lá, meio segundo depois.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preCarregar, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preCarregar, 500);
    return () => clearTimeout(id);
  }, [pronto]);

  const preaquecer = useCallback(
    (champion: CatalogChampion) => {
      preCarregar();
      if (estado.fase !== "pronto") return;
      if (!devePreaquecer(conexaoDoNavegador())) return;
      cliente.loadChampion(champion).catch(() => {});
    },
    [cliente, estado],
  );

  const abrirCampeao = useCallback(
    async (champion: CatalogChampion, skinNum?: number, origem?: DOMRect | null) => {
      setAberto({ champion, skinNum, origem });
      // As artes do campeão anterior ficavam no estado depois de fechar: o
      // painel da Ahri nascia com as 115 artes do Jax, montadas à toa (T-72).
      setAssets(null);
      setErroDoPainel(null);
      if (estado.fase !== "pronto") return;
      try {
        // Só a fatia deste campeão (ADR 0023), sob demanda e memorizada.
        const shard = await cliente.loadChampion(champion);
        const doCampeao = shard.assets;
        // As artes entram numa transição (T-72): o painel pinta primeiro — a
        // vitrine, o seletor —, e a grade vem logo depois, sem segurar o toque.
        // Com a fatia já em memória, tudo saía numa tarefa só: 360 ms entre o
        // toque e a primeira pintura num telefone mediano.
        startTransition(() => setAssets(doCampeao));
      } catch (erro) {
        setErroDoPainel(erro instanceof Error ? erro.message : String(erro));
      }
    },
    [cliente, estado],
  );
  /**
   * As fatias que a busca alcança além do catálogo — item, runa e feitiço —,
   * pedidas pela paleta na primeira letra digitada, nunca na chegada (RNF-03).
   * O `AssetsClient` guarda as promessas: abrir Itens depois não busca de novo.
   */
  const carregarExtras = useCallback(async (): Promise<readonly Asset[]> => {
    if (estado.fase !== "pronto") return [];
    const declaradas = new Set(versaoAtual(estado.manifest).shards.map((s) => s.category));
    const fatias = await Promise.all(
      CATEGORIAS_DA_BUSCA.filter((c) => declaradas.has(c)).map((c) =>
        cliente.loadShard(estado.manifest, c),
      ),
    );
    return fatias.flatMap((fatia) => fatia.assets);
  }, [cliente, estado]);

  const abrirAsset = useCallback(
    (asset: Asset) => {
      setPedido({ categoria: asset.category, consulta: nomeDoAsset(asset), vez: Date.now() });
      abrir(asset.category);
    },
    [abrir],
  );

  // Estáveis, para a grade e a busca memorizadas não renderizarem à toa (T-72).
  const abrirPeloCartao = useCallback(
    (champion: CatalogChampion) => void abrirCampeao(champion, undefined, caixaDoTile(champion)),
    [abrirCampeao],
  );
  const abrirPelaSkin = useCallback(
    (skin: CatalogSkin, champion: CatalogChampion | undefined) => {
      if (champion) void abrirCampeao(champion, skin.skinNum);
    },
    [abrirCampeao],
  );

  if (estado.fase === "carregando") {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">{siteConfig.displayName}</h1>
        <p role="status" className="sr-only">
          Carregando o catálogo…
        </p>
        {/*
          A mesma árvore da tela pronta (T-59): a barra de filtro **dentro** do
          bloco que rola, como o `GradeDeCampeoes` a desenha. Fora dele, ela
          empurrava o conteúdo 43 px para baixo e devolvia esses 43 px quando o
          catálogo chegava — parte do salto de 0,16 medido na produção.
        */}
        <div data-conteudo="" className="flex min-h-0 flex-1 flex-col overflow-hidden baixa:overflow-visible">
          <div className="flex flex-none items-center border-b border-linha px-3.5 py-2">
            <Esqueleto className="h-controle-md w-80 max-w-full" />
          </div>
          <EsqueletoDaGrade />
        </div>
        <AvisosNoFim className="flex-none" />
      </main>
    );
  }
  if (estado.fase === "erro") {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto baixa:overflow-visible">
        <h1 className="sr-only">{siteConfig.displayName}</h1>
        {/* Sem catálogo não há busca: ocupar o lugar dela tira do topo o
            esqueleto, que pulsaria para sempre. */}
        {noTopo(<span hidden />)}
        <Estado
          role="alert"
          icone={CloudOff}
          titulo="Não deu para carregar o catálogo"
          detalhe={estado.motivo}
          acao={<Botao onClick={() => window.location.reload()}>Tentar de novo</Botao>}
          className="my-auto"
        >
          {/* T-43: publicado, quem lê isto é um visitante, não quem roda o
              indexador. A instrução de gerar o índice só faz sentido no `next dev`. */}
          {process.env.NODE_ENV === "development" ? (
            <p>
              Gere o índice com <code>lol-assets-indexer index</code>; ele é servido de{" "}
              <code>{BASE_INDICE}</code>.
            </p>
          ) : (
            <p>Confira a conexão e tente de novo. Se continuar, o site pode estar no meio de uma atualização.</p>
          )}
        </Estado>
        <AvisosNoFim />
      </main>
    );
  }

  const { catalog, manifest } = estado;
  return (
    <main className="flex min-h-0 flex-1 flex-col baixa:min-h-auto">
      {/* O `h1` é o nome do produto e existe para leitor de tela e para o SEO;
          na tela ele já está no topo, ao lado do símbolo. */}
      <h1 className="sr-only">{siteConfig.displayName}</h1>

      {/* T-31: o único alarme que existe. Sem monitoramento, o site é o detector. */}
      <AvisoDeIndiceVelho manifest={manifest} />
      <AvisoDePatchNovo manifest={manifest} />

      {/* No telefone, dentro de uma categoria, a busca global sai da tela: a
          categoria já tem o campo dela ("Nome ou arquivo"), e dois campos
          empilhados comiam 56 px do topo sem dizer qual era qual. Um toque em
          "Voltar aos campeões" a traz de volta. No computador, os dois cabem. */}
      {noTopo(
        <>
        <PaletaDeBusca
          className={cn("w-full justify-center", aberta !== null && "max-md:hidden")}
          catalog={catalog}
          assetsBaseUrl={BASE_ASSETS}
          onIntencao={preaquecer}
          onChampion={abrirPeloCartao}
          // O resultado de skin é atalho para dentro do painel, não destino
          // separado: abre o campeão já naquela skin (RF-25).
          onSkin={abrirPelaSkin}
          onAsset={abrirAsset}
          carregarExtras={carregarExtras}
        />
        {/*
          Pular o cromo (T-57). Da busca até o primeiro campeão eram 21 paradas
          de Tab: a barra lateral inteira, as funções e a densidade. Vem logo
          depois da busca, no topo, e aparece só quando recebe o foco.
        */}
        <a
          href="#conteudo"
          className="sr-only left-3.5 z-30 rounded-controle border border-linha-forte bg-superficie-alta px-3 py-2 text-12 text-texto focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2"
        >
          Ir para o conteúdo
        </a>
        </>,
      )}


      {/* Uma grade por vez, como o design desenha (T-41). "Campeões" é a
          primeira categoria da barra lateral e é onde a home abre (RF-04);
          escolher outra troca o conteúdo em vez de empilhar. */}
      <div
        id="conteudo"
        data-conteudo=""
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none baixa:min-h-auto"
      >
        {aberta === null ? (
          // A grade rola por dentro deste `div`. A categoria **não** pode rolar
          // aqui: ela tem scroller virtual próprio, e um pai que rola daria a
          // ele altura zero — a lista viria vazia, sem erro nenhum.
          <div className="min-h-0 flex-1 overflow-y-auto baixa:flex-none baixa:overflow-visible">
            <GradeDeCampeoes
              champions={catalog.champions}
              skins={catalog.skins}
              assetsBaseUrl={BASE_ASSETS}
              onIntencao={preaquecer}
              onAbrir={abrirPeloCartao}
            />
            {/* RF-21 no telefone: o fim da página é o fim da grade (T-49). */}
            <AvisosNoFim />
          </div>
        ) : (
          /* RF-08: o outro caminho, para quem não tem nome para digitar.
             Nenhuma fatia é buscada até alguém abrir uma categoria. */
          <NavegacaoPorCategoria
            aberta={aberta}
            pedido={pedido}
            carregar={(category) => cliente.loadShard(manifest, category)}
            onFechar={() => abrir(null)}
            assetsBaseUrl={BASE_ASSETS}
          />
        )}
      </div>

      {/* A barra de estado, como a de um editor: de que patch são as artes. As
          contagens já estão na barra lateral; sem o ponto médio entre elas. */}
      <p className="flex-none border-t border-linha px-3.5 py-1.5 text-11 tabular-nums text-texto-suave">
        Patch {manifest.currentVersion}
      </p>

      {aberto && (
        <PainelDoCampeao
          champion={aberto.champion}
          skins={catalog.skins}
          assets={assets}
          skinInicial={aberto.skinNum}
          assetsBaseUrl={BASE_ASSETS}
          erro={erroDoPainel}
          onTentarDeNovo={() => void abrirCampeao(aberto.champion, aberto.skinNum)}
          origem={aberto.origem}
          onClose={() => setAberto(null)}
        />
      )}
    </main>
  );
}

/** A única versão que existe desde o [ADR 0013]. */
function versaoAtual(manifest: IndexManifest): IndexManifest["versions"][number] {
  return (
    manifest.versions.find((v) => v.gameVersion === manifest.currentVersion) ?? manifest.versions[0]
  );
}
