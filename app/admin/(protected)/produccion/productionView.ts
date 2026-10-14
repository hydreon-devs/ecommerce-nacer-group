import type { ProductionLine, ProductionOrder } from "@/lib/data/production";
import { lineChrysalis, optionQty } from "../../../../lib/domain/chrysalis.ts";
import { nextStep, type NextStep } from "../../../../lib/domain/fulfillmentFlow.ts";
import { deriveOrderState, type OrderState } from "../../../../lib/domain/orderState.ts";
import { formatLongDay } from "../../../../lib/domain/productionDay.ts";
import { DASH, formatDate, text } from "../pedidos/orderView.ts";

/**
 * Modelo de vista de Producción: convierte los pedidos de un día en filas de
 * tabla y en el detalle del panel lateral, con el formato y los respaldos en
 * un solo lugar. No lleva dinero ni contacto del cliente. Sin React, para que
 * `node --test` lo cargue.
 */

export interface ProductionLineView {
  sku: string;
  productName: string;
  /** Vacío si la variante no aporta nada distinto de "presentación estándar". */
  variant: string;
  qty: number;
  /** `null` = conteo sin definir. */
  chrysalis: number | null;
  chrysalisLabel: string;
  /** "Nombre ×cantidad por unidad". */
  extras: string[];
  imageUrl: string | null;
}

export interface ProductionDetailView {
  humanNumber: string;
  state: OrderState;
  /** Todo lo que la tarjeta no muestra vive aquí. */
  deliveryDate: string;
  deliveryMethod: string;
  occasion: string;
  /** "Ciudad, barrio"; raya si el cliente no ha enviado el formulario. */
  place: string;
  totalQty: number;
  /** `null` si ninguna línea tiene conteo definido. */
  chrysalis: number | null;
  chrysalisLabel: string;
  lines: ProductionLineView[];
  /** `null` mientras el cliente no envíe el formulario. */
  card: { from: string; to: string; message: string } | null;
  observation: string;
  advisor: string;
  supplierName: string | null;
  artisanName: string | null;
}

export interface ProductionRowView {
  id: string;
  humanNumber: string;
  state: OrderState;
  deliveryMethod: string;
  /** "3 productos": suma de cantidades del pedido. */
  productCount: string;
  /** Crisálidas del pedido (`null` = ninguna línea con conteo); alimenta el total del día. */
  chrysalis: number | null;
  step: NextStep | null;
  detail: ProductionDetailView;
}

export interface ProductionDayView {
  dayLabel: string;
  orderCount: number;
  chrysalisTotal: number;
  rows: ProductionRowView[];
}

// Lo que ya pasó por producción se ordena al final, no se oculta.
const STATE_RANK: Partial<Record<OrderState, number>> = {
  en_construccion: 0,
  preparado: 1,
  en_despacho: 2,
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "color: azul"; la presentación "estándar" no distingue nada y se omite. */
export function variantLabel(attributes: Record<string, unknown> | null): string {
  if (!attributes) return "";
  return Object.entries(attributes)
    .filter(([, value]) => typeof value === "string" && value.trim() !== "")
    .filter(([key, value]) => !(key === "presentacion" && normalize(value as string).trim() === "estandar"))
    .map(([key, value]) => `${key}: ${(value as string).trim()}`)
    .join(", ");
}

function extrasLabels(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  const labels: string[] = [];
  for (const option of options) {
    if (typeof option !== "object" || option === null) continue;
    const { nombre, qty } = option as { nombre?: unknown; qty?: unknown };
    if (typeof nombre !== "string" || nombre.trim() === "") continue;
    labels.push(`${nombre.trim()} ×${optionQty(qty)}`);
  }
  return labels;
}

function buildLine(line: ProductionLine): ProductionLineView {
  const chrysalis = lineChrysalis(line.qty, line.chrysalisCount, line.options);
  return {
    sku: line.sku,
    productName: line.productName,
    variant: variantLabel(line.attributes),
    qty: line.qty,
    chrysalis,
    chrysalisLabel: chrysalis === null ? DASH : String(chrysalis),
    extras: extrasLabels(line.options),
    imageUrl: line.imageUrl,
  };
}

/** "1 producto" / "3 productos". */
export function productCountLabel(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

function deliveryLabel(method: string | null): string {
  const key = method?.trim().toLowerCase();
  return key === "tienda" ? "Recoge en tienda" : key === "domicilio" ? "Domicilio" : text(method);
}

export function buildProductionRow(order: ProductionOrder): ProductionRowView {
  // Una fila de sale_details sin `submitted_at` es un borrador: no se muestra nada de ella.
  const sale = order.sale?.submitted_at ? order.sale : null;
  const lines = order.lines.map(buildLine);
  const defined = lines.filter((l) => l.chrysalis !== null);
  const chrysalis = defined.length > 0 ? defined.reduce((sum, l) => sum + (l.chrysalis ?? 0), 0) : null;

  const place = [sale?.city, sale?.neighborhood]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
  const observation = sale?.special_notes?.trim() || DASH;

  const state = deriveOrderState(order);
  const deliveryMethod = deliveryLabel(order.delivery_method);
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);

  return {
    id: order.id,
    humanNumber: order.human_number,
    state,
    deliveryMethod,
    productCount: productCountLabel(totalQty),
    chrysalis,
    step: nextStep(order),
    detail: {
      humanNumber: order.human_number,
      state,
      deliveryDate: formatDate(order.desired_delivery_date),
      deliveryMethod,
      occasion: text(order.occasion),
      place: place || DASH,
      totalQty,
      chrysalis,
      chrysalisLabel: chrysalis === null ? DASH : String(chrysalis),
      lines,
      card: sale
        ? { from: text(sale.card_from), to: text(sale.card_to), message: text(sale.card_message) }
        : null,
      observation,
      advisor: text(order.advisor_name?.trim()),
      supplierName: order.supplier_name,
      artisanName: order.artisan_name,
    },
  };
}

export function buildProductionDay(orders: ProductionOrder[], day: string): ProductionDayView {
  const rows = orders
    .map(buildProductionRow)
    // Array.prototype.sort es estable: dentro de una fase queda el orden de la consulta.
    .sort((a, b) => (STATE_RANK[a.state] ?? 3) - (STATE_RANK[b.state] ?? 3));
  return {
    dayLabel: formatLongDay(day),
    orderCount: rows.length,
    chrysalisTotal: rows.reduce((sum, r) => sum + (r.chrysalis ?? 0), 0),
    rows,
  };
}
