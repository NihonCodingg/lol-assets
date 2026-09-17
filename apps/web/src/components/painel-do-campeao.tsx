"use client";

/**
 * O painel do campeão: o seletor de skin mora aqui, e só aqui ([ADR 0010]).
 *
 * Trocar de skin **não recarrega a fatia**. Ela já está em memória desde a
 * primeira abertura; o que muda é o filtro. É isso que mantém a promessa de ≤ 3
 * cliques do carregamento ao arquivo salvo.
 *
 * Chromas ficam atrás de um controle (RF-06): eles são 7.037 e não podem poluir
 * nem a grade nem a lista de skins. O controle só existe quando a skin tem
 * chroma.
 *
 * **A seleção do lote mora aqui, não nos painéis.** "Tudo do Jax" (RF-18)
 * atravessa duas listas — a da skin e a dos chromas — e um estado por painel
 * faria o botão selecionar metade. Chroma só entra se estiver revelado, pela
 * mesma razão do RF-06: seleção que arrasta 43 chromas escondidos é a surpresa
 * que o RF-06 existe para evitar.
 *
 * ## A vitrine (T-47)
 *
 * O painel abre na arte: a splash da skin escolhida no topo, grande, e as skins
 * numa faixa de *tiles* logo abaixo — escolhe-se a skin pela imagem, não pelo
 * nome. Tudo rola junto; só o fechar e a bandeja do lote ficam parados. E há um
 * fechar só, o do canto: o "fechar" da lista de dentro saiu, porque fechava o
 * mesmo painel por outro caminho.
 */

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Asset, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { BarraDeLote } from "@/components/barra-de-lote";
import { PainelDeAsset } from "@/components/painel-de-asset";
import { SeletorDeSkin } from "@/components/seletor-de-skin";
import { Botao } from "@/components/ui/botao";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { PainelLateral } from "@/components/ui/painel-lateral";
import { VitrineDaSkin } from "@/components/vitrine-da-skin";
import { assetUrl, thumbnailSrc } from "@/lib/asset-file";
import { baseSkin, chromasOf, panelAssets, skinsOf } from "@/lib/champion-panel";
import { alternar, selecionados, tudoDo } from "@/lib/selecao";

export interface PainelDoCampeaoProps {
  readonly champion: CatalogChampion;
  readonly skins: readonly CatalogSkin[];
  readonly assets: readonly Asset[] | null;
  /** Skin que a busca pediu. Sem ela, o painel abre na base. */
  readonly skinInicial?: number;
  readonly assetsBaseUrl?: string;
  readonly erro?: string | null;
  readonly onClose: () => void;
}

