"use client";

/**
 * A grade padrão: 173 cartões, um por campeão ([ADR 0010]).
 *
 * **Não virtualiza, de propósito.** São 173 itens; o [ADR 0011] mediu que a
 * virtualização só se paga nos resultados de busca de skin, que chegam a 2.118.
 * Virtualizar 173 cartões custaria altura fixa por breakpoint e um scroller
 * próprio para não ganhar nada.
 *
 * O filtro por **função** do RF-08 mora aqui e não na navegação por categoria:
 * função é atributo de campeão, e campeão é a home ([ADR 0010]). As etiquetas
 * vêm do catálogo — os 173 campeões do patch 16.18.1 têm todas. Desde o T-81 é
 * um controle segmentado, uma função por vez (§5 do Plano de Design): "Todas",
 * "Assassino", "Atirador"…
 *
 * ## O tile (T-81)
 *
 * A arte quadrada, o nome embaixo com peso de leitura e a contagem de skins em
 * texto secundário. A arte é o *tile* 380×380 da skin base (T-46); o `square`
 * continua de reserva, para catálogo sem skin.
 *
 * O hover **não se move** ([ADR 0024]): a borda fica no destaque, e aparecem
 * as marcas de corte e o download rápido do square — a tarefa T1 num clique.
 * Os dois moram numa sobreposição só, para a grade inteira (`acoes-do-tile.tsx`).
 * O foco do teclado mostra o mesmo, e a tecla `D` baixa o square do tile
 * focado. Arrastar o tile entrega o square (`DownloadURL`, Chrome e Edge).
 *
 * ## Densidade (T-40)
 *
 * As duas larguras-alvo do design: densa (152 px) e confortável (210 px). A
 * escolha fica no `localStorage`, que é preferência de quem usa; quando ele não
 * existe ou lança — modo privado —, a grade abre densa e nada quebra.
 */

import { Grid2x2, Grid3x3, LayoutGrid } from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import type { CatalogChampion, CatalogSkin } from "@lol-assets/schema";

import { AcoesDoTile, type AlcaDasAcoes } from "@/components/acoes-do-tile";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { ControleSegmentado } from "@/components/ui/controle-segmentado";
import { Imagem } from "@/components/ui/imagem";
import { thumbnailSrc } from "@/lib/asset-file";
import { filtrarCampeoes, funcoesDe } from "@/lib/categorias";
import {
  arrastarArquivo,
  baixarSquare,
  nomeDoSquare,
} from "@/lib/download-rapido";
import { ESPERA_DA_INTENCAO_MS } from "@/lib/preaquecer";
import { cn, ROLA_SEM_CORTAR_O_TOQUE } from "@/lib/utils";

export type Densidade = "compacta" | "densa" | "confortavel";

/** O que o `localStorage` pode trazer; qualquer outra coisa vira a densa. */
const DENSIDADES: readonly Densidade[] = ["compacta", "densa", "confortavel"];

export const CHAVE_DA_DENSIDADE = "biblioteca:densidade";

export function lerDensidade(): Densidade {
  try {
    const guardada = window.localStorage.getItem(
      CHAVE_DA_DENSIDADE,
    ) as Densidade | null;
    return guardada && DENSIDADES.includes(guardada) ? guardada : "densa";
  } catch {
    return "densa";
  }
}

function gravarDensidade(densidade: Densidade): void {
  try {
    window.localStorage.setItem(CHAVE_DA_DENSIDADE, densidade);
  } catch {
    // Modo privado: a escolha vale até recarregar, e a grade continua de pé.
  }
}

/**
 * O que o navegador pode pular enquanto a linha está fora da tela (T-59).
 *
 * Medido na produção: a home pedia **126 imagens** para mostrar 28. O
 * `loading="lazy"` estava lá, mas a margem do Chrome é generosa e alcançava
 * quase a grade inteira — 173 cartões em 25 linhas. Com `content-visibility`, a
 * linha fora da tela não é desenhada, e a imagem dentro dela não é pedida.
 *
 * O `contain-intrinsic-size` é o tamanho que a linha "vale" enquanto está
 * pulada: sem ele, a barra de rolagem mentiria e a grade saltaria ao rolar.
 */
const CARTAO_PULAVEL =
  "[content-visibility:auto] [contain-intrinsic-size:auto_var(--altura-do-cartao)]";

/** Largura-alvo, não número de colunas: quem decide quantas cabem é a janela. */
const COLUNAS: Record<Densidade, string> = {
  compacta:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-compacto),1fr))] gap-x-2 gap-y-3",
  densa:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-denso),1fr))] gap-x-2.5 gap-y-4",
  confortavel:
    "grid-cols-[repeat(auto-fill,minmax(var(--spacing-alvo-cartao-confortavel),1fr))] gap-x-3.5 gap-y-5",
};

