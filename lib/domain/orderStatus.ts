/**
 * Etiqueta y color de `orders.status` (ciclo de vida del pedido:
 * abierto/pagado/vencido/cancelado) — dimensión distinta de
 * `fulfillment_status` (fase de producción post-pago, ver
 * `fulfillmentStatus.ts`). No se mezclan: un pedido pagado no tiene
 * `orders.status` propio que mostrar aquí porque ya vive en `/admin/pedidos`
 * con su propia fase; esta paleta es para la vista de carritos incompletos.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  pagado: "Pagado",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_PILL_CLASS: Record<string, string> = {
  abierto: "bg-admin-series-blue/15 text-admin-series-blue", // en progreso, no es un estado de éxito/fracaso
  pagado: "bg-admin-good/15 text-admin-good",
  vencido: "bg-admin-warning-bg text-admin-warning-fg",
  cancelado: "bg-admin-critical-bg text-admin-critical-fg",
};
