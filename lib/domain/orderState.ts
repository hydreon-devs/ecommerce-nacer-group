import {
  FULFILLMENT_LABELS,
  FULFILLMENT_PILL_CLASS,
  isFulfillmentStatus,
  type FulfillmentStatus,
} from "./fulfillmentStatus.ts";
import { ORDER_STATUS_LABELS, ORDER_STATUS_PILL_CLASS } from "./orderStatus.ts";

/**
 * "Estado" único del pedido: valor de presentación derivado de `status`,
 * `payment_status` y `fulfillment_status`. No existe como columna ni se
 * escribe nunca; las tres dimensiones siguen siendo independientes en la base.
 */
export type OrderState =
  | "abierto"
  | "pendiente_aprobacion"
  | "cancelado"
  | "vencido"
  | FulfillmentStatus;

export const ORDER_STATES: readonly OrderState[] = [
  "abierto",
  "pendiente_aprobacion",
  "en_construccion",
  "preparado",
  "en_despacho",
  "entregado",
  "perdido",
  "cancelado",
  "vencido",
];

/** Comprobante de transferencia enviado y sin aprobar: el pedido sigue `abierto`. */
const PROOF_RECEIVED = "comprobante_recibido";

export interface OrderStateInput {
  status: string;
  payment_status: string | null;
  fulfillment_status: string | null;
}

export function deriveOrderState(order: OrderStateInput): OrderState {
  switch (order.status) {
    case "cancelado":
      return "cancelado";
    case "vencido":
      return "vencido";
    case "pagado":
      return isFulfillmentStatus(order.fulfillment_status)
        ? order.fulfillment_status
        : "en_construccion";
    default:
      return order.payment_status === PROOF_RECEIVED ? "pendiente_aprobacion" : "abierto";
  }
}

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  ...FULFILLMENT_LABELS,
  abierto: ORDER_STATUS_LABELS.abierto,
  pendiente_aprobacion: "Pago por aprobar",
  cancelado: ORDER_STATUS_LABELS.cancelado,
  vencido: ORDER_STATUS_LABELS.vencido,
};

export const ORDER_STATE_PILL_CLASS: Record<OrderState, string> = {
  ...FULFILLMENT_PILL_CLASS,
  abierto: ORDER_STATUS_PILL_CLASS.abierto,
  pendiente_aprobacion: "bg-admin-warning-bg text-admin-warning-fg",
  cancelado: ORDER_STATUS_PILL_CLASS.cancelado,
  vencido: ORDER_STATUS_PILL_CLASS.vencido,
};

/** `?estado=`: un valor desconocido es "sin filtro" (`null`). */
export function parseEstadoParam(raw: string | string[] | undefined | null): OrderState | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  return ORDER_STATES.find((state) => state === first) ?? null;
}

/** Condición sobre columnas equivalente a un Estado, para empujar el filtro a la consulta. */
export interface OrderFilterSpec {
  status: string;
  payment?: { eq: string } | { notEq: string };
  /** `withNull`: una fase nula cuenta como esta fase (pagados sin fase = en construcción). */
  fulfillment?: { eq: FulfillmentStatus; withNull: boolean };
}

export function estadoSpec(state: OrderState): OrderFilterSpec {
  switch (state) {
    case "cancelado":
    case "vencido":
      return { status: state };
    case "pendiente_aprobacion":
      return { status: "abierto", payment: { eq: PROOF_RECEIVED } };
    case "abierto":
      return { status: "abierto", payment: { notEq: PROOF_RECEIVED } };
    default:
      return {
        status: "pagado",
        fulfillment: { eq: state, withNull: state === "en_construccion" },
      };
  }
}

/** Fecha del pedido para periodo, orden y columna "Fecha": venta confirmada o, si no, creación. */
export function orderDate(order: { confirmed_at: string | null; created_at: string }): string {
  return order.confirmed_at ?? order.created_at;
}
