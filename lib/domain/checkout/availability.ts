import { z } from "zod";
import { canAddToCart, MAX_LINE_QTY, type CartAdicional, type CartLine } from "../cart.ts";
import type { Producto } from "../types.ts";

/**
 * Availability re-check when entering `/checkout`. NON-reserving: it only
 * reads and classifies; stock is held later, at Summary -> Pay (slice 4).
 *
 * Pure: the server hands in a FRESH catalog (not the 5-minute cache) plus the
 * available units per variant (`v_variant_availability.available_units`).
 * `disponibilidad` governs through `canAddToCart`: `Bajo pedido` with zero
 * units is sellable. Units are only compared for `Disponible` products.
 */

/** What the re-check needs from a cart line (a `CartLine` satisfies it). */
export type CheckLine = Pick<
  CartLine,
  "key" | "productoId" | "varianteId" | "sku" | "precioCop" | "cantidad"
> & { adicionales: Pick<CartAdicional, "id" | "precioCop" | "cantidad">[] };

export interface FreshCatalog {
  products: readonly Producto[];
  /** `available_units` by `variant_id`; a variant without a row counts as 0. */
  unitsByVariant: ReadonlyMap<string, number>;
}

export type LineStatus =
  /** Fine as is. */
  | "ok"
  /** Product or variant no longer exists / is not published / does not match the SKU. */
  | "not_found"
  /** Agotado, variant not sellable, or an adicional no longer offered. */
  | "unsellable"
  /** `Disponible`, but fewer units than the quantity asked. */
  | "insufficient"
  /** Sellable, but the price differs from when it was added. Display only. */
  | "price_changed";

export interface LineAvailability {
  key: string;
  status: LineStatus;
  /** Fresh unit price (variant + adicionales); null when the line is not found. */
  currentUnitPriceCop: number | null;
  /** Units available for the variant; only reported for `insufficient`. */
  availableUnits: number | null;
  /** Largest quantity this line can have right now; only for `insufficient`. */
  maxQuantity: number | null;
}

const BLOCKING: ReadonlySet<LineStatus> = new Set(["not_found", "unsellable", "insufficient"]);

/** The customer cannot continue while any line is blocking. Price changes do not block. */
export function hasBlockingIssue(results: readonly LineAvailability[]): boolean {
  return results.some((r) => BLOCKING.has(r.status));
}

function result(
  key: string,
  status: LineStatus,
  extra: Partial<Omit<LineAvailability, "key" | "status">> = {},
): LineAvailability {
  return {
    key,
    status,
    currentUnitPriceCop: null,
    availableUnits: null,
    maxQuantity: null,
    ...extra,
  };
}

export function classifyCartLines(
  lines: readonly CheckLine[],
  fresh: FreshCatalog,
): LineAvailability[] {
  const productsById = new Map(fresh.products.map((p) => [p.id, p]));

  // Lines of the same variant (different adicionales) draw from the same units.
  const requestedByVariant = new Map<string, number>();
  for (const l of lines) {
    requestedByVariant.set(l.varianteId, (requestedByVariant.get(l.varianteId) ?? 0) + l.cantidad);
  }

  return lines.map((l) => {
    const producto = productsById.get(l.productoId);
    const variante = producto?.variantes.find((v) => v.id === l.varianteId && v.sku === l.sku);
    if (!producto || !variante) return result(l.key, "not_found");

    if (!canAddToCart(producto, variante)) return result(l.key, "unsellable");

    let unit = variante.precioCop;
    for (const chosen of l.adicionales) {
      const offered = producto.adicionales.find((a) => a.id === chosen.id);
      if (!offered || chosen.cantidad > offered.maxCantidad) {
        return result(l.key, "unsellable", { currentUnitPriceCop: variante.precioCop });
      }
      unit += offered.precioCop * chosen.cantidad;
    }

    if (producto.disponibilidad === "Disponible") {
      const units = fresh.unitsByVariant.get(variante.id) ?? 0;
      const requested = requestedByVariant.get(l.varianteId) ?? l.cantidad;
      if (requested > units) {
        const others = requested - l.cantidad;
        return result(l.key, "insufficient", {
          currentUnitPriceCop: unit,
          availableUnits: units,
          maxQuantity: Math.min(MAX_LINE_QTY, Math.max(0, units - others)),
        });
      }
    }

    const previous =
      l.precioCop + l.adicionales.reduce((sum, a) => sum + a.precioCop * a.cantidad, 0);
    return result(l.key, unit === previous ? "ok" : "price_changed", {
      currentUnitPriceCop: unit,
    });
  });
}

// ---- Server action input ------------------------------------------------------

/** Anything above this is not a real cart; the action rejects it outright. */
export const MAX_CHECK_LINES = 50;

const checkLineSchema = z.object({
  key: z.string().min(1).max(500),
  productoId: z.string().min(1).max(100),
  varianteId: z.string().min(1).max(100),
  sku: z.string().min(1).max(100),
  precioCop: z.number().int().nonnegative(),
  cantidad: z.number().int().min(1).max(MAX_LINE_QTY),
  adicionales: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        precioCop: z.number().int().nonnegative(),
        cantidad: z.number().int().min(1).max(MAX_LINE_QTY),
      }),
    )
    .max(20),
});

/** Untrusted client input -> lines (unknown extra fields are dropped), or null. */
export function parseCheckLines(input: unknown): CheckLine[] | null {
  const parsed = z.array(checkLineSchema).max(MAX_CHECK_LINES).safeParse(input);
  return parsed.success ? parsed.data : null;
}
