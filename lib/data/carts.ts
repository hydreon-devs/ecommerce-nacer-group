import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import type { PeriodRange } from "./orders";

export interface IncompleteOrder {
  id: string;
  human_number: string;
  chat_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  grand_total: number;
  delivery_method: string | null;
  productSummary: string;
  /**
   * `true` cuando el pedido sigue en `abierto` pero ninguna de sus reservas
   * sigue vigente (todas vencidas, liberadas o inexistentes). `expire_reservations()`
   * no tiene planificador en la base (rpc-contract.md §7 del repositorio del
   * agente) — nada la ejecuta sola, así que un carrito puede quedar marcado
   * `abierto` indefinidamente aunque ya esté funcionalmente muerto. Esto lo
   * hace visible al equipo en vez de dejarlo silencioso.
   */
  reservationsAllExpired: boolean;
}

export interface FunnelCounts {
  abierto: number;
  pagado: number;
  vencido: number;
  cancelado: number;
}

interface ReservationRow {
  order_id: string;
  qty: number;
  status: string;
  expires_at: string;
  product_variants: { products: { name: string } | null } | null;
}

/**
 * Pedidos que no llegaron a `pagado` — carritos abiertos (intentos de
 * compra en curso), vencidos o cancelados. A diferencia de `getOrders`
 * (spec 002/003, filtra por `confirmed_at`), aquí se filtra por
 * `created_at`: estos pedidos nunca tuvieron `confirmed_at`, así que no hay
 * otra fecha por la cual anclarlos al periodo.
 */
export async function getIncompleteOrders(period: PeriodRange): Promise<IncompleteOrder[]> {
  const supabase = createAdminClient();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, human_number, chat_id, status, created_at, updated_at, grand_total, delivery_method")
    .neq("status", "pagado")
    .gte("created_at", period.desde)
    .lt("created_at", period.hasta)
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: reservationRows, error: reservationsError } = await supabase
    .from("reservations")
    .select("order_id, qty, status, expires_at, product_variants(products(name))")
    .in("order_id", orderIds);

  if (reservationsError) throw reservationsError;

  const byOrder = new Map<string, { names: string[]; hasLiveReservation: boolean }>();
  const now = Date.now();

  for (const row of (reservationRows ?? []) as unknown as ReservationRow[]) {
    const entry = byOrder.get(row.order_id) ?? { names: [], hasLiveReservation: false };
    const name = row.product_variants?.products?.name;
    if (name) entry.names.push(`${name} ×${row.qty}`);
    if (row.status === "activa" && new Date(row.expires_at).getTime() > now) {
      entry.hasLiveReservation = true;
    }
    byOrder.set(row.order_id, entry);
  }

  return orders.map((order) => {
    const summary = byOrder.get(order.id);
    return {
      ...order,
      productSummary: summary?.names.join(", ") || "—",
      reservationsAllExpired: order.status === "abierto" && !summary?.hasLiveReservation,
    };
  });
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
export async function getFunnelCounts(period: PeriodRange): Promise<FunnelCounts> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("status")
    .gte("created_at", period.desde)
    .lt("created_at", period.hasta);

  if (error) throw error;

  const counts: FunnelCounts = { abierto: 0, pagado: 0, vencido: 0, cancelado: 0 };
  for (const row of data ?? []) {
    if (row.status in counts) counts[row.status as keyof FunnelCounts] += 1;
  }
  return counts;
}
