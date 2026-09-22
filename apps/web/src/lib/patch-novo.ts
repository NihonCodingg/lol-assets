/**
 * "Já saiu patch novo" — o índice está atrasado em relação à Riot (T-77).
 *
 * O aviso de índice velho (T-31, [ADR 0018]) mede outra coisa: se a indexação
 * **parou**. Este mede se a Riot já publicou um patch que o índice ainda não
 * tem. Nas horas normais entre o lançamento e a próxima indexação (o workflow
 * roda a cada 6 h e leva ~40 min), ele acende — e por isso diz que a
 * atualização vem sozinha, em vez de soar como defeito.
 *
 * A objeção que o ADR 0018 anotou era uma requisição ao ddragon em toda visita.
 * A resposta fica guardada por **6 horas** no navegador, o intervalo da própria
 * indexação: quem abre o site dez vezes num dia pede a lista no máximo quatro.
 * E ela é pedida depois de a página assentar, fora do caminho da chegada.
 */

/** Configurável para o e2e apontar para a fixture, sem tocar a rede de verdade. */
export const URL_DAS_VERSOES =
  process.env.NEXT_PUBLIC_VERSIONS_URL ?? "https://ddragon.leagueoflegends.com/api/versions.json";

/** Quanto a resposta vale no navegador: o intervalo da indexação agendada. */
export const VALIDADE_MS = 6 * 60 * 60 * 1000;

const CHAVE_DO_CACHE = "lol-assets:versao-mais-nova";
const CHAVE_DA_DISPENSA = "lol-assets:patch-dispensado";
const VERSAO = /^\d+\.\d+\.\d+$/;

/**
 * A primeira versão de verdade da lista do ddragon. Ela vem da mais nova para a
 * mais velha, e termina com entradas antigas fora do padrão (`lolpatch_7.20`).
 */
export function versaoMaisNova(lista: unknown): string | undefined {
  if (!Array.isArray(lista)) return undefined;
  return lista.find((v): v is string => typeof v === "string" && VERSAO.test(v));
}

/** `16.19.1` é mais nova que `16.18.1`; `16.10.1`, mais nova que `16.9.1`. */
export function eMaisNova(candidata: string, atual: string): boolean {
  const a = candidata.split(".").map(Number);
  const b = atual.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** `localStorage` pode lançar (modo privado): sem ele, o aviso só não lembra nada. */
function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string): void {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento, a próxima visita pergunta de novo. Nada quebra.
  }
}

/**
 * A versão mais nova que a Riot publicou, do cache se ele ainda vale. Falha de
 * rede é silêncio: o aviso é informação, e a falta dele não pode virar erro.
 */
export async function buscarVersaoMaisNova(
  buscar: (url: string) => Promise<Response> = (url) => fetch(url),
  agora: number = Date.now(),
): Promise<string | undefined> {
  const guardado = ler(CHAVE_DO_CACHE);
  if (guardado) {
    try {
      const { versao, em } = JSON.parse(guardado) as { versao: string; em: number };
      if (agora - em < VALIDADE_MS && VERSAO.test(versao)) return versao;
    } catch {
      // Cache ilegível: pede de novo.
    }
  }
  try {
    const resposta = await buscar(URL_DAS_VERSOES);
    if (!resposta.ok) return undefined;
    const versao = versaoMaisNova(await resposta.json());
    if (versao) gravar(CHAVE_DO_CACHE, JSON.stringify({ versao, em: agora }));
    return versao;
  } catch {
    return undefined;
  }
}

/** Quem dispensou o aviso de um patch não o vê de novo — até sair o próximo. */
export function foiDispensado(versao: string): boolean {
  return ler(CHAVE_DA_DISPENSA) === versao;
}

export function dispensar(versao: string): void {
  gravar(CHAVE_DA_DISPENSA, versao);
}
