"use client";

/**
 * A barra de ação fixa do telefone (T-87, §5 do Plano de Design).
 *
 * No telefone, as ações de cada linha de variante comiam três linhas de altura
 * por arquivo, e o botão de baixar ficava a uma rolagem da prévia. Aqui a
 * pessoa toca na variante que quer — ela fica marcada —, e a barra no pé do
 * painel baixa ou copia a escolhida, sempre no mesmo lugar do polegar. No
 * computador a barra não existe: as ações estão em cada linha.
 */

import type { Asset } from "@lol-assets/schema";

import {
  anuncioDe,
  baixarDeVerdade,
  BotaoDeCopiar,
  copiarDeVerdade,
  useCopia,
  useDownload,
} from "@/components/painel-de-asset";
import { ParDeDownload } from "@/components/ui/par-de-download";
import { GlifoDeProporcao } from "@/components/ui/quadro";
import { assetUrl, canConvertToPng } from "@/lib/asset-file";
import { nomeDaVariante } from "@/lib/asset-panel";

const SEM_MARCAR = () => {};

export function BarraDeAcao({ asset, assetsBaseUrl }: { readonly asset: Asset; readonly assetsBaseUrl?: string }) {
  const url = assetUrl(asset, assetsBaseUrl);
  const { acionar, andamento, feito } = useDownload(asset, url, SEM_MARCAR, baixarDeVerdade);
  const { copia, copiarUrl } = useCopia(copiarDeVerdade, url);
  const { nome } = nomeDaVariante(asset);
  return (
    <section
      aria-label="Ação da variante escolhida"
      data-barra-de-acao=""
      className="flex flex-none items-center gap-2 border-t border-linha-forte bg-superficie-alta px-4 py-2 md:hidden"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-13 font-semibold text-texto">{nome}</p>
        <p className="flex items-center gap-1.5 text-12 tabular-nums text-texto-suave">
          <GlifoDeProporcao largura={asset.width} altura={asset.height} />
          {asset.width}×{asset.height}
        </p>
      </div>
      <ParDeDownload
        podeConverter={canConvertToPng(asset)}
        ocupado={andamento !== null}
        baixando={andamento}
        baixado={feito}
        onOriginal={() => void acionar(false)}
        onPng={() => void acionar(true)}
      />
      <BotaoDeCopiar copia={copia} onClick={copiarUrl} />
      <span role="status" className="sr-only">
        {anuncioDe(copia, feito)}
      </span>
    </section>
  );
}
