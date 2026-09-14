import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test as base } from "@playwright/test";

/**
 * O `test` dos e2e com fixture: o de sempre, com o relógio da página parado
 * uma hora depois de a fixture ter sido gerada.
 *
 * A fixture é determinística (ver `fluxo.spec.ts`), mas o relógio não era. O
 * aviso de índice velho (T-31) acende quando o índice passa de 72 horas, e a
 * fixture diz ter sido gerada em 09/09/2026: a partir de 12/09, todo e2e passou
 * a ver o aviso. O que ele quebrou mostra por que isto importa — o teste do
 * T-31 falhou, e em 375×720 a lista da categoria ficou sem nenhuma linha,
 * porque o aviso tomou a altura que sobrava.
 *
 * A data vem do próprio manifesto da fixture: se ela for gerada de novo, o
 * relógio acompanha. `setFixedTime` só congela `Date`; os temporizadores
 * continuam andando, e os orçamentos de tempo (RNF-01, RNF-02) são medidos no
 * Node, fora da página.
 */
const { generatedAt } = JSON.parse(
  readFileSync(join(__dirname, "fixture", "indice", "manifest.json"), "utf-8"),
) as { generatedAt: string };

export const AGORA_NA_FIXTURE = new Date(Date.parse(generatedAt) + 60 * 60 * 1000);

export const test = base.extend<{ relogioDaFixture: void }>({
  relogioDaFixture: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(AGORA_NA_FIXTURE);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
