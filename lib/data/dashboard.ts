import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { cache } from "react";
import { bucketTrend, type TrendGranularity, type TrendPoint } from "@/lib/domain/period";
import type { PeriodRange } from "./orders";

export type { TrendPoint };

export interface SalesSummary {
  totalVentas: number;
  pedidosVendidos: number;
}

export interface ProductQty {
  name: string;
  qty: number;
}

export interface MethodCount {
  method: string;
  count: number;
}

interface PaidOrderRow {
  id: string;
  grand_total: number;
  confirmed_at: string;
  payment_source: string | null;
}

/**
 * PostgREST corta cada respuesta en su `max_rows` (1000 por defecto en
 * Supabase). Con "todo el tiempo" eso truncaría los totales en silencio, así
 * que se pagina hasta cubrir el conteo exacto. El orden incluye `id` para que
 * las páginas no se solapen con empates en `confirmed_at`, y el avance usa las
 * filas realmente devueltas, por si el límite del proyecto es menor al tamaño
 * de página.
 */
const PAGE_SIZE = 1000;

/**
 * `cache` de React deduplica por solicitud: las cuatro consultas de la
 * pantalla comparten una sola lectura mientras reciban el mismo `period`
 * (misma referencia, o `null`).
 */
const getPaidOrders = cache(async (period: PeriodRange | null): Promise<PaidOrderRow[]> => {
  const supabase = createAdminClient();
  const rows: PaidOrderRow[] = [];
  let total = Infinity;

  while (rows.length < total) {
    let query = supabase
      .from("orders")
      .select("id, grand_total, confirmed_at, payment_source", { count: "exact" })
      .eq("status", "pagado")
      .not("confirmed_at", "is", null);
    if (period) query = query.gte("confirmed_at", period.desde).lt("confirmed_at", period.hasta);

    const { data, count, error } = await query
      .order("confirmed_at", { ascending: true })
      .order("id", { ascending: true })
      .range(rows.length, rows.length + PAGE_SIZE - 1);

    if (error) throw error;
    total = count ?? 0;
    if (!data || data.length === 0) break;
    rows.push(...data);
  }

  return rows;
});

export async function getSalesSummary(period: PeriodRange | null): Promise<SalesSummary> {
  const orders = await getPaidOrders(period);
  const totalVentas = orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const pedidosVendidos = orders.length;

  return {
    totalVentas,
    pedidosVendidos,
  };
}

export async function getSalesTrend(
  period: PeriodRange | null,
  granularity: TrendGranularity,
): Promise<TrendPoint[]> {
  return bucketTrend(await getPaidOrders(period), granularity);
}

export async function getPaymentMethods(period: PeriodRange | null): Promise<MethodCount[]> {
  const orders = await getPaidOrders(period);
  const byMethod = new Map<string, number>();

  for (const order of orders) {
    const method = order.payment_source ?? "sin especificar";
    byMethod.set(method, (byMethod.get(method) ?? 0) + 1);
  }

  return Array.from(byMethod.entries()).map(([method, count]) => ({ method, count }));
}

interface ReservationLineRow {
  qty: number;
  order_id: string;
  product_variants: {
    products: { name: string } | null;
  } | null;
}

/**
 * Los ids viajan en la URL de la solicitud (`in.(uuid,uuid,...)`): cada uuid
 * ocupa ~37 caracteres, así que unos cientos ya rozan los límites habituales
 * de URL. Se consulta por lotes. Cada lote se pagina además por si sus
 * reservas superan `max_rows`.
 */
const ID_BATCH = 100;

async function getPaidOrderLines(orderIds: string[]): Promise<ReservationLineRow[]> {
  const supabase = createAdminClient();
  const lines: ReservationLineRow[] = [];

  for (let i = 0; i < orderIds.length; i += ID_BATCH) {
    const batch = orderIds.slice(i, i + ID_BATCH);
    let fetched = 0;
    let total = Infinity;
    while (fetched < total) {
      const { data, count, error } = await supabase
        .from("reservations")
        .select("qty, order_id, product_variants(products(name))", { count: "exact" })
        .eq("status", "consumida")
        .in("order_id", batch)
        .order("id", { ascending: true })
        .range(fetched, fetched + PAGE_SIZE - 1);

      if (error) throw error;
      total = count ?? 0;
      if (!data || data.length === 0) break;
      lines.push(...(data as unknown as ReservationLineRow[]));
      fetched += data.length;
    }
  }
  return lines;
}

export async function getTopProducts(period: PeriodRange | null, limit = 8): Promise<ProductQty[]> {
  const orders = await getPaidOrders(period);
  const lines = await getPaidOrderLines(orders.map((o) => o.id));
  const byProduct = new Map<string, number>();

  for (const line of lines) {
    const name = line.product_variants?.products?.name ?? "sin producto";
    byProduct.set(name, (byProduct.get(name) ?? 0) + line.qty);
  }

  return Array.from(byProduct.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}
