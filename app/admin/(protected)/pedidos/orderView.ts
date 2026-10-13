import type { OrderTableRow } from "@/lib/data/orders";
import { formatCop } from "../../../../lib/format.ts";
import { isPanelChat } from "../../../../lib/domain/panelSale.ts";
import { deriveOrderState, type OrderState } from "../../../../lib/domain/orderState.ts";

/**
 * Pure view model for the orders list: turns an `OrderTableRow` into the
 * collapsed-row values and the three labelled field groups of the expanded
 * panel, with every formatting and fallback rule in one place. The list is a
 * summary: the rest of the order lives on its detail page. No React, so
 * `node --test` can load it.
 */

export const DASH = "—";

export interface OrderField {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
}

export interface OrderFieldGroup {
  id: string;
  title: string;
  fields: OrderField[];
}

export interface OrderRowSummary {
  humanNumber: string;
  buyerLabel: string;
  seller: string;
  /** "Sí" / "No" si pidió factura electrónica; raya mientras no haya respondido el formulario. */
  invoice: string;
  /** Día en que se creó el pedido, no el de entrega. */
  createdDate: string;
  amount: string;
  /**
   * Estado único derivado de status, payment_status y fulfillment_status. Es de
   * solo lectura en la lista: avanza por proceso desde Producción y Despachos.
   */
  state: OrderState;
}

export interface OrderView {
  id: string;
  row: OrderRowSummary;
  groups: OrderFieldGroup[];
  openHref: string;
}

export function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return DASH;
  return String(value);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `es-CO` date in America/Bogota. Date-only values (`YYYY-MM-DD`, e.g. the
 * desired delivery date) are calendar days, not instants: shifting them to
 * Bogotá would show the previous day, so they are rendered as written.
 * A value that is not a date is shown as stored rather than "Invalid Date".
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const timeZone = DATE_ONLY.test(iso) ? "UTC" : "America/Bogota";
  return date.toLocaleDateString("es-CO", { timeZone });
}

function invoiceLabel(sale: OrderTableRow["saleDetails"]): string {
  if (sale?.wants_invoice) return "Sí";
  return sale?.submitted_at ? "No" : DASH;
}

export function buildOrderView(order: OrderTableRow): OrderView {
  const sale = order.saleDetails;
  // Los pedidos del panel traen un `chat_id` sintético: el celular real vive en sale_details.
  const fromPanel = isPanelChat(order.chat_id);
  const buyerPhone = fromPanel ? text(sale?.buyer_phone) : text(order.chat_id);

  return {
    id: order.id,
    row: {
      humanNumber: order.human_number,
      buyerLabel: sale?.buyer_name || (fromPanel ? DASH : order.chat_id),
      seller: text(order.advisor_name?.trim()),
      invoice: invoiceLabel(sale),
      createdDate: formatDate(order.created_at),
      amount: formatCop(order.grand_total),
      state: deriveOrderState(order),
    },
    groups: [
      {
        id: "entrega",
        title: "Entrega",
        fields: [
          { key: "deliveryMethod", label: "Tipo de envío", value: text(order.delivery_method) },
          { key: "deliveryDate", label: "Fecha de entrega", value: formatDate(order.desired_delivery_date), mono: true },
        ],
      },
      {
        id: "comprador",
        title: "Comprador",
        fields: [
          { key: "buyer", label: "Comprador", value: text(sale?.buyer_name) },
          { key: "buyerPhone", label: "Celular comprador", value: buyerPhone, mono: true },
        ],
      },
      {
        id: "pago",
        title: "Pago",
        fields: [
          { key: "total", label: "Valor a pagar", value: formatCop(order.grand_total), mono: true },
          { key: "paymentSource", label: "Tipo de pago", value: text(order.payment_source) },
        ],
      },
    ],
    openHref: `/admin/pedidos/${order.id}`,
  };
}

/**
 * Callers fetch `cap + 1` rows so an overflow is detectable; this trims the
 * probe row and reports whether it existed.
 */
export function capRows<T>(rows: T[], cap: number): { shown: T[]; hasMore: boolean } {
  return { shown: rows.slice(0, cap), hasMore: rows.length > cap };
}
