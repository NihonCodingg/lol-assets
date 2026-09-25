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
 * **A seleção do lote mora aqui, não nas listas.** "Tudo do Jax" (RF-18)
 * atravessa duas listas — a da skin e a dos chromas — e um estado por lista
 * faria o botão selecionar metade. Chroma só entra se estiver revelado.
 *
 * ## O desenho (T-83, §5 do Plano de Design)
 *
 * O cabeçalho com o nome da skin e o fechar; embaixo, duas colunas (T-89): à
 * esquerda a prévia 16:9 com as marcas de corte e a guia de área segura, e todas
 * as skins à vista; à direita os arquivos da skin, com a ficha e "Baixar PNG".
 * O painel abre no centro da tela, nascendo do tile tocado (`PainelLateral`).
 *
 * **O toque responde antes** (T-72, e de novo no T-83): o primeiro quadro depois
 * do toque é o painel com o cabeçalho e a prévia — o que o tile já sabia. A
 * faixa de skins e as variantes entram numa transição logo depois, sem segurar
 * a pintura. Medido no telefone com a CPU 4× mais lenta, era esse primeiro
 * quadro que passava de 200 ms.
 *
 * O `Escape` segue a ordem ampliação → chromas → painel.
 *
 * ## No telefone (T-49)
 *
 * Tela cheia, o `×` parado no canto e a barra do lote no pé. Em tela de toque,
 * todo botão do painel tem pelo menos 44 px.
 */

import { CloudOff, X } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

import type { Asset, CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { Ampliacao } from "@/components/ampliacao";
import { BarraDeAcao } from "@/components/barra-de-acao";
import { BarraDeLote } from "@/components/barra-de-lote";
import { ListaDeVariantes } from "@/components/lista-de-variantes";
import { SeletorDeSkin } from "@/components/seletor-de-skin";
import { Botao } from "@/components/ui/botao";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Estado } from "@/components/ui/estado";
import { PainelLateral } from "@/components/ui/painel-lateral";
import { VitrineDaSkin } from "@/components/vitrine-da-skin";
import { assetUrl, thumbnailSrc } from "@/lib/asset-file";
import { orderAssets } from "@/lib/asset-panel";
import { baseSkin, chromasOf, panelAssets, skinsOf } from "@/lib/champion-panel";
import { alternar, selecionados, tudoDo } from "@/lib/selecao";
import { useFecharComVoltar } from "@/lib/voltar";

export interface PainelDoCampeaoProps {
  readonly champion: CatalogChampion;
  readonly skins: readonly CatalogSkin[];
  readonly assets: readonly Asset[] | null;
  /** Skin que a busca pediu. Sem ela, o painel abre na base. */
  readonly skinInicial?: number;
  readonly assetsBaseUrl?: string;
  readonly erro?: string | null;
  /** Pede a fatia de novo, depois de um erro (T-50). Sem ele, não há o botão. */
  readonly onTentarDeNovo?: () => void;
  readonly onClose: () => void;
  /** A caixa do tile tocado: o painel cresce dela (T-83). */
  readonly origem?: DOMRect | null;
}

