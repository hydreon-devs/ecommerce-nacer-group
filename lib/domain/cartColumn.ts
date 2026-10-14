import { deriveOrderState, type OrderState, type OrderStateInput } from "./orderState.ts";

/** Columna del panel Carritos. */
export type CartColumn = "abiertos" | "vencidos" | "cancelados";

export interface CartReservation {
  status: string;
  expires_at: string;
}

export interface CartClassification {
  column: CartColumn;
  /** Rótulo y pill se leen de `ORDER_STATE_LABELS` / `ORDER_STATE_PILL_CLASS`. */
  state: OrderState;
}

/**
 * Vigente: al menos una reserva `activa` con `expires_at` estrictamente en el
 * futuro. No se usa `created_at + 24h`: con comprobante de transferencia la
 * reserva se extiende hasta el cierre del segundo día hábil.
 */
export function hasLiveReservation(reservations: readonly CartReservation[], now: Date): boolean {
  const t = now.getTime();
  return reservations.some((r) => r.status === "activa" && new Date(r.expires_at).getTime() > t);
}

/**
 * Columna y rótulo de un pedido sin pagar según sus reservas y la hora actual.
 * No depende de `expire_reservations()`: un `abierto` sin reserva vigente se
 * presenta como "Vencido" aunque la base aún no lo haya barrido. Es solo
 * presentación; `status` no se escribe. `null` = no pertenece al panel.
 */
export function classifyCart(
  order: OrderStateInput,
  reservations: readonly CartReservation[],
  now: Date,
): CartClassification | null {
  switch (order.status) {
    case "cancelado":
      return { column: "cancelados", state: "cancelado" };
    case "vencido":
      return { column: "vencidos", state: "vencido" };
    case "abierto":
      return hasLiveReservation(reservations, now)
        ? { column: "abiertos", state: deriveOrderState(order) }
        : { column: "vencidos", state: "vencido" };
    default:
      return null;
  }
}

export interface CartOrderInput extends OrderStateInput {
  id: string;
  human_number: string;
  created_at: string;
  updated_at: string;
}

export interface CartRow {
  id: string;
  human_number: string;
  /** Rótulo y pill salen de `ORDER_STATE_LABELS` / `ORDER_STATE_PILL_CLASS`. */
  state: OrderState;
  created_at: string;
  updated_at: string;
}

export interface CartColumns {
  abiertos: CartRow[];
  vencidos: CartRow[];
  cancelados: CartRow[];
}

/**
 * Arma las tres columnas a partir de los pedidos traídos (puede haber el mismo
 * pedido de dos consultas) y sus reservas. Un abierto vigente siempre se
 * muestra; el resto solo si su `created_at` cae en `[desde, hasta)` — la
 * consulta de abiertos trae también vencidos de otros meses. `period` null =
 * sin límite. Cada columna sale por `updated_at`, el más reciente primero.
 */
export function assembleCartColumns(input: {
  orders: readonly CartOrderInput[];
  reservations: readonly (CartReservation & { order_id: string })[];
  period: { desde: string; hasta: string } | null;
  now: Date;
}): CartColumns {
  const { period, now } = input;
  const byId = new Map<string, CartOrderInput>();
  for (const order of input.orders) byId.set(order.id, order);

  const reservationsByOrder = new Map<string, CartReservation[]>();
  for (const r of input.reservations) {
    const list = reservationsByOrder.get(r.order_id) ?? [];
    list.push(r);
    reservationsByOrder.set(r.order_id, list);
  }

  const columns: CartColumns = { abiertos: [], vencidos: [], cancelados: [] };
  for (const order of byId.values()) {
    const result = classifyCart(order, reservationsByOrder.get(order.id) ?? [], now);
    if (!result) continue;
    if (result.column !== "abiertos" && period) {
      const created = Date.parse(order.created_at);
      if (created < Date.parse(period.desde) || created >= Date.parse(period.hasta)) continue;
    }
    columns[result.column].push({
      id: order.id,
      human_number: order.human_number,
      state: result.state,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
  }
  for (const rows of [columns.abiertos, columns.vencidos, columns.cancelados]) {
    rows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }
  return columns;
}
