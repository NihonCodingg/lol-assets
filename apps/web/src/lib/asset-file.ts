/**
 * Resolução de URL, download e conversão para PNG — o coração do ADR 0001.
 *
 * O CDN entrega os bytes de origem; o PNG é gerado **no navegador**, no clique.
 * Nada aqui re-encoda no servidor, e nada aqui converte antes de o usuário pedir.
 *
 * As primitivas do navegador entram por injeção para o módulo ser testável fora
 * dele. O caminho real com canvas de verdade é coberto pelo e2e (T-29).
 */
import type { Asset } from "@lol-assets/schema";

export interface Bitmap {
  readonly width: number;
  readonly height: number;
  close: () => void;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext: (id: "2d") => { drawImage: (image: Bitmap, x: number, y: number) => void } | null;
  toBlob: (callback: (blob: Blob | null) => void, type?: string) => void;
}

export interface PngDeps {
  toBitmap: (blob: Blob) => Promise<Bitmap>;
  makeCanvas: (width: number, height: number) => CanvasLike;
}

/**
 * A URL pública do asset.
 *
 * Sem `storageKey` o asset não foi copiado para o bucket — é o caso das versões
 * anteriores (ADR 0007). Aí vale a URL da fonte, e o download funciona igual.
 */
export function assetUrl(asset: Asset, assetsBaseUrl?: string): string {
  if (asset.storageKey && assetsBaseUrl) {
    return `${assetsBaseUrl.replace(/\/+$/, "")}/${asset.storageKey}`;
  }
  return asset.sourceUrl;
}

/**
 * A miniatura de um cartão do catálogo, pela mesma regra do `assetUrl`.
 *
 * Sem storage (ADR 0012) o catálogo traz `thumbnailUrl` apontando para a fonte;
 * com storage traria `thumbnailKey`. O front lê os dois, e é isso que faz a
 * volta para a opção A não exigir mexer no front.
 */
export function thumbnailSrc(
  entry: { thumbnailKey?: string; thumbnailUrl?: string },
  assetsBaseUrl?: string,
): string | undefined {
  if (entry.thumbnailKey && assetsBaseUrl) {
    return `${assetsBaseUrl.replace(/\/+$/, "")}/${entry.thumbnailKey}`;
  }
  return entry.thumbnailUrl;
}

/** Só faz sentido converter o que ainda não é PNG (ADR 0001 regra 4). */
export function canConvertToPng(asset: Asset): boolean {
  return asset.format !== "png";
}

/** `Jax_000_splash_centered.jpg` → `Jax_000_splash_centered.png`. */
export function pngFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") + ".png";
}

export function formatBytes(total: number): string {
  if (total < 1024) return `${total} B`;
  if (total < 1024 * 1024) return `${Math.round(total / 1024)} KB`;
  return `${(total / 1024 / 1024).toFixed(1)} MB`;
}

/** O lado maior do PNG que sai de um vetor (T-93): o bastante para um vídeo em 4K. */
export const LADO_DO_PNG_DE_VETOR = 1024;

/**
 * A medida que a ficha mostra. Vetor não tem resolução — os 34×34 que o SVG
 * declara enganariam quem procura arte para vídeo —, então a ficha diz o que a
 * pessoa recebe: o PNG no tamanho de `LADO_DO_PNG_DE_VETOR`.
 */
export function medidaLegivel(asset: Pick<Asset, "width" | "height" | "format">): string {
  if (asset.format !== "svg") return `${asset.width}×${asset.height}`;
  const escala = LADO_DO_PNG_DE_VETOR / Math.max(asset.width, asset.height);
  return `Vetor, PNG ${Math.round(asset.width * escala)}×${Math.round(asset.height * escala)}`;
}

/** A ficha que o RF-09 exige aparecer **antes** de qualquer download. */
export function assetSummary(asset: Asset): string {
  return `${medidaLegivel(asset)} · ${asset.format} · ${formatBytes(asset.bytes)} · ${asset.source}`;
}

function defaultDeps(): PngDeps {
  return {
    toBitmap: (blob) => createImageBitmap(blob),
    makeCanvas: (width, height) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as CanvasLike;
    },
  };
}

/**
 * Converte para PNG no cliente, no clique.
 *
 * O bitmap vem de um `Blob` obtido por `fetch`, não de um `<img>` de outra
 * origem — é por isso que o canvas não é contaminado, como medido nos spikes.
 */
export async function convertToPng(blob: Blob, deps: PngDeps = defaultDeps()): Promise<Blob> {
  const bitmap = await deps.toBitmap(blob);
  try {
    const canvas = deps.makeCanvas(bitmap.width, bitmap.height);
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("canvas sem contexto 2d");
    contexto.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((resultado) => {
        if (resultado) resolve(resultado);
        else reject(new Error("o canvas não devolveu um PNG"));
      }, "image/png");
    });
  } finally {
    bitmap.close();
  }
}

/**
 * O PNG de um vetor, no tamanho que a gente escolhe (T-93, ADR 0026).
 *
 * O `createImageBitmap` não abre SVG em todo navegador, e abriria no tamanho que
 * o desenho declara (34 px). Uma `<img>` abre em qualquer um, e desenhar ela num
 * canvas grande rasteriza o vetor de novo, nítido, no tamanho do canvas.
 */
export async function svgParaPng(
  blob: Blob,
  largura: number,
  altura: number,
  lado = LADO_DO_PNG_DE_VETOR,
): Promise<Blob> {
  const escala = lado / Math.max(largura, altura);
  const comTipo = blob.type === "image/svg+xml" ? blob : new Blob([blob], { type: "image/svg+xml" });
  const endereco = URL.createObjectURL(comTipo);
  try {
    const imagem = new Image();
    imagem.src = endereco;
    await imagem.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(altura * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("canvas sem contexto 2d");
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((resultado) => {
        if (resultado) resolve(resultado);
        else reject(new Error("o canvas não devolveu um PNG"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

/** Hash dos bytes recebidos, para conferir contra o `sha256` do índice. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Entrega o arquivo ao usuário. Fora do navegador, é no-op testável. */
export function saveBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 2000);
}
