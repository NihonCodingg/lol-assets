"use client";

/**
 * O aviso de patch novo (T-77): a Riot já publicou um patch que o índice ainda
 * não tem.
 *
 * **Fixo no canto, e não uma faixa no topo.** A lista de versões chega depois da
 * página; uma faixa que entrasse no topo empurraria a grade para baixo, e o
 * salto de layout da chegada é zero desde o T-59. Um elemento fixo não empurra
 * nada. Pela mesma razão ele fica **abaixo** dos painéis e da ampliação (z-10):
 * não se põe na frente da arte que alguém abriu.
 *
 * `role="status"`, como o de índice velho: é informação, não emergência. Dá para
 * dispensar, e a dispensa vale até o próximo patch.
 *
 * Com o índice velho aceso, este fica quieto: aquele já diz que o conteúdo pode
 * não ser o mais recente, e dois avisos sobre a mesma coisa são um a mais.
 */

import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { IndexManifest } from "@lol-assets/schema";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { medirFrescor } from "@/lib/frescor";
import { buscarVersaoMaisNova, dispensar, eMaisNova, foiDispensado } from "@/lib/patch-novo";

export interface AvisoDePatchNovoProps {
  readonly manifest: IndexManifest;
}

export function AvisoDePatchNovo({ manifest }: AvisoDePatchNovoProps) {
  const [novo, setNovo] = useState<string | null>(null);
  const atual = manifest.currentVersion;

  useEffect(() => {
    if (medirFrescor(manifest).velho) return;
    let vivo = true;
    const conferir = () => {
      void buscarVersaoMaisNova().then((versao) => {
        if (vivo && versao && eMaisNova(versao, atual) && !foiDispensado(versao)) setNovo(versao);
      });
    };
    // Depois de a página assentar: a lista não entra no caminho da chegada.
    const ocioso = window.requestIdleCallback
      ? window.requestIdleCallback(conferir, { timeout: 4000 })
      : window.setTimeout(conferir, 2000);
    return () => {
      vivo = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(ocioso);
      else window.clearTimeout(ocioso);
    };
  }, [manifest, atual]);

  if (!novo) return null;

  return (
    <div
      role="status"
      data-patch="novo"
      className="fixed inset-x-3 bottom-3 z-10 flex items-start gap-2.5 rounded-painel border border-linha-forte bg-superficie-alta p-3 text-texto md:inset-x-auto md:right-4 md:bottom-4 md:w-[360px]"
    >
      <RefreshCw
        aria-hidden="true"
        strokeWidth={1.75}
        className="mt-0.5 size-4 flex-none text-acento"
      />
      <p className="flex-1 text-13 leading-cartao">
        <strong className="font-semibold text-texto">Já saiu o patch {novo}.</strong> As artes
        aqui ainda são do {atual}; a atualização automática traz o patch novo em algumas horas.
      </p>
      <BotaoIcone
        rotulo="Dispensar o aviso"
        icone={<X aria-hidden="true" strokeWidth={1.75} className="size-3.5" />}
        onClick={() => {
          dispensar(novo);
          setNovo(null);
        }}
        className="-mt-1 -mr-1 flex-none"
      />
    </div>
  );
}
