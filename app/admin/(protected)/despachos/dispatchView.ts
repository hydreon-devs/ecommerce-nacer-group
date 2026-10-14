import type { OrderTableRow } from "@/lib/data/orders";
import { canMarkLost, classifyDelivery } from "../../../../lib/domain/dispatch.ts";
import { formatDeliveryAddress } from "../../../../lib/domain/deliveryAddress.ts";
import { nextStep, type NextStep } from "../../../../lib/domain/fulfillmentFlow.ts";
import { DASH, formatDate, text } from "../pedidos/orderView.ts";

/**
 * Datos de una tarjeta de Despachos: lo que necesita quien entrega, ya
 * formateado. Sin React, para que `node --test` lo cargue. Sin precios ni
 * costos: el rol `produccion` no ve márgenes.
 */
export type DateTone = "today" | "overdue" | "upcoming" | "none";

export interface DispatchCardLine {
  name: string;
  sku: string;
  qty: number;
}

export interface DispatchCard {
  id: string;
  humanNumber: string;
  deliveryMethod: string;
  dateBadge: { text: string; tone: DateTone };
  lines: DispatchCardLine[];
  /** De/Para; `null` si el cliente no pidió tarjeta. */
  gift: { from: string; to: string } | null;
  specialNote: string | null;
  recipient: string;
  recipientPhone: string;
  address: string;
  step: NextStep | null;
  canMarkLost: boolean;
}

function dateBadge(order: OrderTableRow, today: string): DispatchCard["dateBadge"] {
  const timing = classifyDelivery(order.desired_delivery_date, today);
  switch (timing.kind) {
    case "today":
      return { text: "Hoy", tone: "today" };
    case "overdue":
      return {
        text: `Atrasado · ${timing.daysLate} ${timing.daysLate === 1 ? "día" : "días"}`,
        tone: "overdue",
      };
    case "upcoming":
      return { text: formatDate(order.desired_delivery_date), tone: "upcoming" };
    case "none":
      return { text: "Sin fecha", tone: "none" };
  }
}

/** Recorta y trata el texto en blanco como ausente. */
function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** `today` es `YYYY-MM-DD` en America/Bogota. */
export function buildDispatchCard(order: OrderTableRow, today: string): DispatchCard {
  // Una fila de sale_details sin `submitted_at` es un borrador: no se muestra nada de ella.
  const sale = order.saleDetails?.submitted_at ? order.saleDetails : null;

  const cardFrom = present(sale?.card_from);
  const cardTo = present(sale?.card_to);

  return {
    id: order.id,
    humanNumber: order.human_number,
    deliveryMethod:
      order.delivery_method?.trim().toLowerCase() === "tienda"
        ? "Recoge en tienda"
        : order.delivery_method?.trim().toLowerCase() === "domicilio"
          ? "Domicilio"
          : text(order.delivery_method),
    dateBadge: dateBadge(order, today),
    lines: (order.lines ?? []).map((line) => ({
      name: text(line.name),
      sku: text(line.sku),
      qty: line.qty,
    })),
    gift: cardFrom || cardTo ? { from: cardFrom ?? DASH, to: cardTo ?? DASH } : null,
    specialNote: present(sale?.special_notes),
    recipient: text(sale?.recipient_name),
    recipientPhone: text(sale?.recipient_phone),
    address: formatDeliveryAddress(order.delivery_address, order.saleDetails, DASH),
    step: nextStep(order),
    canMarkLost: canMarkLost(order),
  };
}