/**
 * A altura que cada cartão vale enquanto está pulado, por densidade: a arte
 * quadrada mais o nome e a contagem embaixo. Medida na produção.
 */
const ALTURA_ESTIMADA: Record<Densidade, string> = {
  compacta: "152px",
  densa: "203px",
  confortavel: "267px",
};

export interface GradeDeCampeoesProps {
  readonly champions: readonly CatalogChampion[];
  /** As skins do catálogo: a arte do cartão é a da skin base. Sem elas, o `square`. */
  readonly skins?: readonly CatalogSkin[];
  readonly assetsBaseUrl?: string;
  readonly onAbrir: (champion: CatalogChampion) => void;
  /**
   * Alguém mostrou intenção por um campeão: é hora de adiantar a fatia dele
   * (T-61, ADR 0023) — o ponteiro que para no cartão, o foco, o toque.
   */
  readonly onIntencao?: (champion: CatalogChampion) => void;
}

function Grade({
  champions,
  skins,
  assetsBaseUrl,
  onAbrir,
  onIntencao,
}: GradeDeCampeoesProps) {
  const funcoes = useMemo(() => funcoesDe(champions), [champions]);
  // Uma função por vez; `""` é "Todas".
  const [funcao, setFuncao] = useState("");
  const visiveis = useMemo(
    () => filtrarCampeoes(champions, new Set(funcao ? [funcao] : [])),
    [champions, funcao],
  );
  // A grade só monta no cliente, depois que o catálogo chega: ler o
  // `localStorage` no primeiro render não arrisca divergir do HTML do servidor.
  const [densidade, setDensidade] = useState<Densidade>(lerDensidade);

  const arteDe = useMemo(() => {
    const porId = new Map((skins ?? []).map((skin) => [skin.skinId, skin]));
    return (champion: CatalogChampion): string | undefined => {
      const base = porId.get(champion.baseSkinId);
      return (
        (base && thumbnailSrc(base, assetsBaseUrl)) ??
        thumbnailSrc(champion, assetsBaseUrl)
      );
    };
  }, [skins, assetsBaseUrl]);

  /**
   * Foco itinerante (T-57).
   *
   * Eram 173 cartões, cada um com o seu Tab: chegar ao último pedia 173 teclas,
   * e antes deles ainda vinham 20 do cromo. Agora a grade inteira é **uma**
   * parada de Tab, e dentro dela as setas andam como o olho anda — inclusive
   * para cima e para baixo, que é o que uma grade tem e uma lista não.
   *
   * O índice é da lista visível: filtrar por função encurta a grade, e o foco
   * volta para o começo em vez de apontar para um cartão que saiu.
   */
  const [comFoco, setComFoco] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  const acoes = useRef<AlcaDasAcoes>(null);

  useEffect(() => {
    setComFoco(0);
  }, [funcao]);

  function focar(indice: number) {
    const alvo = Math.max(0, Math.min(visiveis.length - 1, indice));
    setComFoco(alvo);
    const botao = lista.current?.querySelectorAll("li button[data-cartao]")[
      alvo
    ];
    if (botao instanceof HTMLElement) botao.focus();
  }

  function aoTeclar(evento: ReactKeyboardEvent<HTMLUListElement>) {
    // As colunas são do `auto-fill`: quem sabe quantas couberam é o navegador.
    const colunas = lista.current
      ? getComputedStyle(lista.current).gridTemplateColumns.split(" ").length
      : 1;
    const passos: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: colunas,
      ArrowUp: -colunas,
    };
    const passo = passos[evento.key];
    if (passo !== undefined) {
      evento.preventDefault();
      focar(comFoco + passo);
      return;
    }
    if (evento.key === "Home") {
      evento.preventDefault();
      focar(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      focar(visiveis.length - 1);
    }
  }

  function escolherDensidade(proxima: Densidade) {
    setDensidade(proxima);
    gravarDensidade(proxima);
  }

  return (
    <>
      {/* Uma barra só: filtro à esquerda, contagem e densidade à direita. A
          partir de `md` ela fica presa no topo enquanto a grade rola — filtrar
          no meio da rolagem não obriga a voltar lá em cima. No telefone, não
          fica presa, e as funções vão numa linha só que rola de lado: em três
          linhas quebradas, elas tomavam 150 px antes do primeiro cartão (T-49). */}
      <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 border-b border-linha bg-fundo px-3.5 py-2 md:sticky md:top-0 md:z-10 baixa:md:static">
        <h2 className="sr-only">Campeões</h2>
        {funcoes.length > 0 && (
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center max-md:-mx-3.5 max-md:w-[calc(100%+1.75rem)] max-md:overflow-x-auto max-md:px-3.5 max-md:[scrollbar-width:none]",
              ROLA_SEM_CORTAR_O_TOQUE,
            )}
          >
            <ControleSegmentado
              rotulo="Função"
              valor={funcao}
              onMudar={setFuncao}
              opcoes={[
                { valor: "", rotulo: "Todas" },
                ...funcoes.map((f) => ({
                  valor: f.tag,
                  rotulo: f.rotulo,
                  contagem: f.total,
                })),
              ]}
            />
          </div>
        )}

        {/* No telefone, a contagem sai e o controle fica na mesma linha das
            funções: era uma linha inteira de 44 px antes do primeiro cartão. */}
        <div className="ml-auto flex flex-none items-center gap-2.5">
          <span className="hidden text-13 tabular-nums text-texto-suave md:inline">
            {visiveis.length} de {champions.length} campeões
          </span>
          <div
            role="group"
            aria-label="Densidade da grade"
            className="flex items-center gap-0.5 rounded-controle border border-linha bg-superficie p-0.5"
          >
            <BotaoIcone
              rotulo="Grade compacta"
              dica="Máximo de cartões"
              aria-pressed={densidade === "compacta"}
              icone={
                <LayoutGrid
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4"
                />
              }
              onClick={() => escolherDensidade("compacta")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-superficie-alta aria-pressed:text-texto"
            />
            <BotaoIcone
              rotulo="Grade densa"
              dica="Mais cartões por linha"
              aria-pressed={densidade === "densa"}
              icone={
                <Grid3x3
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4"
                />
              }
              onClick={() => escolherDensidade("densa")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-superficie-alta aria-pressed:text-texto"
            />
            <BotaoIcone
              rotulo="Grade confortável"
              dica="Cartões maiores"
              aria-pressed={densidade === "confortavel"}
              icone={
                <Grid2x2
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4"
                />
              }
              onClick={() => escolherDensidade("confortavel")}
              className="h-controle-sm w-controle-sm pointer-coarse:h-controle-xl pointer-coarse:w-controle-xl aria-pressed:bg-superficie-alta aria-pressed:text-texto"
            />
          </div>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p
          role="status"
          className="px-3.5 py-20 text-center text-14 text-texto-suave"
        >
          Nenhum campeão com essa função.
        </p>
      ) : (
        // A camada do hover precisa de um pai posicionado que role junto com a
        // grade; sair dele com o ponteiro a esconde.
        <div
          data-grade-com-acoes=""
          className="relative"
          onPointerLeave={(evento) => {
            if (evento.pointerType === "mouse") acoes.current?.esconder();
          }}
          // O foco que sai da grade leva a camada junto.
          onBlur={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) acoes.current?.esconder();
          }}
        >
          <ul
            ref={lista}
            id="grade-de-campeoes"
            aria-label="Campeões"
            data-densidade={densidade}
            onKeyDown={aoTeclar}
            style={
              {
                "--altura-do-cartao": ALTURA_ESTIMADA[densidade],
              } as CSSProperties
            }
            className={cn("grid px-3.5 pt-3 pb-6", COLUNAS[densidade])}
          >
            {visiveis.map((champion, indice) => (
              <Cartao
                key={champion.championKey}
                champion={champion}
                arte={arteDe(champion)}
                assetsBaseUrl={assetsBaseUrl}
                acoes={acoes}
                // Uma parada de Tab para a grade inteira: o resto se alcança pelas
                // setas, e clicar num cartão passa a vez para ele.
                tabIndex={indice === comFoco ? 0 : -1}
                indice={indice}
                onFocar={setComFoco}
                onAbrir={onAbrir}
                onIntencao={onIntencao}
              />
            ))}
          </ul>
          <AcoesDoTile alca={acoes} assetsBaseUrl={assetsBaseUrl} />
        </div>
      )}
    </>
  );
}

