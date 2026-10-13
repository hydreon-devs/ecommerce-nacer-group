/**
 * Fuente única del tipo, rótulo y color de cada fase de cumplimiento
 * (`orders.fulfillment_status`). Flujo: en_construccion → preparado (artesana)
 * → en_despacho → entregado (despacho); `perdido` es una salida. Un color de
 * estado nunca dobla como identidad categórica en otro sitio.
 */
export type FulfillmentStatus =
  | "en_construccion"
  | "preparado"
  | "en_despacho"
  | "entregado"
  | "perdido";

export const FULFILLMENT_STATUSES: readonly FulfillmentStatus[] = [
  "en_construccion",
  "preparado",
  "en_despacho",
  "entregado",
  "perdido",
];

/** Guarda de tipo para valores que llegan de fuera (formularios, acciones del servidor). */
export function isFulfillmentStatus(value: unknown): value is FulfillmentStatus {
  return typeof value === "string" && (FULFILLMENT_STATUSES as readonly string[]).includes(value);
}

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  en_construccion: "En construcción",
  preparado: "Preparado",
  en_despacho: "En despacho",
  entregado: "Entregado",
  perdido: "Perdido",
};

export const FULFILLMENT_PILL_CLASS: Record<FulfillmentStatus, string> = {
  entregado: "bg-admin-good/15 text-admin-good",
  preparado: "bg-admin-accent-wash text-admin-accent",
  en_despacho: "bg-admin-warning-bg text-admin-warning-fg",
  en_construccion: "bg-admin-series-blue/15 text-admin-series-blue",
  perdido: "bg-admin-critical-bg text-admin-critical-fg",
};
