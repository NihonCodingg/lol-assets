"use client";

/**
 * A ampliação: a arte no tamanho que a tela aguenta, para conferir o detalhe
 * antes de baixar (T-47b).
 *
 * É um diálogo por cima do painel, e o `Escape` dele **não** mora aqui: o painel
 * do campeão já trata a tecla, na ordem ampliação → chromas → painel (ver
 * `painel-do-campeao.tsx`). Por isso o Radix não fecha sozinho no `Escape` — dois
 * donos para a mesma tecla fechariam a ampliação e o painel de uma vez.
 *
 * A arte aparece no tamanho do arquivo, no máximo: um ícone de 64 px continua com
 * 64 px, nítido, em vez de esticado até a tela. Clicar fora da arte fecha.
 *
 * O foco vai para o diálogo ao abrir, e não para o fechar, pelo mesmo motivo do
 * painel: a dica do fechar abriria sozinha por cima da arte.
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef } from "react";

import type { Asset } from "@lol-assets/schema";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { assetSummary } from "@/lib/asset-file";
import { rotuloDoTipo } from "@/lib/asset-panel";

export interface AmpliacaoProps {
  readonly asset: Asset;
  readonly url: string;
  readonly onFechar: () => void;
}

export function Ampliacao({ asset, url, onFechar }: AmpliacaoProps) {
  const conteudo = useRef<HTMLDivElement>(null);
  const nome = `${asset.names.pt_BR} — ${rotuloDoTipo(asset.type)}`;

  return (
    <Dialog.Root open onOpenChange={(aberta) => !aberta && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-fundo/90" />
        <Dialog.Content
          ref={conteudo}
          tabIndex={-1}
          data-foco-contido=""
          aria-describedby={undefined}
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            conteudo.current?.focus();
          }}
          onEscapeKeyDown={(evento) => evento.preventDefault()}
          // O conteúdo cobre a tela; clicar no vazio em volta da arte fecha.
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) onFechar();
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 p-6"
        >
          <Dialog.Title className="sr-only">Ampliação de {nome}</Dialog.Title>
          <BotaoIcone
            rotulo="Fechar ampliação"
            dica="Fechar (Esc)"
            icone={<X aria-hidden="true" strokeWidth={1.75} className="size-4" />}
            onClick={onFechar}
            className="absolute top-4 right-4 bg-superficie/80 text-texto hover:bg-superficie"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012) */}
          <img
            src={url}
            alt={nome}
            data-ampliacao=""
            className="max-h-[78vh] max-w-full rounded-medio object-contain"
          />
          <p className="mt-2 text-13 font-medium text-texto-forte">{nome}</p>
          <p className="font-mono text-11 text-texto-suave">{assetSummary(asset)}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
