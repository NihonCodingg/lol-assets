/**
 * "A indexação parou" — detectado sem monitoramento (T-31, §11 da Spec).
 *
 * Não há Sentry, não há uptime check, não há ninguém de plantão: o
 * [ADR 0005] escolheu custo de operação zero, e a consequência é que o próprio
 * site precisa ser o alarme.
 *
 * **O alarme mede a última verificação, não a última mudança** (T-51,
 * [ADR 0018]). Até 14/09/2026 ele media o `generatedAt`, que só anda quando o
 * índice muda — ou seja, quando a Riot lança patch. Quatro dias sem patch
 * acenderam o aviso com o workflow rodando a cada ~5 h sem uma falha. Agora a
 * execução sem patch novo carimba `checkedAt` no manifesto, no máximo uma vez por
 * dia, e é o carimbo que para de andar quando a indexação para.
 *
 * **O aviso não bloqueia nada.** Índice de três dias atrás continua servindo
 * arte que existe: as URLs são das fontes, e elas não somem porque o nosso
 * workflow caiu. O que o aviso evita é a pessoa achar que está vendo o patch de
 * hoje quando não está.
 */
import type { IndexManifest } from "@lol-assets/schema";

import { indexAgeHours } from "@/lib/assets-client";

/**
 * 72 horas sem verificação.
 *
 * O workflow roda a cada 6 h (T-13) e carimba no máximo a cada 24 h
 * ([ADR 0018]). Medido em setembro de 2026, o Actions atrasa o agendamento e
 * chega a deixar ~10 h entre duas execuções; mesmo assim o carimbo publicado não
 * passa de ~34 h. Para o aviso acender são mais ~38 h seguidas sem nenhuma
 * execução bem-sucedida — isso não é lentidão da Riot nem fila do Actions, é
 * coisa quebrada. Um limite mais apertado transformaria fim de semana de fila em
 * alarme falso, e alarme falso é como se aprende a ignorar alarme.
 *
 * O `test_carimbo.py` do indexador lê este número: o intervalo do carimbo tem que
 * caber três vezes nele.
 */
export const LIMITE_DE_IDADE_HORAS = 72;

export interface Frescor {
  /** Idade do conteúdo — o que o aviso escreve ("gerado há 4 dias"). */
  readonly horas: number;
  /** A indexação automática não confere o índice há mais que o limite. */
  readonly velho: boolean;
  /** Quando o índice foi gerado, para o aviso mostrar a data. */
  readonly geradoEm: Date;
}

export function medirFrescor(manifest: IndexManifest, agora: Date = new Date()): Frescor {
  return {
    horas: indexAgeHours(manifest, agora),
    velho: horasSemVerificar(manifest, agora) > LIMITE_DE_IDADE_HORAS,
    geradoEm: new Date(manifest.generatedAt),
  };
}

/**
 * Horas desde a última vez que a indexação conferiu o índice ([ADR 0018]).
 *
 * O carimbo, quando há; senão a geração — gerar também é conferir, e é o que
 * vale nos manifestos anteriores ao contrato 1.3.0. O mais recente dos dois: um
 * carimbo mais velho que a geração não envelhece um índice recém-gerado. Carimbo
 * ilegível cai na geração, que é o lado de avisar. Mesma regra do `last_checked`
 * do indexador.
 */
export function horasSemVerificar(manifest: IndexManifest, agora: Date = new Date()): number {
  const gerado = Date.parse(manifest.generatedAt);
  const conferido = Date.parse(manifest.checkedAt ?? manifest.generatedAt);
  const ultima = Number.isNaN(conferido) ? gerado : Math.max(gerado, conferido);
  return (agora.getTime() - ultima) / 3_600_000;
}

/** `9 de setembro de 2026 às 21:24` — data legível, não ISO. */
export function dataLegivel(quando: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(quando);
}

/** "3 dias", "5 dias" — a idade em palavras, arredondada para baixo. */
export function idadeEmPalavras(horas: number): string {
  if (horas < 48) return `${Math.floor(horas)} horas`;
  return `${Math.floor(horas / 24)} dias`;
}
