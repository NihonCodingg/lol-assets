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