/**
 * Memorizado (T-83): focar um tile — e o clique foca — muda a vez do Tab, e sem
 * isto a grade redesenhava os 173 tiles no mesmo quadro do toque que abre o
 * painel. Medido no telefone com a CPU 4× mais lenta: 29 ms. Agora redesenham
 * os dois tiles cuja vez mudou. As props são estáveis: `onFocar` recebe o índice
 * em vez de ser um fecho novo por tile.
 */
const Cartao = memo(function Cartao({
  champion,
  arte,
  assetsBaseUrl,
  tabIndex,
  indice,
  acoes,
  onFocar,
  onAbrir,
  onIntencao,
}: {
  champion: CatalogChampion;
  arte: string | undefined;
  assetsBaseUrl?: string;
  tabIndex: number;
  indice: number;
  acoes: RefObject<AlcaDasAcoes | null>;
  onFocar: (indice: number) => void;
  onAbrir: (champion: CatalogChampion) => void;
  onIntencao?: (champion: CatalogChampion) => void;
}) {
  // O ponteiro que só passa por cima não é intenção: atravessar a grade até o
  // Jax passaria por vinte cartões, e seriam vinte fatias baixadas à toa. Conta
  // o ponteiro que para (T-73).
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = () => onIntencao?.(champion);
  const pararDeEsperar = () => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
  };
  useEffect(() => pararDeEsperar, []);

  const square = thumbnailSrc(champion, assetsBaseUrl);
  // A sobreposição de hover vai para cima da arte deste tile (ver `acoes-do-tile.tsx`).
  const mostrarAcoes = (botao: HTMLElement) => {
    const caixa = botao.firstElementChild;
    if (caixa instanceof HTMLElement) acoes.current?.mostrar(caixa, champion);
  };

  return (
    <li className={CARTAO_PULAVEL}>
      <button
        type="button"
        data-cartao=""
        // O painel cresce da arte deste tile (T-83): a página a acha por aqui.
        data-cartao-key={champion.championKey}
        tabIndex={tabIndex}
        // A tecla do download rápido, para quem chega pelo teclado: o botão de
        // download da sobreposição é só do ponteiro, e a grade é uma parada de Tab.
        aria-keyshortcuts="D"
        onKeyDown={(evento) => {
          if (
            evento.key.toLowerCase() !== "d" ||
            evento.ctrlKey ||
            evento.metaKey ||
            evento.altKey
          )
            return;
          evento.preventDefault();
          void baixarSquare(champion, assetsBaseUrl);
        }}
        onFocus={(evento) => {
          onFocar(indice);
          avisar();
          mostrarAcoes(evento.currentTarget);
        }}
        onPointerEnter={(evento) => {
          pararDeEsperar();
          espera.current = setTimeout(avisar, ESPERA_DA_INTENCAO_MS);
          if (evento.pointerType === "mouse")
            mostrarAcoes(evento.currentTarget);
        }}
        onPointerLeave={pararDeEsperar}
        onPointerDown={avisar}
        onClick={() => onAbrir(champion)}
        // Arrastar o tile entrega o square, como o download rápido.
        draggable={Boolean(square)}
        onDragStart={(evento) => {
          if (square)
            arrastarArquivo(evento, square, nomeDoSquare(champion), "png");
        }}
        className="group block w-full cursor-pointer rounded-quadro text-left"
      >
        {/* O hover é parado ([ADR 0024]): a borda fica no destaque, e as marcas
            de corte chegam pela sobreposição. Nada se mexe. */}
        {arte ? (
          <Imagem
            src={arte}
            alt={champion.names.pt_BR}
            draggable={false}
            classeDaCaixa="aspect-square rounded-quadro border border-linha group-hover:border-acento group-focus-visible:border-acento"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-square rounded-quadro border border-linha bg-superficie-alta"
          />
        )}
        <div className="truncate pt-2 text-14 leading-cartao font-semibold text-texto">
          {champion.names.pt_BR}
        </div>
        {/* RF-04: o tile conta skins, nunca chromas. */}
        <div className="truncate text-13 leading-cartao tabular-nums text-texto-suave">
          {champion.skinCount} {champion.skinCount === 1 ? "skin" : "skins"}
        </div>
      </button>
    </li>
  );
});

