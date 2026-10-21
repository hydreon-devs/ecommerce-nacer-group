import { z } from "zod";
import { esVendible } from "./esVendible.ts";
import type { Producto, VarianteProducto } from "./types.ts";

/**
 * Cart domain logic. Pure and framework-free.
 *
 * All prices held here are DISPLAY ONLY snapshots taken when the line was added.
 * The server re-reads prices from the catalog and re-prices at checkout
 * (slice 4); nothing computed in this module is ever trusted for a charge.
 */

/** Sane upper bound per line; larger orders are coordinated with the team. */
export const MAX_LINE_QTY = 20;

export interface CartAdicional {
  id: string;
  nombre: string;
  precioCop: number;
  maxCantidad: number;
  cantidad: number;
}

export interface CartLine {
  /** Identity: variant SKU + selected adicionales with quantities. */
  key: string;
  productoId: string;
  slug: string;
  nombre: string;
  varianteId: string;
  sku: string;
  etiqueta: string;
  precioCop: number;
  adicionales: CartAdicional[];
  cantidad: number;
}

export interface Cart {
  lines: CartLine[];
}

export interface AddToCartInput {
  producto: Producto;
  variante: VarianteProducto;
  /** Selected adicionales as `id -> quantity`. */
  adicionales?: Record<string, number>;
  cantidad: number;
}

export function emptyCart(): Cart {
  return { lines: [] };
}

export function lineKey(
  sku: string,
  adicionales: ReadonlyArray<{ id: string; cantidad: number }>,
): string {
  const parts = adicionales
    .map((a) => `${a.id}:${a.cantidad}`)
    .sort();
  return `${sku}|${parts.join(",")}`;
}

/** Whole number in [1, MAX_LINE_QTY]; non-finite input falls back to 1. */
function clampLineQty(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(value)));
}

/**
 * Sellability gate. `disponibilidad` governs, never `stock`: `Bajo pedido`
 * with stock 0 is sellable (`nacer-dominio` §2). The variant must also belong
 * to the product, so a stale or forged variant cannot enter the cart.
 */
export function canAddToCart(
  producto: Producto,
  variante: VarianteProducto,
): boolean {
  return (
    esVendible(producto) &&
    variante.vendible &&
    producto.variantes.some((v) => v.id === variante.id && v.sku === variante.sku)
  );
}

export type QuickAddTarget =
  | { kind: "add"; variante: VarianteProducto }
  | { kind: "choose" }
  | { kind: "none" };

/**
 * What a listing card offers. Exactly one sellable variant can be added
 * without a choice; several need the product page; none means no control
 * (the availability badge already says Agotado). Goes through `canAddToCart`,
 * so `Bajo pedido` with stock 0 is sellable and stock never gates.
 */
export function quickAddTarget(producto: Producto): QuickAddTarget {
  const sellable = producto.variantes.filter((v) => canAddToCart(producto, v));
  if (sellable.length === 1) return { kind: "add", variante: sellable[0] };
  if (sellable.length > 1) return { kind: "choose" };
  return { kind: "none" };
}

export function addToCart(
  cart: Cart,
  input: AddToCartInput,
): { cart: Cart; added: boolean } {
  const { producto, variante } = input;
  if (!canAddToCart(producto, variante)) return { cart, added: false };

  const cantidad = clampLineQty(input.cantidad);
  const adicionales: CartAdicional[] = producto.adicionales
    .map((a) => ({
      ...a,
      cantidad: Math.min(a.maxCantidad, Math.floor(input.adicionales?.[a.id] ?? 0)),
    }))
    .filter((a) => a.cantidad > 0);
  const key = lineKey(variante.sku, adicionales);

  const existing = cart.lines.find((l) => l.key === key);
  if (existing) {
    return {
      cart: {
        lines: cart.lines.map((l) =>
          l.key === key ? { ...l, cantidad: clampLineQty(l.cantidad + cantidad) } : l,
        ),
      },
      added: true,
    };
  }

  const line: CartLine = {
    key,
    productoId: producto.id,
    slug: producto.slug,
    nombre: producto.nombre,
    varianteId: variante.id,
    sku: variante.sku,
    etiqueta: variante.etiqueta,
    precioCop: variante.precioCop,
    adicionales,
    cantidad,
  };
  return { cart: { lines: [...cart.lines, line] }, added: true };
}

/**
 * Sets a line's quantity. Zero or negative removes the line; fractions are
 * floored and the result is capped at `MAX_LINE_QTY`. Non-finite values and
 * unknown keys leave the cart untouched.
 */
export function setLineQuantity(cart: Cart, key: string, cantidad: number): Cart {
  if (!Number.isFinite(cantidad)) return cart;
  if (!cart.lines.some((l) => l.key === key)) return cart;
  if (Math.floor(cantidad) < 1) return removeLine(cart, key);
  const next = clampLineQty(cantidad);
  return {
    lines: cart.lines.map((l) => (l.key === key ? { ...l, cantidad: next } : l)),
  };
}

export function removeLine(cart: Cart, key: string): Cart {
  return { lines: cart.lines.filter((l) => l.key !== key) };
}

/** Unit price of one line: variant price plus its adicionales. Integer COP. */
export function lineUnitPrice(line: CartLine): number {
  return (
    line.precioCop +
    line.adicionales.reduce((sum, a) => sum + a.precioCop * a.cantidad, 0)
  );
}

export function lineSubtotal(line: CartLine): number {
  return lineUnitPrice(line) * line.cantidad;
}

export function cartSubtotal(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
}

export function cartItemCount(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.cantidad, 0);
}

// ---- Persistence ---------------------------------------------------------

/** Bump when the stored shape changes; older payloads then load as empty. */
export const CART_VERSION = 1;
export const CART_STORAGE_KEY = "nacer.cart";

const adicionalSchema = z
  .object({
    id: z.string().min(1),
    nombre: z.string(),
    precioCop: z.number().int().nonnegative(),
    maxCantidad: z.number().int().positive(),
    cantidad: z.number().int().positive(),
  })
  .refine((a) => a.cantidad <= a.maxCantidad);

const lineSchema = z
  .object({
    key: z.string(),
    productoId: z.string(),
    slug: z.string(),
    nombre: z.string(),
    varianteId: z.string(),
    sku: z.string().min(1),
    etiqueta: z.string(),
    precioCop: z.number().int().nonnegative(),
    adicionales: z.array(adicionalSchema),
    cantidad: z.number().int().min(1).max(MAX_LINE_QTY),
  })
  .refine((l) => l.key === lineKey(l.sku, l.adicionales));

const storedCartSchema = z.object({
  version: z.literal(CART_VERSION),
  lines: z.array(lineSchema),
});

export function serializeCart(cart: Cart): string {
  return JSON.stringify({ version: CART_VERSION, lines: cart.lines });
}

/**
 * Safe deserialization of localStorage content. Anything that is not exactly
 * the current versioned shape (corrupt JSON, old version, tampered values,
 * duplicate lines) yields an empty cart instead of throwing.
 */
export function parseStoredCart(raw: string | null): Cart {
  if (!raw) return emptyCart();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyCart();
  }
  const parsed = storedCartSchema.safeParse(json);
  if (!parsed.success) return emptyCart();
  const keys = new Set(parsed.data.lines.map((l) => l.key));
  if (keys.size !== parsed.data.lines.length) return emptyCart();
  return { lines: parsed.data.lines };
}
