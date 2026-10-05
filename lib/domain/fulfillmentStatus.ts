import type { FulfillmentStatus } from "@/lib/data/orders";

/**
 * Fuente única del rótulo y color de cada fase de cumplimiento — antes vivía
 * duplicado en `FulfillmentStatusSelect` (editable) y ahora también lo
 * necesita la tarjeta de solo lectura del tablero de producción. Mismo
 * mapeo que las gráficas de estado (`DashboardCharts.tsx`): un color de
 * estado nunca dobla como identidad categórica en otro sitio.
 */
export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  en_construccion: "En construcción",
  en_despacho: "En despacho",
  entregado: "Entregado",
  perdido: "Perdido",
};

export const FULFILLMENT_PILL_CLASS: Record<FulfillmentStatus, string> = {
  entregado: "bg-admin-good/15 text-admin-good",
  en_despacho: "bg-admin-warning-bg text-admin-warning-fg",
  en_construccion: "bg-admin-series-blue/15 text-admin-series-blue",
  perdido: "bg-admin-critical-bg text-admin-critical-fg",
};

export const FULFILLMENT_PILL_CLASS_UNSET = "bg-admin-surface-sunken text-admin-ink-muted";
