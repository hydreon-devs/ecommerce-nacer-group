import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  bogotaDay,
  bogotaYearMonth,
  periodForMonth,
  type PeriodRange,
} from "@/lib/domain/period";

export type { PeriodRange };
// Se movió a lib/domain/period.ts (módulo puro y probado); se reexporta para los importadores existentes.
export { bogotaDay };

export type FulfillmentStatus = "en_construccion" | "en_despacho" | "entregado" | "perdido";

export interface OrderListItem {
  id: string;
  human_number: string;
  chat_id: string;
  status: string;
  payment_status: string | null;
  fulfillment_status: FulfillmentStatus | null;
  grand_total: number;
  delivery_method: string | null;
  advisor_name: string | null;
  supplier_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface OrderCounts {
  vendidos: number;
  enConstruccion: number;
  enDespacho: number;
  entregados: number;
  perdidos: number;
}

export interface OrderLineItem {
  variantSku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleDetails {
  submitted_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  delivery_address_exact: string | null;
  delivery_unit: string | null;
  neighborhood: string | null;
  city: string | null;
  building_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  may_call_recipient: boolean | null;
  card_from: string | null;
  card_to: string | null;
  card_message: string | null;
  special_notes: string | null;
  wants_invoice: boolean | null;
  invoice_legal_name: string | null;
  invoice_tax_id: string | null;
  invoice_email: string | null;
  referral_source: string | null;
}

export interface OrderDetail extends OrderListItem {
  delivery_address: string | null;
  delivery_distance_km: number | null;
  delivery_fee: number;
  total_price: number;
  payment_source: string | null;
  payment_ref: string | null;
  paid_amount: number | null;
  occasion: string | null;
  desired_delivery_date: string | null;
  lines: OrderLineItem[];
  saleDetails: SaleDetails | null;
}

/**
 * Fila completa de la tabla operativa (spec 003 §5) — el equivalente al
 * Excel del negocio. Junta `orders` con el resumen de líneas de producto y
 * `sale_details`, todo en un solo objeto por fila para no repetir el join
 * en cada celda de la tabla.
 */
export interface OrderTableRow extends OrderListItem {
  delivery_distance_km: number | null;
  delivery_fee: number;
  payment_source: string | null;
  occasion: string | null;
  desired_delivery_date: string | null;
  productSummary: string;
  totalQty: number;
  productCost: number;
  saleDetails: SaleDetails | null;
}

/**
 * Primer instante del mes en curso en America/Bogota (UTC-5 fijo, sin
 * horario de verano), expresado como rango UTC para filtrar `confirmed_at`.
 */
export function currentMonthPeriodBogota(): PeriodRange {
  const { year, month } = bogotaYearMonth(new Date());
  return periodForMonth(year, month);
}

/**
 * Año (Bogotá) de la primera venta confirmada: límite inferior del filtro de
 * año de Estadísticas. Usa `confirmed_at`, la misma fecha que filtran las
 * consultas de ventas; sin pedidos confirmados devuelve el año en curso.
 */
export async function getEarliestOrderYear(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("confirmed_at")
    .not("confirmed_at", "is", null)
    .order("confirmed_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const first = data?.[0]?.confirmed_at;
  return bogotaYearMonth(first ? new Date(first) : new Date()).year;
}

/** `period = null` es "todo el tiempo": solo exige que el pedido esté confirmado. */
function ordersConfirmedInPeriod(
  supabase: ReturnType<typeof createAdminClient>,
  period: PeriodRange | null,
) {
  const query = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .not("confirmed_at", "is", null);
  return period ? query.gte("confirmed_at", period.desde).lt("confirmed_at", period.hasta) : query;
}

/**
 * Los cuatro contadores del Excel del cliente más "entregados" — todos
 * filtrados por `confirmed_at`, nunca `created_at` (plan §4.1: `created_at`
 * cuenta carritos abandonados que nunca fueron una venta).
 */
export async function getOrderCounts(period: PeriodRange | null): Promise<OrderCounts> {
  const supabase = createAdminClient();

  const [vendidos, enConstruccion, enDespacho, entregados, perdidos] = await Promise.all([
    ordersConfirmedInPeriod(supabase, period).eq("status", "pagado"),
    ordersConfirmedInPeriod(supabase, period).eq("fulfillment_status", "en_construccion"),
    ordersConfirmedInPeriod(supabase, period).eq("fulfillment_status", "en_despacho"),
    ordersConfirmedInPeriod(supabase, period).eq("fulfillment_status", "entregado"),
    ordersConfirmedInPeriod(supabase, period).eq("fulfillment_status", "perdido"),
  ]);

  for (const res of [vendidos, enConstruccion, enDespacho, entregados, perdidos]) {
    if (res.error) throw res.error;
  }

  return {
    vendidos: vendidos.count ?? 0,
    enConstruccion: enConstruccion.count ?? 0,
    enDespacho: enDespacho.count ?? 0,
    entregados: entregados.count ?? 0,
    perdidos: perdidos.count ?? 0,
  };
}

interface OrderLineJoinRow {
  order_id: string;
  qty: number;
  total_price: number;
  product_variants: { products: { name: string } | null } | null;
}

/**
 * La tabla operativa completa (spec 003 §5) — todo lo que ya existe en
 * Supabase para igualar el Excel del negocio, en tres consultas en lote (no
 * una por fila): pedidos del periodo, sus líneas consumidas y su
 * `sale_details`.
 */
export async function getOrders(period: PeriodRange, limit = 50): Promise<OrderTableRow[]> {
  const supabase = createAdminClient();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, human_number, chat_id, status, payment_status, fulfillment_status, grand_total, delivery_method, delivery_distance_km, delivery_fee, payment_source, occasion, desired_delivery_date, advisor_name, supplier_name, created_at, confirmed_at",
    )
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", period.desde)
    .lt("confirmed_at", period.hasta)
    .order("confirmed_at", { ascending: false })
    .limit(limit);

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  const [{ data: lineRows, error: linesError }, { data: saleDetailRows, error: saleError }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("order_id, qty, total_price, product_variants(products(name))")
        .eq("status", "consumida")
        .in("order_id", orderIds),
      supabase.from("sale_details").select("*").in("order_id", orderIds),
    ]);

