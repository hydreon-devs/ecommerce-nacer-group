import type { OrderTableRow } from "@/lib/data/orders";
import { nextStep, type NextStep } from "../../../../lib/domain/fulfillmentFlow.ts";
import { DASH, formatDate, text } from "../pedidos/orderView.ts";

/**
 * Datos de una tarjeta de Despachos: lo que necesita quien entrega, ya
 * formateado. Sin React, para que `node --test` lo cargue.
 */
export interface DispatchCard {
  id: string;
  humanNumber: string;
  deliveryMethod: string;
  desiredDate: string;
  recipient: string;
  recipientPhone: string;
  address: string;
  productSummary: string;
  step: NextStep | null;
}

export function buildDispatchCard(order: OrderTableRow): DispatchCard {
  // Una fila de sale_details sin `submitted_at` es un borrador: no se muestra nada de ella.
  const sale = order.saleDetails?.submitted_at ? order.saleDetails : null;
  const addressParts = [
    sale?.delivery_address_exact,
    sale?.delivery_unit,
    sale?.neighborhood,
    sale?.city,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return {
    id: order.id,
    humanNumber: order.human_number,
    deliveryMethod:
      order.delivery_method?.trim().toLowerCase() === "tienda"
        ? "Recoge en tienda"
        : order.delivery_method?.trim().toLowerCase() === "domicilio"
          ? "Domicilio"
          : text(order.delivery_method),
    desiredDate: formatDate(order.desired_delivery_date),
    recipient: text(sale?.recipient_name),
    recipientPhone: text(sale?.recipient_phone),
    address: addressParts.length > 0 ? addressParts.join(", ") : DASH,
    productSummary: order.productSummary,
    step: nextStep(order),
  };
}
