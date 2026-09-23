/**
 * Os rótulos tipográficos.
 *
 * `RotuloDeSecao` abre um bloco em texto secundário, em caixa normal: o rótulo
 * em caixa-alta espaçada era um dos traços de template que o [ADR 0024] tirou.
 * `Meta` é a linha de metadado técnico — resolução, formato, bytes, contagem —
 * com algarismos tabulares da própria família, e não mais em mono.
 */
import { cn } from "@/lib/utils";

export function RotuloDeSecao({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-12 font-semibold text-texto-suave",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Meta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("tabular-nums text-11 text-texto-suave", className)}>{children}</span>;
}

/** A etiqueta "skin" do canto do cartão (RF-05: skin é resultado de busca). */
export function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-quadro bg-acento-suave px-1 py-px text-11 text-acento",
        className,
      )}
    >
      {children}
    </span>
  );
}