  if (linesError) throw linesError;
  if (saleError) throw saleError;

  const linesByOrder = new Map<string, { names: string[]; qty: number; cost: number }>();
  for (const row of (lineRows ?? []) as unknown as OrderLineJoinRow[]) {
    const entry = linesByOrder.get(row.order_id) ?? { names: [], qty: 0, cost: 0 };
    const name = row.product_variants?.products?.name;
    if (name) entry.names.push(`${name} ×${row.qty}`);
    entry.qty += row.qty;
    entry.cost += Number(row.total_price);
    linesByOrder.set(row.order_id, entry);
  }

  const saleDetailsByOrder = new Map<string, SaleDetails>();
  for (const row of saleDetailRows ?? []) {
    saleDetailsByOrder.set(row.order_id, row);
  }

  return orders.map((order) => {
    const summary = linesByOrder.get(order.id);
    return {
      ...order,
      productSummary: summary?.names.join(", ") || "—",
      totalQty: summary?.qty ?? 0,
      productCost: summary?.cost ?? 0,
      saleDetails: saleDetailsByOrder.get(order.id) ?? null,
    };
  });
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  const { data: reservationRows, error: reservationsError } = await supabase
    .from("reservations")
    .select("qty, unit_price, total_price, product_variants(sku, products(name))")
    .eq("order_id", orderId)
    .eq("status", "consumida");

  if (reservationsError) throw reservationsError;

  const lines: OrderLineItem[] = (reservationRows ?? []).map((row) => {
    const variant = row.product_variants as unknown as {
      sku: string;
      products: { name: string } | null;
    } | null;

    return {
      variantSku: variant?.sku ?? "—",
      productName: variant?.products?.name ?? "—",
      qty: row.qty,
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.total_price),
    };
  });

  const { data: saleDetails, error: saleDetailsError } = await supabase
    .from("sale_details")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (saleDetailsError) throw saleDetailsError;

  return { ...order, lines, saleDetails: saleDetails ?? null };
}
