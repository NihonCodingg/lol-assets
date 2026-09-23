/**
 * Os dois avisos da Riot (RF-21), e os dois lugares onde eles moram (T-49).
 *
 * O texto é **copiado** das políticas, inteiro, em inglês (`lang="en"`): o do
 * Developer Portal e o do Legal Jibber Jabber (ver `site-config.ts`). Nunca atrás
 * de botão, nunca com reticências.
 *
 * **Onde:** no computador, no pé da barra lateral (decisão de 10/09). No
 * telefone, no **fim da página**, dentro da área que rola (decisão de 14/09, que
 * fechou o T-44): na faixa do topo, eles tomavam 180 px de 844 antes da busca.
 * São duas cópias no DOM, e só uma aparece em cada largura; a que não aparece é
 * `display: none`, que também a tira da árvore de acessibilidade.
 */

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function AvisosDaRiot({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p data-aviso="riot" lang="en" className="text-11 leading-solta text-texto-suave">
        {siteConfig.riotLegalNotice}
      </p>
      <p data-aviso="jibber-jabber" lang="en" className="text-11 leading-solta text-texto-suave">
        {siteConfig.riotJibberJabberNotice}
      </p>
    </div>
  );
}

/**
 * Os avisos no fim da página, só no telefone. Vai por último dentro da área que
 * rola — depois da grade, da galeria, do vazio —, e nunca num lugar fixo: fixo, ele
 * voltaria a comer a altura que o T-44 devolveu.
 */
export function AvisosNoFim({ className }: { className?: string }) {
  return (
    <footer
      data-avisos="fim"
      className={cn("mt-2 border-t border-linha px-3.5 pt-3 pb-4 md:hidden", className)}
    >
      <AvisosDaRiot />
    </footer>
  );
}
