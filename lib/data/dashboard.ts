import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import type { PeriodRange } from "./orders";

export interface SalesSummary {
  totalVentas: number;
  pedidosVendidos: number;
  ticketPromedio: number;
  pendientesDespacho: number;
}

export interface TrendPoint {
  date: string;
  total: number;
}

export interface BrandTotal {
  brand: string;
  total: number;
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
  fulfillment_status: string | null;
}

async function getPaidOrders(period: PeriodRange): Promise<PaidOrderRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, grand_total, confirmed_at, payment_source, fulfillment_status")
    .eq("status", "pagado")
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", period.desde)
    .lt("confirmed_at", period.hasta)
    .order("confirmed_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSalesSummary(period: PeriodRange): Promise<SalesSummary> {
  const orders = await getPaidOrders(period);
  const totalVentas = orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const pedidosVendidos = orders.length;
  const pendientesDespacho = orders.filter(
    (o) => o.fulfillment_status === "en_construccion" || o.fulfillment_status === "en_despacho",
  ).length;

  return {
    totalVentas,
    pedidosVendidos,
    ticketPromedio: pedidosVendidos > 0 ? Math.round(totalVentas / pedidosVendidos) : 0,
    pendientesDespacho,
  };
}

export async function getSalesTrend(period: PeriodRange): Promise<TrendPoint[]> {
  const orders = await getPaidOrders(period);
  const byDay = new Map<string, number>();

  for (const order of orders) {
    const day = order.confirmed_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(order.grand_total));
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

export async function getPaymentMethods(period: PeriodRange): Promise<MethodCount[]> {
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
  total_price: number;
  order_id: string;
  product_variants: {
    products: { name: string; brand: string } | null;
  } | null;
}

async function getPaidOrderLines(orderIds: string[]): Promise<ReservationLineRow[]> {
  if (orderIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("qty, total_price, order_id, product_variants(products(name, brand))")
    .eq("status", "consumida")
    .in("order_id", orderIds);

  if (error) throw error;
  return (data ?? []) as unknown as ReservationLineRow[];
}

export async function getSalesByBrand(period: PeriodRange): Promise<BrandTotal[]> {
  const orders = await getPaidOrders(period);
  const lines = await getPaidOrderLines(orders.map((o) => o.id));
  const byBrand = new Map<string, number>();

  for (const line of lines) {
    const brand = line.product_variants?.products?.brand ?? "sin marca";
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + Number(line.total_price));
  }

  return Array.from(byBrand.entries()).map(([brand, total]) => ({ brand, total }));
}

export async function getTopProducts(period: PeriodRange, limit = 8): Promise<ProductQty[]> {
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