export function PainelDoCampeao({
  champion,
  skins,
  assets,
  skinInicial,
  assetsBaseUrl,
  erro,
  onClose,
}: PainelDoCampeaoProps) {
  const doCampeao = useMemo(() => skinsOf(skins, champion), [skins, champion]);
  const padrao = useMemo(
    () => skinInicial ?? baseSkin(skins, champion)?.skinNum ?? 0,
    [skinInicial, skins, champion],
  );
  const [skinNum, setSkinNum] = useState(padrao);
  const [chromasAbertos, setChromasAbertos] = useState(false);
  const [selecao, setSelecao] = useState<ReadonlySet<string>>(new Set());

  /**
   * `Escape` mora aqui, e não nos painéis de dentro, por dois motivos.
   *
   * O primeiro é ordem: com os chromas abertos, `Escape` fecha os chromas — o
   * de dentro primeiro, como todo mundo espera. Dois ouvintes na mesma tecla
   * fechariam os dois de uma vez.
   *
   * O segundo é tempo: o painel aparece antes de a fatia chegar, e um ouvinte
   * que só existe depois dos assets deixa `Escape` sem efeito exatamente
   * durante a espera, que é quando alguém mais desiste.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (chromasAbertos) setChromasAbertos(false);
      else onClose();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [chromasAbertos, onClose]);

  // A busca pode trocar de campeão com o painel aberto: sem isto, a skin
  // selecionada ficaria a do campeão anterior — e a seleção levaria assets de
  // um campeão que já não está na tela.
  useEffect(() => {
    setSkinNum(padrao);
    setChromasAbertos(false);
    setSelecao(new Set());
  }, [padrao, champion.championKey]);

  const lista = useMemo(() => assets ?? [], [assets]);
  const visiveis = useMemo(() => panelAssets(lista, skinNum), [lista, skinNum]);
  const chromas = useMemo(() => chromasOf(lista, skinNum), [lista, skinNum]);
  const skinAtual = doCampeao.find((skin) => skin.skinNum === skinNum);
  const nomeDaSkin = skinAtual?.names.pt_BR ?? champion.names.pt_BR;
  const contagem = `${doCampeao.length} ${doCampeao.length === 1 ? "skin" : "skins"}`;

  // A splash centralizada da skin é a arte da vitrine. Sem a fatia, ela ainda
  // não existe, e a vitrine fica com o tile do catálogo.
  const splash = useMemo(() => {
    const achada = lista.find((a) => a.type === "splash_centered" && a.skinNum === skinNum);
    return achada && assetUrl(achada, assetsBaseUrl);
  }, [lista, skinNum, assetsBaseUrl]);

  // O que o lote pode alcançar: o que está na tela agora. Chroma escondido não
  // está na tela e por isso não entra nem no "tudo", nem na conta.
  const alcancaveis = useMemo(
    () => (chromasAbertos ? [...visiveis, ...chromas] : visiveis),
    [visiveis, chromas, chromasAbertos],
  );
  const noLote = useMemo(() => selecionados(alcancaveis, selecao), [alcancaveis, selecao]);
  const alternarNoLote = (id: string) => setSelecao((antes) => alternar(antes, id));

  return (
    <PainelLateral
      aberto
      onFechar={onClose}
      titulo={`Painel de ${champion.names.pt_BR}`}
      // O `Escape` daqui tem ordem própria (chroma antes do painel) e o clique
      // fora nunca fechou. Ver o comentário em `PainelLateral`.
      fecharPorEsc={false}
      fecharPorFora={false}
      // 880 px: a splash é 16:9, e é ela que o painel mostra primeiro. Nos
      // 540 px de antes ela ficava do tamanho de um cartão.
      className="w-[min(880px,92vw)]"
    >
      <section
        aria-label={`Painel de ${champion.names.pt_BR}`}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {/* Um fechar só, parado no canto enquanto o resto rola. */}
        <BotaoIcone
          rotulo="Fechar"
          dica="Fechar (Esc)"
          icone={<X aria-hidden="true" strokeWidth={1.75} className="size-4" />}
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-superficie/80 text-texto hover:bg-superficie"
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <VitrineDaSkin
            titulo={nomeDaSkin}
            // ADR 0008: a skin em destaque, o campeão embaixo.
            subtitulo={skinAtual?.isBase ? `Skin base · ${contagem}` : `${champion.names.pt_BR} · ${contagem}`}
            splash={splash}
            tile={skinAtual && thumbnailSrc(skinAtual, assetsBaseUrl)}
          />

          <SeletorDeSkin
            nome={`skin-${champion.championKey}`}
            skins={doCampeao}
            valor={skinNum}
            onEscolher={setSkinNum}
            assetsBaseUrl={assetsBaseUrl}
          />

          {/* RF-18: um clique pré-monta a seleção do campeão inteiro. */}
          {assets && alcancaveis.length > 0 && (
            <div className="flex items-center border-b border-borda px-3.5 pb-3">
              <Botao
                tamanho="md"
                onClick={() => setSelecao(tudoDo(alcancaveis, chromasAbertos))}
              >
                Tudo de {champion.names.pt_BR} ({alcancaveis.length})
              </Botao>
            </div>
          )}

          {erro && (
            <p role="alert" className="px-3.5 py-3 text-13 text-acento-mais-claro">
              {erro}
            </p>
          )}
          {!assets && !erro && (
            <p className="px-3.5 py-3 text-13 text-texto-suave">carregando os assets…</p>
          )}

          {assets && (
            <PainelDeAsset
              titulo={`Artes de ${nomeDaSkin}`}
              assets={visiveis}
              assetsBaseUrl={assetsBaseUrl}
              onClose={onClose}
              selecao={selecao}
              onAlternar={alternarNoLote}
              fecharComEsc={false}
              embutido
            />
          )}

          {/* RF-06: chroma não aparece sozinho; só quando alguém pede o desta skin. */}
          {assets && chromas.length > 0 && (
            <section aria-label="Chromas" className="border-t border-borda">
              <Botao
                variante="fantasma"
                tamanho="md"
                className="m-3.5"
                aria-expanded={chromasAbertos}
                onClick={() => setChromasAbertos((aberto) => !aberto)}
              >
                {chromasAbertos ? "Esconder" : "Mostrar"} {chromas.length}{" "}
                {chromas.length === 1 ? "chroma" : "chromas"}
              </Botao>
              {chromasAbertos && (
                <PainelDeAsset
                  titulo={`Chromas de ${nomeDaSkin}`}
                  assets={chromas}
                  assetsBaseUrl={assetsBaseUrl}
                  onClose={() => setChromasAbertos(false)}
                  selecao={selecao}
                  onAlternar={alternarNoLote}
                  fecharComEsc={false}
                  embutido
                />
              )}
            </section>
          )}
        </div>

        {/* A bandeja fica no pé do painel, fixa: com 40 assets selecionados, o
            botão de baixar não pode estar a uma rolagem de distância. */}
        <BarraDeLote
          assets={noLote}
          rotulo={champion.names.pt_BR}
          assetsBaseUrl={assetsBaseUrl}
          onLimpar={() => setSelecao(new Set())}
        />
      </section>
    </PainelLateral>
  );
}
