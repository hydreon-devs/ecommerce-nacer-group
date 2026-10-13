/**
 * Las líneas de un pedido viven en `reservations`, y el estado de la reserva
 * depende del estado del pedido: pagado → consumida, abierto → activa,
 * vencido → expirada, cancelado → liberada. Un pedido solo muestra las líneas
 * de su propio estado (un pagado con una línea liberada no la cuenta).
 */
const BY_ORDER_STATUS: Record<string, string> = {
  pagado: "consumida",
  abierto: "activa",
  vencido: "expirada",
  cancelado: "liberada",
};

export const RESERVATION_STATUSES: readonly string[] = Object.values(BY_ORDER_STATUS);

/** Estado desconocido → `consumida`, el comportamiento previo. */
export function reservationStatusFor(orderStatus: string): string {
  return BY_ORDER_STATUS[orderStatus] ?? "consumida";
}