/**
 * A home enquanto o catálogo não chega: a forma da grade, sem texto.
 *
 * O pulso atrasa 60 ms por coluna, como o design desenha — um brilho que
 * atravessa a linha em vez de 24 caixas piscando juntas.
 */
export function EsqueletoDaGrade({ cartoes = 24 }: { cartoes?: number }) {
  return (
    <div aria-hidden="true" className={cn("grid px-3.5 pt-3", COLUNAS.densa)}>
      {Array.from({ length: cartoes }, (_, i) => (
        <div
          key={i}
          className="animate-pulsar"
          style={{ animationDelay: `${(i % 8) * 0.06}s` }}
        >
          <div className="aspect-square rounded-quadro bg-superficie-alta" />
          <div className="mt-2 h-3 w-3/4 rounded-quadro bg-superficie-alta" />
          <div className="mt-1.5 h-2.5 w-1/3 rounded-quadro bg-superficie-alta" />
        </div>
      ))}
    </div>
  );
}

/**
 * Memorizada (T-72): a grade é filha da página, e toda mudança de estado da
 * página — abrir o painel, chegarem as artes, fechar — renderizava de novo os
 * 173 cartões, que não mudaram. Era metade do tempo entre o toque num campeão e
 * a primeira pintura, num telefone mediano.
 */
export const GradeDeCampeoes = memo(Grade);
