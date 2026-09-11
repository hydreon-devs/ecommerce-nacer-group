import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type FulfillmentStatus = "en_construccion" | "en_despacho" | "entregado" | "perdido";

export interface OrderListItem {
  id: string;
  chat_id: string;
  status: string;
  payment_status: string | null;
  fulfillment_status: FulfillmentStatus | null;
  grand_total: number;
  delivery_method: string | null;
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

export interface PeriodRange {
  desde: string;
  hasta: string;
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
  lines: OrderLineItem[];
  saleDetails: SaleDetails | null;
}

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Primer instante del mes en curso en America/Bogota (UTC-5 fijo, sin
 * horario de verano), expresado como rango UTC para filtrar `confirmed_at`.
 */
export function currentMonthPeriodBogota(): PeriodRange {
  const bogotaNow = new Date(Date.now() - BOGOTA_OFFSET_MS);
  const year = bogotaNow.getUTCFullYear();
  const month = bogotaNow.getUTCMonth();

  const startOfMonthBogota = Date.UTC(year, month, 1, 0, 0, 0);
  const startOfNextMonthBogota = Date.UTC(year, month + 1, 1, 0, 0, 0);

  return {
    desde: new Date(startOfMonthBogota + BOGOTA_OFFSET_MS).toISOString(),
    hasta: new Date(startOfNextMonthBogota + BOGOTA_OFFSET_MS).toISOString(),
  };
}

function ordersConfirmedInPeriod(
  supabase: ReturnType<typeof createAdminClient>,
  period: PeriodRange,
) {
  return supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", period.desde)
    .lt("confirmed_at", period.hasta);
}

/**
 * Los cuatro contadores del Excel del cliente más "entregados" — todos
 * filtrados por `confirmed_at`, nunca `created_at` (plan §4.1: `created_at`
 * cuenta carritos abandonados que nunca fueron una venta).
 */
export async function getOrderCounts(period: PeriodRange): Promise<OrderCounts> {
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

export async function getOrders(period: PeriodRange, limit = 50): Promise<OrderListItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, chat_id, status, payment_status, fulfillment_status, grand_total, delivery_method, created_at, confirmed_at",
    )
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", period.desde)
    .lt("confirmed_at", period.hasta)
    .order("confirmed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
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
