import type { OrderDetail } from "@/lib/data/orders";
import { formatCop } from "../../../../../lib/format.ts";
import {
  ORDER_STATE_LABELS,
  ORDER_STATE_PILL_CLASS,
  deriveOrderState,
  orderDate,
} from "../../../../../lib/domain/orderState.ts";
import { isPanelChat } from "../../../../../lib/domain/panelSale.ts";
import { DASH, formatDate, text } from "../orderView.ts";

/**
 * Pure view model for the order detail page: status indicators, card block,
 * address lines, contact links and payment summary. No React, so
 * `node --test` can load it. Stored values are shown as they are.
 */

export interface DetailField {
  label: string;
  value: string;
  mono?: boolean;
  /** Present only when the value is safe to turn into a link. */
  href?: string;
  /** Short warning shown next to the value. */
  note?: string;
}

export interface StatusIndicator {
  label: string;
  value: string;
  pillClass: string;
}

export type StripKey = "state" | "invoice" | "seller";

const STRIP: readonly StripKey[] = ["state", "invoice", "seller"];

export type InvoiceState = "requested" | "none" | "pending";

const NEUTRAL_PILL = "bg-admin-surface-sunken text-admin-ink-muted";

export interface OrderDetailView {
  humanNumber: string;
  confirmedAt: string;
  /** Fecha del encabezado: confirmación o, si aún no se confirma, creación. */
  dateLine: string;
  /** Estado único derivado (reemplaza a los antiguos indicadores Pedido y Cumplimiento). */
  state: StatusIndicator;
  invoiceStatus: StatusIndicator;
  /** Plain label and value, not a status: who sold the order. */
  seller: DetailField;
  /** Header strip items in reading order; statuses first, seller last. */
  strip: readonly StripKey[];
  /** The post-sale form (`sale_details`) has been submitted. */
  submitted: boolean;
  /** Paid order whose customer has not filled the form yet. */
  waitingForCustomer: boolean;
  lines: {
    key: string;
    name: string;
    sku: string;
    qty: number;
    unitPrice: string;
    total: string;
  }[];
  card: {
    from: string | null;
    to: string | null;
    message: string | null;
    notes: string | null;
    hasContent: boolean;
  };
  delivery: {
    date: string;
    method: string;
    occasion: string;
    recipient: DetailField[];
    addressLines: DetailField[];
    distance: string;
    /** "Zona" en pedidos del panel con domicilio; "Distancia" en el resto. */
    distanceLabel: string;
  };
  payment: {
    subtotal: string;
    deliveryFee: string;
    total: string;
    method: string;
    reference: string;
    paidAmount: string;
  };
  buyer: DetailField[];
  invoice: { state: InvoiceState; fields: DetailField[] };
}

/** Blank strings count as missing, like null. */
function present(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() === "" ? null : value;
}

function invoiceState(sale: OrderDetail["saleDetails"]): InvoiceState {
  if (sale?.wants_invoice) return "requested";
  return sale?.submitted_at ? "none" : "pending";
}

const INVOICE_VALUES: Record<InvoiceState, string> = {
  requested: "Solicitada",
  none: "No solicitada",
  pending: DASH,
};

/** One `@`, no whitespace, no `?` or `&`: safe to put in a `mailto:` link. */
const PLAIN_EMAIL = /^[^\s@?&]+@[^\s@?&]+$/;

/** `tel:` target with digits only, plus an optional leading `+`, or undefined if nothing is left. */
function telHref(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return `tel:${phone.trim().startsWith("+") ? "+" : ""}${digits}`;
}

