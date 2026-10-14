import "server-only";
import { normalizeSearchTerm } from "@/lib/domain/orderSearch";
import { getDeliveryZones } from "@/lib/data/panel-sale";
import { isPanelChat, zoneNumberForFee } from "@/lib/domain/panelSale";
import { RESERVATION_STATUSES, reservationStatusFor } from "@/lib/domain/reservationStatus";
import type { FulfillmentStatus } from "@/lib/domain/fulfillmentStatus";
import { estadoSpec, orderDate, type OrderFilterSpec, type OrderState } from "@/lib/domain/orderState";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  bogotaDay,
  bogotaYearMonth,
  type PeriodRange,
} from "@/lib/domain/period";

export type { PeriodRange };
// Se movió a lib/domain/period.ts (módulo puro y probado); se reexporta para los importadores existentes.
export { bogotaDay };

// El tipo vive en lib/domain (módulo puro y probado); se reexporta para los importadores existentes.
export type { FulfillmentStatus };

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

/** Línea de producto sin precios: lo que ve quien despacha o produce. */
export interface OrderTableLine {
  name: string;
  sku: string;
  qty: number;
}

export interface SaleDetails {
  submitted_at: string | null;
  /** Celular del comprador; lo llenan las ventas del panel (en las del asistente el celular es `chat_id`). */
  buyer_phone?: string | null;
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
  /** Zona de domicilio (1 = primer tramo de tarifas); solo en pedidos del panel con domicilio. */
  deliveryZone?: number | null;
  /** Motivo al marcar el pedido como perdido desde Despachos; `null` si no hay. */
  lost_reason?: string | null;
  /** Seguimiento de la pérdida; `undefined` mientras la migración no se aplique. */
  lost_resolution?: string | null;
  lost_resolution_note?: string | null;
  lost_resolved_at?: string | null;
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
  /** Una entrada por línea de reserva, sin precios; la llena `hydrateOrders`. */
  lines?: OrderTableLine[];
  totalQty: number;
  productCost: number;
  saleDetails: SaleDetails | null;
  /** Zona de domicilio (1 = primer tramo de tarifas); solo en pedidos del panel con domicilio. */
  deliveryZone?: number | null;
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
  status: string;
  qty: number;
  total_price: number;
  product_variants: { sku: string; products: { name: string } | null } | null;
}

const ORDER_COLUMNS =
  "id, human_number, chat_id, status, payment_status, fulfillment_status, grand_total, delivery_method, delivery_distance_km, delivery_fee, payment_source, occasion, desired_delivery_date, advisor_name, supplier_name, created_at, confirmed_at";

/** Fila de `orders` tal como sale de `ORDER_COLUMNS`, antes de sumarle líneas y `sale_details`. */
type OrderRow = Omit<OrderTableRow, "productSummary" | "totalQty" | "productCost" | "saleDetails">;

/** Lo mínimo del constructor de consultas que usa `applySpec` (el cliente no tiene tipos generados). */
interface FilterableQuery<Q> {
  eq(column: string, value: string): Q;
  or(filters: string): Q;
}

/**
 * Aplica un Estado como condiciones de columna. Los valores de `spec` salen de
 * constantes del dominio, nunca de la URL cruda, así que pueden ir en `.or()`.
 */
function applySpec<Q extends FilterableQuery<Q>>(query: Q, spec: OrderFilterSpec | null): Q {
  if (!spec) return query;
  let next = query.eq("status", spec.status);
  if (spec.payment) {
    next =
      "eq" in spec.payment
        ? next.eq("payment_status", spec.payment.eq)
        : next.or(`payment_status.is.null,payment_status.neq.${spec.payment.notEq}`);
  }
  if (spec.fulfillment) {
    const { eq, withNull } = spec.fulfillment;
    next = withNull
      ? next.or(`fulfillment_status.is.null,fulfillment_status.eq.${eq}`)
      : next.eq("fulfillment_status", eq);
  }
  return next;
}

interface ListOptions {
  period: PeriodRange | null;
  limit: number;
  search?: string | null;
  spec?: OrderFilterSpec | null;
}

