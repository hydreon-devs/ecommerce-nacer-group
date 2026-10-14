import type { LostOrderRow } from "@/lib/data/orders";
import { formatCop } from "../../../../lib/format.ts";
import { isPanelChat } from "../../../../lib/domain/panelSale.ts";
import {
  RESOLUTION_LABELS,
  daysSinceLoss,
  daysSinceLossLabel,
  type LostResolution,
} from "../../../../lib/domain/lostFollowUp.ts";
import { DASH, formatDate, text } from "../pedidos/orderView.ts";

/**
 * Datos de una tarjeta de Perdidos, ya formateados. Sin React, para que
 * `node --test` lo cargue.
 */
export interface LostCard {
  id: string;
  humanNumber: string;
  href: string;
  lostOn: string;
  reason: string;
  lines: { name: string; sku: string; qty: number }[];
  total: string;
  buyerName: string;
  buyerPhone: string;
  recipient: string;
  recipientPhone: string;
  address: string;
  /** Solo en pedidos resueltos. */
  resolution: { label: string; note: string | null; date: string } | null;
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolutionLabel(value: string): string {
  return RESOLUTION_LABELS[value as LostResolution] ?? value;
}

export function buildLostCard(order: LostOrderRow, now: Date): LostCard {
  // Una fila de sale_details sin `submitted_at` es un borrador: no se muestra de ella el destinatario.
  const sale = order.saleDetails?.submitted_at ? order.saleDetails : null;
  const addressParts = [sale?.delivery_address_exact, sale?.delivery_unit, sale?.neighborhood, sale?.city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const days = daysSinceLoss(order.lost_at, now);
  const lostOn =
    order.lost_at && days !== null
      ? `${formatDate(order.lost_at)} · ${daysSinceLossLabel(days)}`
      : "Fecha no registrada";

  return {
    id: order.id,
    humanNumber: order.human_number,
    href: `/admin/pedidos/${order.id}`,
    lostOn,
    reason: present(order.lost_reason) ?? "Sin motivo registrado",
    lines: (order.lines ?? []).map((line) => ({ name: text(line.name), sku: text(line.sku), qty: line.qty })),
    total: formatCop(order.grand_total),
    buyerName: text(order.saleDetails?.buyer_name),
    // Los pedidos del panel traen un `chat_id` sintético: el celular real vive en sale_details.
    buyerPhone: isPanelChat(order.chat_id) ? text(order.saleDetails?.buyer_phone) : text(order.chat_id),
    recipient: text(sale?.recipient_name),
    recipientPhone: text(sale?.recipient_phone),
    address: addressParts.length > 0 ? addressParts.join(", ") : DASH,
    resolution: order.lost_resolution
      ? {
          label: resolutionLabel(order.lost_resolution),
          note: present(order.lost_resolution_note),
          date: formatDate(order.lost_resolved_at),
        }
      : null,
  };
}
