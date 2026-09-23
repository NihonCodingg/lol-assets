/**
 * O download rápido e o arrasto (§6 do Plano de Design, autorizados por ele).
 *
 * **Download rápido do square**, direto do tile: a tarefa T1 ("baixar o square do
 * Jax em PNG") cai para um clique. O square vem do catálogo (`thumbnailUrl` do
 * campeão, o PNG de 128 px do ddragon), e a home continua sem baixar fatia
 * nenhuma (RNF-03). O nome do arquivo é o mesmo que o painel daria ao square:
 * `Jax_square.png`.
 *
 * **Arrasto:** o tile e a prévia podem ser arrastados para a área de trabalho
 * ou para o editor. O arquivo vai em resolução total pelo tipo `DownloadURL`,
 * que é do Chrome e do Edge. O Firefox não o conhece: lá o arrasto entrega o
 * que o navegador entrega por conta própria, e o site não promete nada (ver o
 * relatório do T-81).
 */

import type { CatalogChampion } from "@lol-assets/schema";

import { confirmar, type Tom } from "@/components/ui/confirmacoes";
import { saveBlob, thumbnailSrc } from "@/lib/asset-file";

/** `Jax_square.png` — o nome que o índice dá ao square do Jax. */
export function nomeDoSquare(champion: Pick<CatalogChampion, "championId">): string {
  return `${champion.championId}_square.png`;
}

/** O que vai no `dataTransfer` para o Chrome e o Edge salvarem o arquivo. */
export function dadosDeArrasto(url: string, nome: string, formato: string): string {
  const tipo = formato === "jpeg" || formato === "jpg" ? "image/jpeg" : `image/${formato}`;
  return `${tipo}:${nome}:${new URL(url, "https://exemplo.invalid").href}`;
}

/** Põe o arquivo no arrasto, sem mexer no resto do que o navegador já pôs. */
export function arrastarArquivo(evento: { dataTransfer: DataTransfer | null }, url: string, nome: string, formato: string): void {
  if (!evento.dataTransfer) return;
  evento.dataTransfer.effectAllowed = "copy";
  evento.dataTransfer.setData("DownloadURL", dadosDeArrasto(url, nome, formato));
  evento.dataTransfer.setData("text/uri-list", url);
}

export interface Dependencias {
  readonly buscar: (url: string) => Promise<Response>;
  readonly salvar: (blob: Blob, nome: string) => void;
  readonly avisar: (texto: string, tom?: Tom) => void;
}

const PADRAO: Dependencias = {
  buscar: (url) => fetch(url),
  salvar: saveBlob,
  avisar: confirmar,
};

/**
 * Baixa o square de um campeão e avisa com o nome real do arquivo. Devolve se
 * deu certo; a falha também é avisada, porque o botão não tem outro lugar para
 * dizê-la.
 */
export async function baixarSquare(
  champion: CatalogChampion,
  assetsBaseUrl?: string,
  deps: Dependencias = PADRAO,
): Promise<boolean> {
  const url = thumbnailSrc(champion, assetsBaseUrl);
  const nome = nomeDoSquare(champion);
  if (!url) return false;
  try {
    const resposta = await deps.buscar(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    deps.salvar(await resposta.blob(), nome);
    deps.avisar(`Baixado: ${nome}`);
    return true;
  } catch {
    deps.avisar(`Não deu para baixar ${nome}. A fonte não respondeu; tente de novo.`, "falha");
    return false;
  }
}