export function buildOrderDetailView(order: OrderDetail): OrderDetailView {
  // A sale_details row without `submitted_at` is a draft: none of its data is shown.
  const sale = order.saleDetails?.submitted_at ? order.saleDetails : null;
  const submitted = sale !== null;
  const invoice = invoiceState(sale);
  const state = deriveOrderState(order);

  const cardFrom = present(sale?.card_from);
  const cardTo = present(sale?.card_to);
  const cardMessage = present(sale?.card_message);
  const cardNotes = present(sale?.special_notes);

  const addressLines: DetailField[] = [];
  if (sale) {
    const parts: [string, string | null][] = [
      ["Dirección", present(sale.delivery_address_exact)],
      ["Unidad / Apto", present(sale.delivery_unit)],
      ["Edificio", present(sale.building_name)],
      ["Barrio", present(sale.neighborhood)],
      ["Ciudad", present(sale.city)],
    ];
    for (const [label, value] of parts) {
      if (value !== null) addressLines.push({ label, value });
    }
  }
  const fallbackAddress = present(order.delivery_address);
  if (!submitted && fallbackAddress !== null) {
    addressLines.push({ label: "Dirección", value: fallbackAddress });
  }

  const recipient: DetailField[] = [];
  if (sale) {
    recipient.push({ label: "Quién recibe", value: text(present(sale.recipient_name)) });
    const phone = present(sale.recipient_phone);
    const field: DetailField = { label: "Teléfono", value: text(phone), mono: true };
    if (phone !== null && sale.may_call_recipient === true) {
      const href = telHref(phone);
      if (href) field.href = href;
    } else if (phone !== null && sale.may_call_recipient === false) {
      field.note = "No llamar: puede ser una sorpresa.";
    }
    recipient.push(field);
  }

  const email = present(sale?.buyer_email)?.trim() ?? null;
  const buyerEmail: DetailField = { label: "Correo", value: text(email) };
  if (email !== null && PLAIN_EMAIL.test(email)) buyerEmail.href = `mailto:${email}`;
  const chatId = present(order.chat_id);
  // Los pedidos del panel traen un `chat_id` sintético: el celular real vive en sale_details.
  const contact: DetailField = { label: "WhatsApp", value: text(chatId), mono: true };
  if (isPanelChat(order.chat_id)) {
    const phone = present(order.saleDetails?.buyer_phone)?.trim() ?? null;
    contact.label = "Celular";
    contact.value = text(phone);
    const href = phone !== null ? telHref(phone) : undefined;
    if (href) contact.href = href;
  } else if (chatId !== null && /^\d+$/.test(chatId)) {
    contact.href = `https://wa.me/${chatId}`;
  }

  return {
    humanNumber: order.human_number,
    confirmedAt: formatDate(order.confirmed_at),
    dateLine: order.confirmed_at
      ? `Confirmado el ${formatDate(order.confirmed_at)}`
      : `Creado el ${formatDate(orderDate(order))}`,
    state: {
      label: "Estado",
      value: ORDER_STATE_LABELS[state],
      pillClass: ORDER_STATE_PILL_CLASS[state],
    },
    invoiceStatus: {
      label: "Factura",
      value: INVOICE_VALUES[invoice],
      pillClass:
        invoice === "requested" ? "bg-admin-series-blue/15 text-admin-series-blue" : NEUTRAL_PILL,
    },
    seller: { label: "Vendedor", value: text(present(order.advisor_name)?.trim()) },
    strip: STRIP,
    submitted,
    waitingForCustomer: order.status === "pagado" && !submitted,
    lines: order.lines.map((line, index) => ({
      key: `${index}:${line.variantSku}`,
      name: text(line.productName),
      sku: text(line.variantSku),
      qty: line.qty,
      unitPrice: formatCop(line.unitPrice),
      total: formatCop(line.totalPrice),
    })),
    card: {
      from: cardFrom,
      to: cardTo,
      message: cardMessage,
      notes: cardNotes,
      hasContent: [cardFrom, cardTo, cardMessage, cardNotes].some((part) => part !== null),
    },
    delivery: {
      date: formatDate(order.desired_delivery_date),
      method: text(present(order.delivery_method)),
      occasion: text(present(order.occasion)),
      recipient,
      addressLines,
      distanceLabel: isPanelChat(order.chat_id) && order.deliveryZone ? "Zona" : "Distancia",
      distance:
        isPanelChat(order.chat_id) && order.deliveryZone
          ? `Zona ${order.deliveryZone}`
          : order.delivery_distance_km === null || order.delivery_distance_km === undefined
          ? DASH
          : `${order.delivery_distance_km} km`,
    },
    payment: {
      subtotal: formatCop(order.total_price),
      deliveryFee: formatCop(order.delivery_fee),
      total: formatCop(order.grand_total),
      method: text(present(order.payment_source)),
      reference: text(present(order.payment_ref)),
      // Un pedido sin pagar no presenta monto pagado, sea cual sea el valor guardado.
      paidAmount:
        order.status !== "pagado" || order.paid_amount === null ? DASH : formatCop(order.paid_amount),
    },
    buyer: [
      { label: "Nombre", value: text(present(sale?.buyer_name)) },
      buyerEmail,
      contact,
      { label: "Canal de origen", value: text(present(sale?.referral_source)) },
    ],
    invoice: {
      state: invoice,
      fields:
        invoice === "requested"
          ? [
              { label: "Razón social", value: text(present(sale?.invoice_legal_name)) },
              { label: "NIT / documento", value: text(present(sale?.invoice_tax_id)), mono: true },
              { label: "Correo de facturación", value: text(present(sale?.invoice_email)) },
            ]
          : [],
    },
  };
}
