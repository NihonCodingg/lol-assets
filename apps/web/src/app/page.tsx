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
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Asset, Catalog, CatalogChampion, IndexManifest } from "@lol-assets/schema";

import { AvisoDeIndiceVelho } from "@/components/aviso-de-indice-velho";
import { AvisosNoFim } from "@/components/avisos-da-riot";
import { EsqueletoDaGrade, GradeDeCampeoes } from "@/components/grade-de-campeoes";
import { useNavegacao } from "@/components/navegacao-context";
import { NavegacaoPorCategoria } from "@/components/navegacao-por-categoria";
import { PainelDoCampeao } from "@/components/painel-do-campeao";
import { PaletaDeBusca } from "@/components/paleta-de-busca";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Estado } from "@/components/ui/estado";
import { AssetsClient } from "@/lib/assets-client";
import { categoriasDisponiveis } from "@/lib/categorias";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

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
}

export default function HomePage() {
  const cliente = useMemo(() => new AssetsClient(BASE_INDICE), []);
  const { aberta, abrir, registrar } = useNavegacao();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [erroDoPainel, setErroDoPainel] = useState<string | null>(null);

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

  const abrirCampeao = useCallback(
    async (champion: CatalogChampion, skinNum?: number) => {
      setAberto({ champion, skinNum });
      setErroDoPainel(null);
      if (estado.fase !== "pronto") return;
      try {
        // Sob demanda, e memoizada: trocar de campeão não busca de novo.
        const shard = await cliente.loadShard(estado.manifest, "champion");
        setAssets(shard.assets.filter((a) => a.championKey === champion.championKey));
      } catch (erro) {
        setErroDoPainel(erro instanceof Error ? erro.message : String(erro));
      }
    },
    [cliente, estado],
  );

  if (estado.fase === "carregando") {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">{siteConfig.displayName}</h1>
        <p role="status" className="sr-only">
          Carregando o catálogo…
        </p>
        <div className="flex flex-none items-center border-b border-borda px-3.5 py-2">
          <Esqueleto className="h-controle-xl w-full max-w-busca-max rounded-medio" />
        </div>
        {/*
          A mesma árvore da tela pronta (T-59): a barra de filtro **dentro** do
          bloco que rola, como o `GradeDeCampeoes` a desenha. Fora dele, ela
          empurrava o conteúdo 43 px para baixo e devolvia esses 43 px quando o
          catálogo chegava — parte do salto de 0,16 medido na produção.
        */}
        <div data-conteudo="" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-none items-center border-b border-borda px-3.5 py-2">
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
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <h1 className="sr-only">{siteConfig.displayName}</h1>
        <Estado
          role="alert"
          icone={CloudOff}
          titulo="Não deu para carregar o catálogo"
          detalhe={estado.motivo}
          acao={<Botao onClick={() => window.location.reload()}>Recarregar</Botao>}
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
            <p>Recarregue a página. Se continuar, o site pode estar no meio de uma atualização.</p>
          )}
        </Estado>
        <AvisosNoFim />
      </main>
    );
  }

  const { catalog, manifest } = estado;
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* O `h1` é o nome do produto e existe para leitor de tela e para o SEO;
          na tela ele já está na barra lateral, em cima do quadrado do acento. */}
      <h1 className="sr-only">{siteConfig.displayName}</h1>

      {/* T-31: o único alarme que existe. Sem monitoramento, o site é o detector. */}
      <AvisoDeIndiceVelho manifest={manifest} />

      {/* No telefone, dentro de uma categoria, a busca global sai da tela: a
          categoria já tem o campo dela ("Nome ou arquivo"), e dois campos
          empilhados comiam 56 px do topo sem dizer qual era qual. Um toque em
          "Voltar aos campeões" a traz de volta. No computador, os dois cabem. */}
      <PaletaDeBusca
        className={cn(aberta !== null && "max-md:hidden")}
        catalog={catalog}
        assetsBaseUrl={BASE_ASSETS}
        onChampion={(champion) => void abrirCampeao(champion)}
        // O resultado de skin é atalho para dentro do painel, não destino
        // separado: abre o campeão já naquela skin (RF-25).
        onSkin={(skin, champion) => champion && void abrirCampeao(champion, skin.skinNum)}
      />

      {/*
        Pular o cromo (T-57). Da busca até o primeiro campeão eram 21 paradas de
        Tab: a barra lateral inteira, as funções e a densidade. O atalho aparece
        só quando recebe o foco, que é como todo mundo o faz.
      */}
      <a
        href="#conteudo"
        className="sr-only left-3.5 z-30 rounded-padrao border border-borda-forte bg-superficie px-3 py-2 text-12 text-texto focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2"
      >
        Ir para o conteúdo
      </a>

      {/* Uma grade por vez, como o design desenha (T-41). "Campeões" é a
          primeira categoria da barra lateral e é onde a home abre (RF-04);
          escolher outra troca o conteúdo em vez de empilhar. */}
      <div
        id="conteudo"
        data-conteudo=""
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none"
      >
        {aberta === null ? (
          // A grade rola por dentro deste `div`. A categoria **não** pode rolar
          // aqui: ela tem scroller virtual próprio, e um pai que rola daria a
          // ele altura zero — a lista viria vazia, sem erro nenhum.
          <div className="min-h-0 flex-1 overflow-y-auto">
            <GradeDeCampeoes
              champions={catalog.champions}
              skins={catalog.skins}
              assetsBaseUrl={BASE_ASSETS}
              onAbrir={(champion) => void abrirCampeao(champion)}
            />
            {/* RF-21 no telefone: o fim da página é o fim da grade (T-49). */}
            <AvisosNoFim />
          </div>
        ) : (
          /* RF-08: o outro caminho, para quem não tem nome para digitar.
             Nenhuma fatia é buscada até alguém abrir uma categoria. */
          <NavegacaoPorCategoria
            aberta={aberta}
            carregar={(category) => cliente.loadShard(manifest, category)}
            onFechar={() => abrir(null)}
            assetsBaseUrl={BASE_ASSETS}
          />
        )}
      </div>

      <p className="flex-none border-t border-borda px-3.5 py-1.5 font-mono text-10 text-texto-suave">
        Patch {manifest.currentVersion} · {catalog.champions.length.toLocaleString("pt-BR")}{" "}
        campeões · {catalog.skins.length.toLocaleString("pt-BR")} skins
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
