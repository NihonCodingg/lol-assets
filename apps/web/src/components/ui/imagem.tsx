"use client";

/**
 * Imagem — a prévia que entra sem piscar e cai sem quebrar (T-45, RNF-07).
 *
 * Três estados, e cada um tem cara:
 *
 * - **carregando:** a caixa já tem o tamanho final e pulsa. Nada pula de lugar
 *   quando os bytes chegam, porque o tamanho mora na caixa, não na imagem.
 * - **pronta:** a imagem entra em 150 ms de opacidade — o suficiente para não
 *   estalar, curto o bastante para ninguém esperar por ela.
 * - **erro:** o RNF-07 pede que o site diga que a fonte está fora, "em vez de
 *   mostrar quadrado quebrado". A caixa continua com o nome da imagem para o
 *   leitor de tela (`role="img"`), e para o olho diz o que houve.
 *
 * Imagem **decorativa** (`alt` vazio, como a miniatura de um resultado de busca
 * que já tem o nome escrito ao lado) cai calada: o erro não vira uma imagem sem
 * nome para o leitor de tela. E miniatura pequena demais para uma frase pede
 * `erroCompacto`, que mostra só o ícone (T-46).
 *
 * As fontes são de terceiros ([ADR 0012]): quando o ddragon ou o cdragon
 * falham, é aqui que a falha aparece, e ela aparece honesta.
 */

import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Estado = "carregando" | "pronta" | "erro";

export interface ImagemProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onLoad" | "onError"> {
  readonly src: string;
  readonly alt: string;
  /** Tamanho e proporção moram na caixa, para o layout não pular. */
  readonly classeDaCaixa?: string;
  /** No erro, só o ícone: para miniatura onde "A fonte não respondeu" não cabe. */
  readonly erroCompacto?: boolean;
}

export function Imagem({
  src,
  alt,
  className,
  classeDaCaixa,
  erroCompacto = false,
  loading = "lazy",
  decoding = "async",
  ...resto
}: ImagemProps) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const imagem = useRef<HTMLImageElement>(null);

  // Imagem que já estava em cache termina antes de o React ligar os ouvintes, e
  // o `load` (ou o `error`) dela nunca chega. Sem esta conferência ela ficaria
  // invisível para sempre, esperando um evento que já passou.
  //
  // `complete` vale para carregada **e** para quebrada; o que separa as duas é
  // ter pixels. Os formatos do índice são só PNG e JPEG (`models.py`), que
  // sempre têm tamanho próprio — SVG sem tamanho, que também daria 0, não
  // existe aqui. No jsdom a imagem nunca é buscada e `complete` fica falso.
  useEffect(() => {
    const atual = imagem.current;
    if (!atual?.complete) setEstado("carregando");
    else setEstado(atual.naturalWidth > 0 ? "pronta" : "erro");
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-superficie-alta", classeDaCaixa)}>
      {estado === "carregando" && (
        <div aria-hidden="true" className="absolute inset-0 animate-pulsar bg-superficie-alta" />
      )}
      {estado === "erro" ? (
        <div
          {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1.5 text-center text-texto-suave"
        >
          <ImageOff aria-hidden="true" className="size-4 flex-none" />
          {!erroCompacto && <span className="text-11 leading-cartao">A fonte não respondeu</span>}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a URL é de terceiro e não há proxy (ADR 0012)
        <img
          ref={imagem}
          src={src}
          alt={alt}
          // `alt` vazio é decisão, não esquecimento: a imagem é decorativa, e
          // `aria-hidden` diz isso com todas as letras (T-47).
          aria-hidden={alt === "" ? true : undefined}
          loading={loading}
          decoding={decoding}
          onLoad={() => setEstado("pronta")}
          onError={() => setEstado("erro")}
          className={cn(
            "size-full transition-opacity duration-150 ease-saida",
            estado === "pronta" ? "opacity-100" : "opacity-0",
            className,
          )}
          {...resto}
        />
      )}
    </div>
  );
}
