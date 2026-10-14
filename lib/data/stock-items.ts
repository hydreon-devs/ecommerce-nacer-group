import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { groupUsageByProduct, type ProductUsage, type VariantUsageRow } from "@/lib/domain/stockUsage";

/**
 * Capa de datos de insumos (`stock_items`) para el panel. La disponibilidad
 * sale siempre de las vistas `v_stock_item_available` / `v_variant_availability`;
 * `product_variants.stock_qty/reserved_qty` están obsoletos y no se leen.
 */

export interface StockItemRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  kind: "self" | "component";
  unit: string;
  stockQty: number;
  reserved: number;
  available: number;
  isActive: boolean;
  variantId: string | null;
  isDemo: boolean;
}

export interface StockItemUsage {
  /** Una entrada por producto (variantes agrupadas). */
  products: ProductUsage[];
  options: { name: string; productName: string | null; qtyRequired: number }[];
}

export interface StockMovement {
  id: string;
  delta: number;
  stockAfter: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
  orderId: string | null;
}

interface RawItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  kind: "self" | "component";
  unit: string;
  stock_qty: number;
  is_active: boolean;
  variant_id: string | null;
}

interface RawAvailability {
  stock_item_id: string;
  reserved: number;
  available: number;
}

function toRow(item: RawItem, av: RawAvailability | undefined): StockItemRow {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description,
    kind: item.kind,
    unit: item.unit,
    stockQty: item.stock_qty,
    reserved: av?.reserved ?? 0,
    available: av?.available ?? item.stock_qty,
    isActive: item.is_active,
    variantId: item.variant_id,
    isDemo: item.sku.startsWith("DEMO-"),
  };
}

const ITEM_COLUMNS = "id, sku, name, description, kind, unit, stock_qty, is_active, variant_id";

/** Todos los insumos con su disponibilidad. Los `self` (espejo de variante) se excluyen salvo que se pida. */
export async function getStockItems(opts: { includeSelf?: boolean } = {}): Promise<StockItemRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from("stock_items").select(ITEM_COLUMNS).order("sku");
  if (!opts.includeSelf) query = query.eq("kind", "component");

  const [itemsRes, availRes] = await Promise.all([
    query,
    supabase.from("v_stock_item_available").select("stock_item_id, reserved, available"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (availRes.error) throw availRes.error;

  const availById = new Map((availRes.data as RawAvailability[]).map((a) => [a.stock_item_id, a]));
  return (itemsRes.data as RawItem[]).map((i) => toRow(i, availById.get(i.id)));
}

/** Mapa insumo -> dónde se usa: productos (con foto de variante) y adicionales. */
export async function getStockItemUsage(): Promise<Map<string, StockItemUsage>> {
  const supabase = createAdminClient();
  const [varRes, optRes] = await Promise.all([
    supabase
      .from("variant_components")
      .select(
        "stock_item_id, qty_required, product_variants(sku, attributes, image_url, products(sku, name))",
      ),
    supabase
      .from("option_components")
      .select("stock_item_id, qty_required, product_options(name, products(name))"),
  ]);
  if (varRes.error) throw varRes.error;
  if (optRes.error) throw optRes.error;

  const rowsByItem = new Map<string, VariantUsageRow[]>();
  const optionsByItem = new Map<string, StockItemUsage["options"]>();

  for (const r of varRes.data as unknown as {
    stock_item_id: string;
    qty_required: number;
    product_variants: {
      sku: string;
      attributes: Record<string, unknown> | null;
      image_url: string | null;
      products: { sku: string; name: string } | null;
    } | null;
  }[]) {
    const v = r.product_variants;
    if (!v?.products) continue;
    rowsByItem.set(r.stock_item_id, [
      ...(rowsByItem.get(r.stock_item_id) ?? []),
      {
        productSku: v.products.sku,
        productName: v.products.name,
        variantSku: v.sku,
        attributes: v.attributes,
        qtyRequired: r.qty_required,
        imageUrl: v.image_url,
      },
    ]);
  }
  for (const r of optRes.data as unknown as {
    stock_item_id: string;
    qty_required: number;
    product_options: { name: string; products: { name: string } | null } | null;
  }[]) {
    if (!r.product_options) continue;
    optionsByItem.set(r.stock_item_id, [
      ...(optionsByItem.get(r.stock_item_id) ?? []),
      {
        name: r.product_options.name,
        productName: r.product_options.products?.name ?? null,
        qtyRequired: r.qty_required,
      },
    ]);
  }

  const usage = new Map<string, StockItemUsage>();
  for (const id of new Set([...rowsByItem.keys(), ...optionsByItem.keys()])) {
    usage.set(id, {
      products: groupUsageByProduct(rowsByItem.get(id) ?? []),
      options: optionsByItem.get(id) ?? [],
    });
  }
  return usage;
}

/** Últimos `perItem` movimientos de cada insumo (mapa insumo -> movimientos, más reciente primero). */
export async function getRecentMovementsByItem(perItem = 3): Promise<Map<string, StockMovement[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, stock_item_id, delta, stock_after, reason, created_by, created_at, order_id")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const byItem = new Map<string, StockMovement[]>();
  for (const m of data as {
    id: string;
    stock_item_id: string;
    delta: number;
    stock_after: number;
    reason: string;
    created_by: string | null;
    created_at: string;
    order_id: string | null;
  }[]) {
    const list = byItem.get(m.stock_item_id) ?? [];
    if (list.length >= perItem) continue;
    list.push({
      id: m.id,
      delta: m.delta,
      stockAfter: m.stock_after,
      reason: m.reason,
      createdBy: m.created_by,
      createdAt: m.created_at,
      orderId: m.order_id,
    });
    byItem.set(m.stock_item_id, list);
  }
  return byItem;
}

export async function getStockItemBySku(sku: string): Promise<{
  item: StockItemRow;
  usage: StockItemUsage;
  movements: StockMovement[];
} | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_items")
    .select(ITEM_COLUMNS)
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as RawItem;

  const [availRes, movRes, usageMap] = await Promise.all([
    supabase
      .from("v_stock_item_available")
      .select("stock_item_id, reserved, available")
      .eq("stock_item_id", raw.id)
      .maybeSingle(),
    supabase
      .from("stock_movements")
      .select("id, delta, stock_after, reason, created_by, created_at, order_id")
      .eq("stock_item_id", raw.id)
      .order("created_at", { ascending: false })
      .limit(25),
    getStockItemUsage(),
  ]);
  if (availRes.error) throw availRes.error;
  if (movRes.error) throw movRes.error;

  return {
    item: toRow(raw, (availRes.data as RawAvailability | null) ?? undefined),
    usage: usageMap.get(raw.id) ?? { products: [], options: [] },
    movements: (
      movRes.data as {
        id: string;
        delta: number;
        stock_after: number;
        reason: string;
        created_by: string | null;
        created_at: string;
        order_id: string | null;
      }[]
    ).map((m) => ({
      id: m.id,
      delta: m.delta,
      stockAfter: m.stock_after,
      reason: m.reason,
      createdBy: m.created_by,
      createdAt: m.created_at,
      orderId: m.order_id,
    })),
  };
}
