"use client";

/**
 * A ampliação: a arte no tamanho que a tela aguenta, para conferir o detalhe
 * antes de baixar (T-47b).
 *
 * É um diálogo por cima do painel, e o `Escape` dele **não** mora aqui: quem a
 * abre já trata a tecla — o painel do campeão, na ordem ampliação → chromas →
 * painel, e a categoria, na ordem ampliação → voltar aos campeões (T-48). Por
 * isso o Radix não fecha sozinho no `Escape` — dois donos para a mesma tecla
 * fechariam a ampliação e o que está embaixo dela de uma vez.
 *
 * A arte aparece no tamanho do arquivo, no máximo: um ícone de 64 px continua com
 * 64 px, nítido, em vez de esticado até a tela. Clicar fora da arte fecha.
 *
 * **As ações moram aqui desde o T-53**: a ficha, os dois downloads e o copiar.
 * Em tela de toque não há *hover*, e a faixa de ações do tile deixou de aparecer
 * sozinha por cima da arte — o caminho do toque passou a ser este.
 *
 * O foco vai para o diálogo ao abrir, e não para o fechar, pelo mesmo motivo do
 * painel: a dica do fechar abriria sozinha por cima da arte.
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef } from "react";

import type { Asset } from "@lol-assets/schema";

import { AcoesDoAsset } from "@/components/painel-de-asset";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { GlifoDeProporcao } from "@/components/ui/quadro";
import { formatBytes } from "@/lib/asset-file";
import { rotuloDoTipo } from "@/lib/asset-panel";
import { useFocoDeVolta } from "@/lib/foco";
import { useFecharComVoltar } from "@/lib/voltar";

export interface AmpliacaoProps {
  readonly asset: Asset;
  readonly url: string;
  readonly onFechar: () => void;
  /** As duas ações que tocam o mundo entram por injeção, como no painel. */
  readonly baixar?: (asset: Asset, comoPng: boolean, url: string) => Promise<void>;
  readonly copiar?: (texto: string) => Promise<void>;
}

export function Ampliacao({ asset, url, onFechar, baixar, copiar }: AmpliacaoProps) {
  const conteudo = useRef<HTMLDivElement>(null);
  // Voltar fecha a ampliação, não o site (T-70).
  useFecharComVoltar(true, onFechar);
  const foco = useFocoDeVolta();
  const nome = `${rotuloDoTipo(asset.type)} de ${asset.names.pt_BR}`;

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
            foco.guardar();
            conteudo.current?.focus();
          }}
          // Ao fechar, o foco volta ao botão de ampliar que abriu (T-71).
          onCloseAutoFocus={foco.devolver}
          onEscapeKeyDown={(evento) => evento.preventDefault()}
          // O conteúdo cobre a tela; clicar no vazio em volta da arte fecha.
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) onFechar();
          }}
          // Em tela de toque, todo botão daqui tem 44 px, como no painel
          // (T-49): a ampliação virou caminho de download no T-53.
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 p-6 pointer-coarse:[&_button]:min-h-controle-xl pointer-coarse:[&_button]:min-w-controle-xl"
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
            className="max-h-[78vh] max-w-full rounded-quadro object-contain"
          />
          <p className="mt-2 text-13 font-semibold text-texto">{nome}</p>
          {/* RF-09: a ficha, em colunas de texto, sem o ponto médio (ADR 0024). */}
          <p className="flex items-center gap-3 text-12 tabular-nums text-texto-suave">
            <span className="inline-flex items-center gap-1.5">
              <GlifoDeProporcao largura={asset.width} altura={asset.height} />
              {asset.width}×{asset.height}
            </span>
            <span>{asset.format.toUpperCase()}</span>
            <span>{formatBytes(asset.bytes)}</span>
            <span>{asset.source}</span>
          </p>
          {/* Baixar daqui (T-53). Em tela de toque a faixa do tile não aparece,
              e este é o caminho: tocar na arte, conferir grande, baixar. */}
          <AcoesDoAsset asset={asset} url={url} baixar={baixar} copiar={copiar} className="mt-1" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
