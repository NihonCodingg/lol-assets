import type { Metadata } from "next";

import { ProvedorDeNavegacao } from "@/components/navegacao-context";
import { AvisoSemConexao } from "@/components/aviso-sem-conexao";
import { Rodape } from "@/components/rodape";
import { Topo } from "@/components/topo";
import { RegiaoDeConfirmacoes } from "@/components/ui/confirmacoes";
import { fonteInterface } from "@/lib/fontes";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.displayName,
  description: siteConfig.description,
  // Sem divulgação ([ADR 0016]). O `X-Robots-Tag` do `next.config.ts` já diz o
  // mesmo em toda resposta; o `<meta>` é para quem só vê o HTML — uma cópia
  // salva, um cache intermediário.
  robots: siteConfig.indexable ? undefined : { index: false, follow: false },
};

/**
 * A casca: o topo com a marca e a busca, a barra lateral e o conteúdo (T-80).
 *
 * Ela mora no layout, e não na página, por causa do RF-21: o aviso da Riot é
 * obrigatório em **toda** página, e o layout é o único caminho por onde toda
 * página passa. O aviso fica no pé da barra lateral no computador, e no fim da
 * página no telefone.
 *
 * `h-screen` com `overflow-hidden`: as colunas rolam por dentro, não a janela. É
 * o que faz a barra lateral ficar parada enquanto 5.042 ícones passam ao lado.
 *
 * **Menos em tela baixa (T-67).** Até 500 px de altura — zoom de 200% ou 400%,
 * telefone deitado —, a casca fixa não tinha o que ceder: o cromo ocupava a
 * tela inteira e a arte ficava com 0 px. Ali (`baixa:`) a janela volta a rolar,
 * o cromo sobe e sai de cena, e a galeria virtual ganha a altura da tela.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={fonteInterface.variable}>
      {/* No telefone, três linhas: o topo, as categorias em abas que rolam de
          lado e o conteúdo. No computador, o topo atravessa as duas colunas, e
          embaixo ficam a barra lateral e o conteúdo.

          A coluna do telefone é `minmax(0, 1fr)`, e não a implícita: a
          implícita cresce até caber o conteúdo, e a linha de categorias que
          rola de lado (T-49) tem 668 px — a página inteira ficava com 668, e o
          telefone a mostrava reduzida. */}
      <body className="grid h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_1fr] overflow-hidden bg-fundo text-texto md:grid-cols-[var(--spacing-barra-lateral)_minmax(0,1fr)] md:grid-rows-[auto_1fr] baixa:h-auto baixa:min-h-screen baixa:overflow-visible">
        {/* O provedor envolve os dois porque a barra lateral tem os botões de
            categoria e a página tem o conteúdo — e layout não recebe prop de
            página. Ver `navegacao-context.tsx`. */}
        <ProvedorDeNavegacao>
          <Topo />
          <Rodape />
          <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
        </ProvedorDeNavegacao>
        <RegiaoDeConfirmacoes />
        <AvisoSemConexao />
      </body>
    </html>
  );
}
