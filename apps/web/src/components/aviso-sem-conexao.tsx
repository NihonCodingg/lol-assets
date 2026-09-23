"use client";

/**
 * Sem conexão (T-85, §6 do Plano de Design): avisa, e o que já foi carregado
 * continua utilizável — a grade, a busca e os painéis já abertos estão na
 * memória; o que depende da rede (um download, uma categoria nova) espera.
 *
 * Fixo no topo do canto, e não uma faixa: ele chega depois da página, e uma
 * faixa empurraria a grade (o salto de layout da chegada é zero desde o T-59).
 * Some sozinho quando a conexão volta.
 */

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function AvisoSemConexao() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  return (
    // A região existe sempre: região viva criada junto com o texto não é
    // anunciada por todo leitor de tela.
    <div role="status" data-conexao={offline ? "fora" : "ok"} className="contents">
      {offline && (
        <p className="fixed inset-x-3 top-16 z-40 flex items-start gap-2.5 rounded-painel border border-linha-forte bg-superficie-alta p-3 text-12 leading-cartao text-texto md:inset-x-auto md:right-4 md:w-[360px]">
          <WifiOff aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 flex-none text-acento" />
          <span>
            <strong className="font-semibold">Sem conexão.</strong> O que já carregou continua aqui;
            downloads e categorias novas esperam a conexão voltar.
          </span>
        </p>
      )}
    </div>
  );
}
