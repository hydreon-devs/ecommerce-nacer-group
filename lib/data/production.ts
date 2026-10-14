import "server-only";
import { reservationStatusFor } from "@/lib/domain/reservationStatus";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Datos de Producción. El panel aún no tiene roles y corre con service_role,
 * así que la regla "producción no ve contacto ni dinero" se aplica aquí, en
 * la consulta: solo se piden las columnas que usa la vista. Nada de
 * `sale_details.*`, ni precios, ni totales.
 */

export interface ProductionLine {
  sku: string;
  productName: string;
  attributes: Record<string, unknown> | null;
  qty: number;
  /** Crisálidas de una unidad; `null` = sin definir. */
  chrysalisCount: number | null;
  /** `product_variants.image_url` (la de `products` está vacía); `null` = sin foto. */
  imageUrl: string | null;
  /** `reservations.options`: JSON libre, se interpreta en lib/domain/chrysalis. */
  options: unknown;
}

export interface ProductionSale {
  submitted_at: string | null;
  card_from: string | null;
  card_to: string | null;
  card_message: string | null;
  special_notes: string | null;
  neighborhood: string | null;
  city: string | null;
}

export interface ProductionOrder {
  id: string;
  human_number: string;
  status: string;
  payment_status: string | null;
  fulfillment_status: string | null;
  delivery_method: string | null;
  occasion: string | null;
  desired_delivery_date: string | null;
  advisor_name: string | null;
  supplier_name: string | null;
  artisan_name: string | null;
  lines: ProductionLine[];
  sale: ProductionSale | null;
}

const PRODUCTION_ORDER_COLUMNS =
  "id, human_number, status, payment_status, fulfillment_status, delivery_method, occasion, desired_delivery_date, advisor_name, supplier_name, artisan_name";

const SALE_COLUMNS = "order_id, submitted_at, card_from, card_to, card_message, special_notes, neighborhood, city";

/** Tope de seguridad: un día no debería acercarse a esto. */
const DAY_CAP = 500;

interface LineJoinRow {
  order_id: string;
  status: string;
  qty: number;
  options: unknown;
  product_variants: {
    sku: string;
    attributes: Record<string, unknown> | null;
    chrysalis_count: number | null;
    image_url: string | null;
    products: { name: string } | null;
  } | null;
}

/** Pedidos pagados cuya entrega deseada es `day` (`YYYY-MM-DD`), con líneas y datos posventa mínimos. */
export async function getProductionDay(day: string): Promise<ProductionOrder[]> {
  const supabase = createAdminClient();

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select(PRODUCTION_ORDER_COLUMNS)
    .eq("status", "pagado")
    .eq("desired_delivery_date", day)
    .order("confirmed_at", { ascending: true })
    // Desempate fijo: sin él, empates o nulos podrían cambiar de orden en cada recarga.
    .order("human_number", { ascending: true })
    .limit(DAY_CAP);
  if (ordersError) throw ordersError;

  const orders = (orderRows ?? []) as Omit<ProductionOrder, "lines" | "sale">[];
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => o.id);

  const [{ data: lineRows, error: linesError }, { data: saleRows, error: saleError }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "order_id, status, qty, options, product_variants(sku, attributes, chrysalis_count, image_url, products(name))",
      )
      .in("order_id", orderIds),
    supabase.from("sale_details").select(SALE_COLUMNS).in("order_id", orderIds),
  ]);
  if (linesError) throw linesError;
  if (saleError) throw saleError;

  const statusByOrder = new Map(orders.map((o) => [o.id, reservationStatusFor(o.status)]));
  const linesByOrder = new Map<string, ProductionLine[]>();
  for (const row of (lineRows ?? []) as unknown as LineJoinRow[]) {
    // Solo cuentan las líneas cuya reserva corresponde al estado del pedido (igual que en Pedidos).
    if (row.status !== statusByOrder.get(row.order_id)) continue;
    const variant = row.product_variants;
    const line: ProductionLine = {
      sku: variant?.sku ?? "—",
      productName: variant?.products?.name ?? "—",
      attributes: variant?.attributes ?? null,
      qty: row.qty,
      chrysalisCount: variant?.chrysalis_count ?? null,
      imageUrl: variant?.image_url ?? null,
      options: row.options,
    };
    linesByOrder.set(row.order_id, [...(linesByOrder.get(row.order_id) ?? []), line]);
  }

  const saleByOrder = new Map<string, ProductionSale>();
  for (const { order_id, ...sale } of (saleRows ?? []) as (ProductionSale & { order_id: string })[]) {
    saleByOrder.set(order_id, sale);
  }

  return orders.map((order) => ({
    ...order,
    lines: linesByOrder.get(order.id) ?? [],
    sale: saleByOrder.get(order.id) ?? null,
  }));
}
