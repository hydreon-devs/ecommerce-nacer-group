import { isPickup } from "./dispatch.ts";
import { isFulfillmentStatus, type FulfillmentStatus } from "./fulfillmentStatus.ts";

/**
 * Flujo de cumplimiento en un solo lugar (hoy sin roles: todo corre como
 * admin; cuando haya roles, el permiso de cada paso se cuelga de aquí):
 * en_construccion → preparado (artesana) → en_despacho → entregado (despacho).
 * Recoger en tienda salta el tramo de despacho: preparado → entregado.
 */
export interface NextStep {
  label: string;
  to: FulfillmentStatus;
}

export interface FlowInput {
  status: string;
  fulfillment_status: string | null;
  delivery_method: string | null;
}

export function nextStep(order: FlowInput): NextStep | null {
  if (order.status !== "pagado") return null;
  const phase = isFulfillmentStatus(order.fulfillment_status)
    ? order.fulfillment_status
    : "en_construccion";

  switch (phase) {
    case "en_construccion":
      return { label: "Marcar preparado", to: "preparado" };
    case "preparado":
      return isPickup(order)
        ? { label: "Marcar entregado", to: "entregado" }
        : { label: "Enviar a despacho", to: "en_despacho" };
    case "en_despacho":
      return { label: "Marcar entregado", to: "entregado" };
    default:
      return null;
  }
}

/** Fecha de entrega deseada más próxima primero, sin fecha al final; estable y sin mutar. */
export function sortByDesiredDate<T extends { desired_delivery_date: string | null }>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const da = a.row.desired_delivery_date;
      const db = b.row.desired_delivery_date;
      if (da === db) return a.index - b.index;
      if (da === null) return 1;
      if (db === null) return -1;
      return da < db ? -1 : 1;
    })
    .map(({ row }) => row);
}
