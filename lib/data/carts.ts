import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  assembleCartColumns,
  type CartColumns,
  type CartReservation,
  type CartRow,
} from "@/lib/domain/cartColumn";
import type { PeriodRange } from "./orders";

export type { CartColumns, CartRow };

export interface CartResult {
  columns: CartColumns;
  /** Una de las consultas llegó al tope: los conteos pueden quedar cortos. */
  truncated: boolean;
}

export interface FunnelCounts {
  abierto: number;
  pagado: number;
  vencido: number;
  cancelado: number;
}

/**
 * Tope de filas por consulta. PostgREST corta en silencio al llegar a su
 * máximo de filas por petición; los abiertos no se limitan por periodo, así
 * que este tope (el mismo criterio de `BOARD_CAP` en `orders.ts`) es lo único
 * que los acota.
 */
export const CART_CAP = 500;

/** `.in("order_id", …)` va en la URL: se consulta por tandas para no exceder su largo. */
const RESERVATION_CHUNK = 100;

const ORDER_COLUMNS = "id, human_number, status, payment_status, fulfillment_status, created_at, updated_at";

/**
 * Pedidos que no llegaron a `pagado`, ya clasificados en las tres columnas
 * del panel (`classifyCart`). Una sola clasificación alimenta lista y
 * contador, así que no pueden discrepar.
 *
 * Abiertos no se limita por periodo: es lo vigente ahora. Vencidos y
 * Cancelados sí, y por `created_at` — a diferencia de `getOrders` (filtra por
 * `confirmed_at`), estos pedidos nunca tuvieron `confirmed_at`, así que no hay
 * otra fecha por la cual anclarlos al periodo. Un `abierto` sin reserva
 * vigente es una fila de Vencidos y por tanto sigue el periodo.
 *
 * La vigencia se calcula aquí con la hora actual; no depende de que
 * `expire_reservations()` (flujo de n8n cada 8 horas, cuando está activo) ya
 * haya movido el pedido a `vencido`. `period` null = sin límite de fechas.
 * `truncated` avisa cuando una consulta llegó a `CART_CAP`.
 */
export async function getCartColumns(period: PeriodRange | null, now = new Date()): Promise<CartResult> {
  const supabase = createAdminClient();

  const inPeriod = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .in("status", ["abierto", "vencido", "cancelado"])
    .order("updated_at", { ascending: false })
    .limit(CART_CAP);
  const [openResult, periodResult] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("status", "abierto")
      .order("updated_at", { ascending: false })
      .limit(CART_CAP),
    period ? inPeriod.gte("created_at", period.desde).lt("created_at", period.hasta) : inPeriod,
  ]);
  if (openResult.error) throw openResult.error;
  if (periodResult.error) throw periodResult.error;

  const orders = [...(openResult.data ?? []), ...(periodResult.data ?? [])];
  const truncated =
    (openResult.data?.length ?? 0) >= CART_CAP || (periodResult.data?.length ?? 0) >= CART_CAP;

  // Solo los `abierto` necesitan sus reservas; vencido y cancelado se clasifican por `status`.
  const openIds = [...new Set(orders.filter((o) => o.status === "abierto").map((o) => o.id))];
  const reservations: (CartReservation & { order_id: string })[] = [];
  for (let i = 0; i < openIds.length; i += RESERVATION_CHUNK) {
    const { data, error } = await supabase
      .from("reservations")
      .select("order_id, status, expires_at")
      .in("order_id", openIds.slice(i, i + RESERVATION_CHUNK));
    if (error) throw error;
    reservations.push(...(data ?? []));
  }

  return { columns: assembleCartColumns({ orders, reservations, period, now }), truncated };
}

/**
 * Embudo de conversión: cuántos pedidos **iniciados** en el periodo
 * terminaron en cada estado. Deliberadamente por `created_at`, no
 * `confirmed_at` — es la única forma de incluir los que nunca se pagaron.
 * Por eso el número de "pagado" aquí puede diferir del KPI "Ventas del
 * periodo" de arriba (ese cuenta pedidos *confirmados* en el periodo,
 * sin importar cuándo se iniciaron) — son dos preguntas distintas, no un
 * error de conteo.
 */
export async function getFunnelCounts(period: PeriodRange | null): Promise<FunnelCounts> {
  const supabase = createAdminClient();

  // Un conteo exacto por estado: `head: true` no trae filas, así que el
  // límite de filas de PostgREST no puede truncar el total. `period = null`
  // es "todo el tiempo".
  const countStatus = async (status: keyof FunnelCounts) => {
    const query = supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    const { count, error } = period
      ? await query.gte("created_at", period.desde).lt("created_at", period.hasta)
      : await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [abierto, pagado, vencido, cancelado] = await Promise.all([
    countStatus("abierto"),
    countStatus("pagado"),
    countStatus("vencido"),
    countStatus("cancelado"),
  ]);
  return { abierto, pagado, vencido, cancelado };
}