/**
 * Pedidos de cualquier estado, del más reciente al más antiguo por su fecha
 * (`confirmed_at` o, si aún no está confirmado, `created_at`). PostgREST no
 * ordena por `coalesce`, así que se consultan por separado los confirmados
 * (periodo y orden por `confirmed_at`) y los no confirmados (por
 * `created_at`), cada uno con su tope, y se mezclan aquí: el resultado es el
 * mismo que tendría un único orden por la fecha efectiva.
 */
async function listOrderRows({ period, limit, search, spec }: ListOptions): Promise<OrderRow[]> {
  const supabase = createAdminClient();
  // El término se normaliza aquí también (idempotente) y llega a `ilike` como
  // valor, nunca interpolado en un `.or()`: solo puede contener letras, dígitos y guiones.
  const term = normalizeSearchTerm(search);

  const build = (confirmed: boolean) => {
    const column = confirmed ? "confirmed_at" : "created_at";
    let query = supabase.from("orders").select(ORDER_COLUMNS);
    query = confirmed ? query.not("confirmed_at", "is", null) : query.is("confirmed_at", null);
    if (period) query = query.gte(column, period.desde).lt(column, period.hasta);
    if (term) query = query.ilike("human_number", `%${term}%`);
    return applySpec(query, spec ?? null)
      .order(column, { ascending: false })
      .limit(limit);
  };

  const [confirmed, unconfirmed] = await Promise.all([build(true), build(false)]);
  if (confirmed.error) throw confirmed.error;
  if (unconfirmed.error) throw unconfirmed.error;

  return [...((confirmed.data ?? []) as OrderRow[]), ...((unconfirmed.data ?? []) as OrderRow[])]
    .sort((a, b) => (orderDate(a) < orderDate(b) ? 1 : orderDate(a) > orderDate(b) ? -1 : 0))
    .slice(0, limit);
}

/** Zona de un pedido del panel con domicilio, por el valor de domicilio cobrado; `null` en los demás. */
async function zoneLookup(
  orders: { chat_id: string; delivery_method: string | null }[],
): Promise<(order: { chat_id: string; delivery_method: string | null; delivery_fee: number }) => number | null> {
  const needed = orders.some((o) => isPanelChat(o.chat_id) && o.delivery_method === "domicilio");
  const values = needed ? (await getDeliveryZones()).map((z) => z.value) : [];
  return (order) =>
    isPanelChat(order.chat_id) && order.delivery_method === "domicilio"
      ? zoneNumberForFee(Number(order.delivery_fee), values)
      : null;
}

/**
 * Completa cada pedido con el resumen de líneas y `sale_details`, en dos
 * consultas en lote (no una por fila).
 */
async function hydrateOrders(orders: OrderRow[]): Promise<OrderTableRow[]> {
  if (orders.length === 0) return [];
  const supabase = createAdminClient();
  const orderIds = orders.map((o) => o.id);
  const zoneOf = await zoneLookup(orders);

  const [{ data: lineRows, error: linesError }, { data: saleDetailRows, error: saleError }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("order_id, status, qty, total_price, product_variants(sku, products(name))")
        .in("status", [...RESERVATION_STATUSES])
        .in("order_id", orderIds),
      supabase.from("sale_details").select("*").in("order_id", orderIds),
    ]);

  if (linesError) throw linesError;
  if (saleError) throw saleError;

  const statusByOrder = new Map(orders.map((o) => [o.id, reservationStatusFor(o.status)]));
  const linesByOrder = new Map<string, { names: string[]; lines: OrderTableLine[]; qty: number; cost: number }>();
  for (const row of (lineRows ?? []) as unknown as OrderLineJoinRow[]) {
    // Solo cuentan las líneas cuya reserva corresponde al estado del pedido.
    if (row.status !== statusByOrder.get(row.order_id)) continue;
    const entry = linesByOrder.get(row.order_id) ?? { names: [], lines: [], qty: 0, cost: 0 };
    const name = row.product_variants?.products?.name;
    if (name) entry.names.push(`${name} ×${row.qty}`);
    entry.lines.push({ name: name ?? "—", sku: row.product_variants?.sku ?? "—", qty: row.qty });
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
      lines: summary?.lines ?? [],
      totalQty: summary?.qty ?? 0,
      productCost: summary?.cost ?? 0,
      saleDetails: saleDetailsByOrder.get(order.id) ?? null,
      deliveryZone: zoneOf(order),
    };
  });
}

