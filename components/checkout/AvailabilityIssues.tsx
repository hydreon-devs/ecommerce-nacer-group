"use client";

import type { CartLine } from "@/lib/domain/cart";
import type { LineAvailability } from "@/lib/domain/checkout/availability";
import { formatCop } from "@/lib/format";

const ACTION =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ink/20 px-4 font-body text-sm text-ink transition-colors duration-150 hover:border-moss hover:bg-moss/8 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

interface Props {
  lines: readonly CartLine[];
  results: readonly LineAvailability[];
  onRemove: (key: string) => void;
  onSetQuantity: (key: string, quantity: number) => void;
}

function describe(result: LineAvailability, line: CartLine): string {
  switch (result.status) {
    case "not_found":
      return "Este producto ya no está disponible en la tienda.";
    case "unsellable":
      return "Este producto se agotó o cambió, y ya no lo podemos vender así.";
    case "insufficient":
      return result.maxQuantity && result.maxQuantity > 0
        ? `Solo quedan ${result.maxQuantity} ${result.maxQuantity === 1 ? "unidad" : "unidades"} para ti (pediste ${line.cantidad}).`
        : "Ya no quedan unidades disponibles de este producto.";
    case "price_changed":
      return `El precio cambió: ahora es ${formatCop(result.currentUnitPriceCop ?? 0)} por unidad. El valor final se confirma al pagar.`;
    default:
      return "";
  }
}

/**
 * Lines flagged by the availability re-check, shown at the top of checkout.
 * Blocking ones (not found, unsellable, insufficient) offer remove / adjust;
 * a price change is only informational. Announced politely to screen readers.
 */
export function AvailabilityIssues({ lines, results, onRemove, onSetQuantity }: Props) {
  const flagged = results.filter((r) => r.status !== "ok");
  if (flagged.length === 0) return null;

  const blocking = flagged.some((r) => r.status !== "price_changed");
  const byKey = new Map(lines.map((l) => [l.key, l]));

  return (
    <section
      aria-labelledby="availability-title"
      className="rounded-2xl border border-amber/60 bg-amber/10 p-5"
    >
      <h2 id="availability-title" className="font-display text-xl text-ink">
        {blocking ? "Antes de continuar, revisa tu pedido" : "Un aviso sobre tu pedido"}
      </h2>
      {blocking && (
        <p className="mt-1 font-body text-sm text-ink-muted">
          Algunos productos cambiaron desde que los agregaste. Ajusta o quita lo señalado para seguir.
        </p>
      )}
      <ul className="mt-4 divide-y divide-ink/10" role="list">
        {flagged.map((result) => {
          const line = byKey.get(result.key);
          if (!line) return null;
          const canAdjust =
            result.status === "insufficient" && (result.maxQuantity ?? 0) > 0;
          return (
            <li key={result.key} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-display text-lg leading-tight text-ink">
                  {line.nombre} <span className="font-body text-sm text-ink-muted">· {line.etiqueta}</span>
                </p>
                <p className="mt-1 font-body text-sm text-ink">{describe(result, line)}</p>
              </div>
              {result.status !== "price_changed" && (
                <div className="flex flex-wrap gap-2">
                  {canAdjust && (
                    <button
                      type="button"
                      className={ACTION}
                      onClick={() => onSetQuantity(line.key, result.maxQuantity as number)}
                    >
                      Dejar {result.maxQuantity} {result.maxQuantity === 1 ? "unidad" : "unidades"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={ACTION}
                    onClick={() => onRemove(line.key)}
                    aria-label={`Quitar ${line.nombre}, ${line.etiqueta}`}
                  >
                    Quitar del pedido
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