export function PainelDoCampeao({
  champion,
  skins,
  assets,
  skinInicial,
  assetsBaseUrl,
  erro,
  onTentarDeNovo,
  onClose,
  origem = null,
}: PainelDoCampeaoProps) {
  const doCampeao = useMemo(() => skinsOf(skins, champion), [skins, champion]);
  const padrao = useMemo(
    () => skinInicial ?? baseSkin(skins, champion)?.skinNum ?? 0,
    [skinInicial, skins, champion],
  );
  const [skinNum, setSkinNum] = useState(padrao);
  const [chromasAbertos, setChromasAbertos] = useState(false);
  const [selecao, setSelecao] = useState<ReadonlySet<string>>(new Set());
  const [ampliado, setAmpliado] = useState<Asset | null>(null);
  // No telefone, a variante que a barra de ação do pé baixa (T-87).
  const [escolhida, setEscolhida] = useState<Asset | null>(null);
  // O resto do painel — a faixa de skins e as variantes — depois do primeiro quadro.
  const [completo, setCompleto] = useState(false);
  useEffect(() => startTransition(() => setCompleto(true)), []);
  // Voltar fecha o painel, não o site: no telefone ele ocupa a tela inteira (T-70).
  useFecharComVoltar(true, onClose);

  /**
   * `Escape` mora aqui, e não nas listas de dentro: com a ampliação aberta, fecha
   * a ampliação; com os chromas abertos, fecha os chromas. E o painel aparece
   * antes de a fatia chegar — a tecla vale durante a espera, que é quando alguém
   * mais desiste.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (ampliado) setAmpliado(null);
      else if (chromasAbertos) setChromasAbertos(false);
      else onClose();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ampliado, chromasAbertos, onClose]);

  // A busca pode trocar de campeão com o painel aberto: sem isto, a skin
  // selecionada ficaria a do campeão anterior.
  useEffect(() => {
    setSkinNum(padrao);
    setChromasAbertos(false);
    setSelecao(new Set());
    setAmpliado(null);
  }, [padrao, champion.championKey]);

  const lista = useMemo(() => assets ?? [], [assets]);
  const visiveis = useMemo(() => panelAssets(lista, skinNum), [lista, skinNum]);
  const chromas = useMemo(() => chromasOf(lista, skinNum), [lista, skinNum]);
  const skinAtual = doCampeao.find((skin) => skin.skinNum === skinNum);
  const nomeDaSkin = skinAtual?.names.pt_BR ?? champion.names.pt_BR;
  const contagem = `${doCampeao.length} ${doCampeao.length === 1 ? "skin" : "skins"}`;

  // A splash centralizada da skin é a arte da prévia. Sem a fatia, ela ainda não
  // existe, e a prévia fica com o tile do catálogo.
  const splash = useMemo(
    () => lista.find((a) => a.type === "splash_centered" && a.skinNum === skinNum),
    [lista, skinNum],
  );

  // O que o lote pode alcançar: o que está na tela agora.
  const alcancaveis = useMemo(
    () => (chromasAbertos ? [...visiveis, ...chromas] : visiveis),
    [visiveis, chromas, chromasAbertos],
  );
  const noLote = useMemo(() => selecionados(alcancaveis, selecao), [alcancaveis, selecao]);
  // A escolhida vale enquanto está na tela; trocar de skin volta para a primeira.
  // Sem escolha, a primeira na ordem da lista: a splash centralizada.
  const primeira = useMemo(() => orderAssets(visiveis)[0], [visiveis]);
  const acaoNoPe = (escolhida && alcancaveis.find((a) => a.id === escolhida.id)) ?? primeira;
  const alternarNoLote = (id: string) => setSelecao((antes) => alternar(antes, id));

  return (
    <PainelLateral
      aberto
      onFechar={onClose}
      titulo={`Painel de ${champion.names.pt_BR}`}
      fecharPorEsc={false}
      // No centro da tela, o véu em volta é o lugar de fechar (T-89): é o que a
      // pessoa espera de uma janela no meio da página. Na borda, não fechava.
      origem={origem}
      // No centro da tela (T-89, pedido do dono): a folha grande, com o raio
      // maior do sistema, e as duas colunas lado a lado. No telefone, a tela
      // inteira.
      centralizado
    >
      <section
        aria-label={`Painel de ${champion.names.pt_BR}`}
        className="relative flex min-h-0 flex-1 flex-col pointer-coarse:[&_button]:min-h-controle-xl pointer-coarse:[&_button]:min-w-controle-xl"
      >
        {/* O cabeçalho: a skin em destaque e o campeão embaixo (ADR 0008), e um
            fechar só, parado enquanto o resto rola. */}
        <header className="flex flex-none items-center gap-3 border-b border-linha py-3.5 pr-3 pl-4 md:pl-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-26 leading-apertada font-extrabold tracking-titulo text-texto">
              {nomeDaSkin}
            </h2>
            <p className="truncate text-13 text-texto-suave">
              {skinAtual?.isBase ? contagem : `${champion.names.pt_BR}, ${contagem}`}
            </p>
          </div>
          <BotaoIcone
            rotulo="Fechar"
            dica="Fechar (Esc)"
            icone={<X aria-hidden="true" strokeWidth={1.75} className="size-4" />}
            onClick={onClose}
          />
        </header>

        {/* Duas colunas no computador (T-89): à esquerda a arte — a prévia e todas
            as skins à vista, sem rolagem de lado —, à direita os arquivos da skin.
            Cada coluna rola por conta própria. No telefone, uma coluna só. */}
        <div className="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:overflow-hidden">
          <div className="flex flex-col pb-4 md:min-h-0 md:overflow-y-auto md:border-r md:border-linha">
            <VitrineDaSkin
              titulo={nomeDaSkin}
              splash={splash && assetUrl(splash, assetsBaseUrl)}
              arquivo={splash && { nome: splash.fileName, formato: splash.format }}
              tile={skinAtual && thumbnailSrc(skinAtual, assetsBaseUrl)}
            />

            {completo ? (
              <SeletorDeSkin
                nome={`skin-${champion.championKey}`}
                campeao={champion.names.pt_BR}
                skins={doCampeao}
                valor={skinNum}
                onEscolher={setSkinNum}
                assetsBaseUrl={assetsBaseUrl}
              />
            ) : (
              // A faixa ocupa o lugar dela desde o primeiro quadro: nada pula.
              <div aria-hidden="true" className="flex gap-2 overflow-hidden px-4 pt-4 md:flex-wrap md:px-6">
                {Array.from({ length: Math.min(doCampeao.length, 10) }, (_, i) => (
                  <Esqueleto key={i} className="size-[76px] flex-none rounded-quadro" />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:min-h-0 md:overflow-y-auto">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 pb-2 md:px-5">
              <h3 className="min-w-0 flex-1 text-16 font-semibold text-texto">
                Arquivos{" "}
                {assets && completo && (
                  <span className="text-14 font-normal tabular-nums text-texto-suave">{visiveis.length}</span>
                )}
              </h3>
              {/* RF-18: um clique pré-monta a seleção do campeão inteiro. */}
              {assets && completo && alcancaveis.length > 0 && (
                <Botao tamanho="md" onClick={() => setSelecao(tudoDo(alcancaveis, chromasAbertos))}>
                  Tudo de {champion.names.pt_BR} ({alcancaveis.length})
                </Botao>
              )}
            </div>

            {erro && (
              <Estado
                role="alert"
                icone={CloudOff}
                titulo={`Não deu para carregar as artes de ${champion.names.pt_BR}`}
                detalhe={erro}
                acao={onTentarDeNovo && <Botao onClick={onTentarDeNovo}>Tentar de novo</Botao>}
                className="py-10"
              >
                O índice dos campeões não chegou. Confira a conexão e tente de novo.
              </Estado>
            )}
            {(!assets || !completo) && !erro && (
              <p role="status" className="px-4 py-3 text-14 text-texto-suave md:px-5">
                Carregando as artes…
              </p>
            )}

            {assets && completo && (
              <ListaDeVariantes
                titulo={`Artes de ${nomeDaSkin}`}
                assets={visiveis}
                assetsBaseUrl={assetsBaseUrl}
                selecao={selecao}
                onAlternar={alternarNoLote}
                onAmpliar={setAmpliado}
                escolhida={acaoNoPe?.id}
                onEscolher={setEscolhida}
              />
            )}

            {/* RF-06: chroma não aparece sozinho; só quando alguém pede o desta skin. */}
            {assets && completo && chromas.length > 0 && (
              <section aria-label="Chromas" className="border-t border-linha">
                <Botao
                  variante="fantasma"
                  tamanho="md"
                  className="mx-4 my-3 md:mx-5"
                  aria-expanded={chromasAbertos}
                  onClick={() => setChromasAbertos((aberto) => !aberto)}
                >
                  {chromasAbertos ? "Esconder" : "Mostrar"} {chromas.length}{" "}
                  {chromas.length === 1 ? "chroma" : "chromas"}
                </Botao>
                {chromasAbertos && (
                  <ListaDeVariantes
                    titulo={`Chromas de ${nomeDaSkin}`}
                    assets={chromas}
                    assetsBaseUrl={assetsBaseUrl}
                    selecao={selecao}
                    onAlternar={alternarNoLote}
                    onAmpliar={setAmpliado}
                    escolhida={acaoNoPe?.id}
                    onEscolher={setEscolhida}
                  />
                )}
              </section>
            )}
          </div>
        </div>

        {/* A barra do lote fica no pé do painel, fixa: com 40 assets
            selecionados, o botão de baixar não pode estar a uma rolagem de distância. */}
        {assets && completo && acaoNoPe && <BarraDeAcao asset={acaoNoPe} assetsBaseUrl={assetsBaseUrl} />}
        <BarraDeLote
          assets={noLote}
          rotulo={champion.names.pt_BR}
          assetsBaseUrl={assetsBaseUrl}
          onLimpar={() => setSelecao(new Set())}
        />
      </section>

      {ampliado && (
        <Ampliacao
          asset={ampliado}
          url={assetUrl(ampliado, assetsBaseUrl)}
          onFechar={() => setAmpliado(null)}
        />
      )}
    </PainelLateral>
  );
}