/**
 * La tabla operativa completa (spec 003 §5): pedidos en cualquier estado,
 * filtrados por periodo (sobre su fecha efectiva), búsqueda y Estado.
 * `period` null = sin límite de fechas.
 */
export async function getOrders(
  period: PeriodRange | null,
  limit = 50,
  search?: string | null,
  estado?: OrderState | null,
): Promise<OrderTableRow[]> {
  const rows = await listOrderRows({
    period,
    limit,
    search,
    spec: estado ? estadoSpec(estado) : null,
  });
  return hydrateOrders(rows);
}

/** Tope de seguridad de los tableros de trabajo, que no se limitan por mes. */
const BOARD_CAP = 500;

/** Despachos: pagados `preparado` (listos) y `en_despacho`, sin límite de mes. */
export async function getDispatchOrders(): Promise<{
  ready: OrderTableRow[];
  inDispatch: OrderTableRow[];
}> {
  const [ready, inDispatch] = await Promise.all([
    listOrderRows({ period: null, limit: BOARD_CAP, spec: estadoSpec("preparado") }),
    listOrderRows({ period: null, limit: BOARD_CAP, spec: estadoSpec("en_despacho") }),
  ]);
  const [readyRows, inDispatchRows] = await Promise.all([hydrateOrders(ready), hydrateOrders(inDispatch)]);
  return { ready: readyRows, inDispatch: inDispatchRows };
}

/** Pedido perdido con su seguimiento (migración add_lost_follow_up_to_orders). */
export interface LostOrderRow extends OrderTableRow {
  lost_reason: string | null;
  lost_at: string | null;
  lost_resolution: string | null;
  lost_resolution_note: string | null;
  lost_resolved_at: string | null;
}

/** Tope de los pedidos perdidos ya resueltos que se muestran. */
const RESOLVED_LOST_LIMIT = 50;

const LOST_COLUMNS = `${ORDER_COLUMNS}, lost_reason, lost_at, lost_resolution, lost_resolution_note, lost_resolved_at`;

/**
 * Pedidos perdidos (pagados, fase `perdido`), sin límite de mes: los por
 * resolver (más antiguo primero, sin fecha al principio) y los 50 resueltos más
 * recientes. Requiere las columnas de la migración add_lost_follow_up_to_orders.
 */
export async function getLostOrders(): Promise<{ pending: LostOrderRow[]; resolved: LostOrderRow[] }> {
  const supabase = createAdminClient();
  const base = () =>
    supabase.from("orders").select(LOST_COLUMNS).eq("status", "pagado").eq("fulfillment_status", "perdido");

  const [pending, resolved] = await Promise.all([
    base()
      .is("lost_resolution", null)
      .order("lost_at", { ascending: true, nullsFirst: true })
      .limit(BOARD_CAP),
    base()
      .not("lost_resolution", "is", null)
      .order("lost_resolved_at", { ascending: false })
      .limit(RESOLVED_LOST_LIMIT),
  ]);
  if (pending.error) throw pending.error;
  if (resolved.error) throw resolved.error;

  const hydrated = await hydrateOrders([
    ...((pending.data ?? []) as unknown as OrderRow[]),
    ...((resolved.data ?? []) as unknown as OrderRow[]),
  ]);
  // `hydrateOrders` conserva el orden y las columnas de seguimiento de cada fila.
  const rows = hydrated as LostOrderRow[];
  const pendingCount = pending.data?.length ?? 0;
  return { pending: rows.slice(0, pendingCount), resolved: rows.slice(pendingCount) };
}

/**
 * Cuántos pedidos perdidos faltan por resolver (para el enlace de Despachos).
 * `null` si la consulta falla (p. ej. la migración aún no se aplica): el
 * enlace sigue visible sin contador y Despachos no se rompe.
 */
export async function countUnresolvedLostOrders(): Promise<number | null> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pagado")
    .eq("fulfillment_status", "perdido")
    .is("lost_resolution", null);
  return error ? null : (count ?? 0);
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
    .eq("status", reservationStatusFor(order.status));

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

  const zoneOf = await zoneLookup([order]);
  return { ...order, lines, saleDetails: saleDetails ?? null, deliveryZone: zoneOf(order) };
}
