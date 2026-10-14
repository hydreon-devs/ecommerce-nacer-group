/**
 * Reglas puras de Despachos: filtro de "Listos para despacho" (`?listos=`),
 * clasificación de la fecha de entrega contra hoy en America/Bogota, motivo de
 * pérdida y quién puede marcarse perdido. Sin React ni base de datos.
 */

export type DispatchFilter = "hoy" | "proximos" | "todos";

export const DISPATCH_FILTERS: readonly DispatchFilter[] = ["hoy", "proximos", "todos"];

/** Valida `?listos=`: ausente o inválido equivale a `hoy`; la URL nunca rompe la pantalla. */
export function parseDispatchFilter(raw: string | string[] | undefined): DispatchFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return DISPATCH_FILTERS.find((filter) => filter === value) ?? "hoy";
}

export type DeliveryTiming =
  | { kind: "today" }
  | { kind: "overdue"; daysLate: number }
  | { kind: "upcoming" }
  | { kind: "none" };

const DAY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Día calendario como número de días UTC, o `null` si el texto no empieza con `YYYY-MM-DD`. */
function dayNumber(value: string): number | null {
  const match = DAY_PREFIX.exec(value);
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000);
}

/**
 * Compara la fecha de entrega deseada con `today` (`YYYY-MM-DD`, Bogotá). Una
 * fecha ilegible cuenta como sin fecha: no se esconde el pedido.
 */
export function classifyDelivery(desiredDate: string | null, today: string): DeliveryTiming {
  const desired = desiredDate ? dayNumber(desiredDate) : null;
  const now = dayNumber(today);
  if (desired === null || now === null) return { kind: "none" };
  if (desired === now) return { kind: "today" };
  if (desired > now) return { kind: "upcoming" };
  return { kind: "overdue", daysLate: now - desired };
}

/** `hoy` = hoy + atrasados + sin fecha; `proximos` = posteriores a hoy; `todos` = todos. */
export function filterReady<T extends { desired_delivery_date: string | null }>(
  orders: T[],
  filter: DispatchFilter,
  today: string,
): T[] {
  if (filter === "todos") return orders;
  return orders.filter((order) => {
    const upcoming = classifyDelivery(order.desired_delivery_date, today).kind === "upcoming";
    return filter === "proximos" ? upcoming : !upcoming;
  });
}

export function countReadyByFilter(
  orders: { desired_delivery_date: string | null }[],
  today: string,
): Record<DispatchFilter, number> {
  return {
    hoy: filterReady(orders, "hoy", today).length,
    proximos: filterReady(orders, "proximos", today).length,
    todos: orders.length,
  };
}

/** Recoge en tienda: salta el tramo de despacho (ver `nextStep`). Todo lo demás, incluso sin método, va a domicilio. */
export function isPickup(order: { delivery_method: string | null }): boolean {
  return order.delivery_method?.trim().toLowerCase() === "tienda";
}

/** Separa los listos en domicilio y recogida en tienda, conservando el orden. */
export function splitReadyByDelivery<T extends { delivery_method: string | null }>(
  orders: T[],
): { delivery: T[]; pickup: T[] } {
  return {
    delivery: orders.filter((order) => !isPickup(order)),
    pickup: orders.filter(isPickup),
  };
}

export const LOST_REASON_MAX = 500;

export type LostReasonResult = { ok: true; reason: string } | { ok: false };

/** Motivo de pérdida: obligatorio, entre 1 y 500 caracteres después de recortar espacios. */
export function validateLostReason(raw: unknown): LostReasonResult {
  if (typeof raw !== "string") return { ok: false };
  const reason = raw.trim();
  return reason.length >= 1 && reason.length <= LOST_REASON_MAX ? { ok: true, reason } : { ok: false };
}

/** Solo un pedido pagado que está en despacho puede marcarse perdido. */
export function canMarkLost(order: { status: string; fulfillment_status: string | null }): boolean {
  return order.status === "pagado" && order.fulfillment_status === "en_despacho";
}
