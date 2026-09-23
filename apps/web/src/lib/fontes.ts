/**
 * A família do site, servida pelo próprio app ([ADR 0024]).
 *
 * `next/font` baixa o arquivo no build e o serve do nosso domínio: sem
 * requisição ao `fonts.googleapis.com` em tempo de execução, sem *layout shift*
 * e sem um terceiro vendo quem visita.
 *
 * Uma família só, a Schibsted Grotesk, com três pesos: 400 (texto), 600 (nomes
 * e botões) e 800 (marca e título do painel). O arquivo latino é variável, um
 * woff2 só para os três. O mono saiu: resolução, peso e contagem usam os
 * algarismos tabulares desta mesma família (`tabular-nums`).
 *
 * **`optional`, e não `swap`.** Com `swap`, a troca da reserva pela Schibsted
 * no meio da chegada quebrava o aviso legal da barra lateral com uma linha a
 * mais: 18 px de salto, medido no e2e de desempenho. O CLS 0 é limite duro do
 * Plano de Design (§7). Com `optional`, o navegador espera a fonte (que vem
 * pré-carregada) por um instante e, se ela não chegou, fica com a reserva
 * naquela visita — sem trocar nada depois. Da segunda visita em diante ela vem
 * do cache.
 */
import { Schibsted_Grotesk } from "next/font/google";

export const fonteInterface = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--fonte-interface",
  display: "optional",
});
