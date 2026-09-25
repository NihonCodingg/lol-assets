/**
 * Quando vale adiantar a fatia do campeão (T-61).
 *
 * A fatia `champion` tem 1,3 MB comprimida (12,7 MB aberta) e chegava em ~1,1 s
 * **depois** do clique no primeiro campeão — o painel abria vazio e esperava.
 * Ela é uma só para os 173 campeões, então qualquer sinal de que a pessoa vai
 * abrir um campeão serve para começar: apontar a grade, focar um cartão, digitar
 * na busca. Entre apontar e clicar vão alguns centésimos de segundo, e é esse o
 * tempo ganho.
 *
 * A home continua sem buscar fatia nenhuma **ao abrir** (RNF-03): o que muda é
 * a fatia vir no primeiro sinal de intenção, e não no clique. Sob demanda,
 * ainda.
 *
 * Quem pediu para economizar dados não recebe nada adiantado.
 */

import type { Asset } from "@lol-assets/schema";

import { assetUrl } from "@/lib/asset-file";

export interface InformacaoDeConexao {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/** Em conexão lenta ou com economia de dados, espera o clique, como antes. */
export function devePreaquecer(conexao: InformacaoDeConexao | undefined): boolean {
  if (!conexao) return true;
  if (conexao.saveData) return false;
  return !/(^|-)2g$/.test(conexao.effectiveType ?? "");
}

/** A conexão do navegador, quando ele conta. Nem todo navegador conta. */
export function conexaoDoNavegador(): InformacaoDeConexao | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: InformacaoDeConexao }).connection;
}

/**
 * Quanto o ponteiro precisa parar num cartão, ou o destaque num resultado, para
 * contar como intenção (T-73). Desde o ADR 0023 cada campeão tem a sua fatia, e
 * atravessar a grade até o Jax passaria por vinte cartões: sem espera, seriam
 * vinte fatias baixadas à toa.
 */
export const ESPERA_DA_INTENCAO_MS = 150;

/** As splashes já pedidas nesta visita: pedir de novo não custa, mas polui. */
const adiantadas = new Set<string>();

/**
 * A splash da skin que o painel vai abrir, pedida no sinal de intenção (T-89).
 *
 * O dono achou o painel lento para mostrar as artes. A prévia 16:9 é a primeira
 * coisa que a pessoa procura, e o endereço dela só existe na fatia do campeão:
 * com a fatia adiantada pela intenção, dá para pedir a splash no mesmo embalo,
 * e o clique encontra a imagem já chegando. É uma imagem só (~155 KB); as
 * miniaturas das skins, que somam quase 1 MB, continuam esperando o clique.
 *
 * Sem `crossOrigin`, como o `<img>` da vitrine: a mesma requisição, o mesmo
 * cache. Devolve o endereço pedido, ou nada quando a fatia não tem a splash.
 */
export function adiantarSplash(
  assets: readonly Asset[],
  skinNum: number,
  assetsBaseUrl?: string,
): string | undefined {
  const splash = assets.find((a) => a.type === "splash_centered" && a.skinNum === skinNum);
  if (!splash || typeof Image === "undefined") return undefined;
  const url = assetUrl(splash, assetsBaseUrl);
  if (adiantadas.has(url)) return url;
  adiantadas.add(url);
  const imagem = new Image();
  imagem.decoding = "async";
  imagem.src = url;
  return url;
}
