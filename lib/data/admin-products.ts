import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { getStockItems, type StockItemRow } from "@/lib/data/stock-items";

/**
 * Capa de datos del panel para `products`/`product_variants`. Distinta de
 * `lib/data/products.ts` (mock del storefront de Crisálidas) — no se toca
 * ese archivo, es un contrato aparte documentado en su propia cabecera.
 */

export interface VariantRow {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price_delta: number;
  is_active: boolean;
  image_url: string | null;
  /** Unidades vendibles, de `v_variant_availability` (nunca stock_qty - reserved_qty). */
  availableUnits: number;
  bottleneckItemId: string | null;
  /** Insumo espejo 1:1 de la variante (`kind='self'`), si existe. */
  selfItemId: string | null;
  components: RecipeComponent[];
}

export interface RecipeComponent {
  stockItemId: string;
  qtyRequired: number;
}

export interface OptionRow {
  id: string;
  name: string;
  components: RecipeComponent[];
}

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string | null;
  base_price: number;
  is_published: boolean;
  thumbnailUrl: string | null;
  availableUnits: number;
}

export interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string | null;
  description: string | null;
  base_price: number;
  is_published: boolean;
  simbolismo: string | null;
  variants: VariantRow[];
  options: OptionRow[];
  /** Todos los insumos (con disponibilidad) para el selector y la vista previa de la receta. */
  stockItems: StockItemRow[];
}

interface RawVariant {
  id: string;
  sku: string;
  attributes: Record<string, string> | null;
  price_delta: number | string;
  is_active: boolean;
  image_url: string | null;
}

export async function getProducts(filters: {
  brand?: string;
  published?: boolean;
}): Promise<ProductListItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, brand, category, base_price, is_published, product_variants(id, sku, image_url, is_active)",
    )
    .order("name");

  if (filters.brand) query = query.eq("brand", filters.brand);
  if (typeof filters.published === "boolean") query = query.eq("is_published", filters.published);

  const [{ data, error }, availRes] = await Promise.all([
    query,
    supabase.from("v_variant_availability").select("variant_id, available_units"),
  ]);
  if (error) throw error;
  if (availRes.error) throw availRes.error;
  const unitsByVariant = new Map(
    (availRes.data ?? []).map((a) => [a.variant_id as string, Number(a.available_units)]),
  );

  return (data ?? []).map((p) => {
    const variants = (p.product_variants ?? []) as unknown as {
      id: string;
      image_url: string | null;
      is_active: boolean;
    }[];
    const activeVariants = variants.filter((v) => v.is_active);
    const thumbnailUrl = activeVariants.find((v) => v.image_url)?.image_url ?? null;
    const availableUnits = activeVariants.reduce(
      (sum, v) => sum + (unitsByVariant.get(v.id) ?? 0),
      0,
    );

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      base_price: Number(p.base_price),
      is_published: p.is_published,
      thumbnailUrl,
      availableUnits,
    };
  });
}

export async function getProductBySku(sku: string): Promise<ProductDetail | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sku, name, brand, category, description, base_price, is_published, simbolismo, product_variants(id, sku, attributes, price_delta, is_active, image_url)",
    )
    .eq("sku", sku)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const rawVariants = data.product_variants as unknown as RawVariant[];
  const variantIds = rawVariants.map((v) => v.id);

  const [availRes, varCompRes, optionsRes, stockItems] = await Promise.all([
    supabase
      .from("v_variant_availability")
      .select("variant_id, available_units, bottleneck_item_id")
      .in("variant_id", variantIds),
    supabase
      .from("variant_components")
      .select("variant_id, stock_item_id, qty_required")
      .in("variant_id", variantIds),
    supabase.from("product_options").select("id, name").eq("product_id", data.id).order("name"),
    getStockItems({ includeSelf: true }),
  ]);
  if (availRes.error) throw availRes.error;
  if (varCompRes.error) throw varCompRes.error;
  if (optionsRes.error) throw optionsRes.error;

  const optionIds = (optionsRes.data ?? []).map((o) => o.id as string);
  const optCompRes = optionIds.length
    ? await supabase
        .from("option_components")
        .select("option_id, stock_item_id, qty_required")
        .in("option_id", optionIds)
    : { data: [], error: null };
  if (optCompRes.error) throw optCompRes.error;

  const availByVariant = new Map(
    (availRes.data ?? []).map((a) => [a.variant_id as string, a]),
  );
  const compsByVariant = new Map<string, RecipeComponent[]>();
  for (const c of varCompRes.data ?? []) {
    const list = compsByVariant.get(c.variant_id) ?? [];
    list.push({ stockItemId: c.stock_item_id, qtyRequired: c.qty_required });
    compsByVariant.set(c.variant_id, list);
  }
  const compsByOption = new Map<string, RecipeComponent[]>();
  for (const c of optCompRes.data ?? []) {
    const list = compsByOption.get(c.option_id) ?? [];
    list.push({ stockItemId: c.stock_item_id, qtyRequired: c.qty_required });
    compsByOption.set(c.option_id, list);
  }
  const selfByVariant = new Map(
    stockItems.filter((i) => i.variantId).map((i) => [i.variantId as string, i.id]),
  );

  return {
    id: data.id,
    sku: data.sku,
    name: data.name,
    brand: data.brand,
    category: data.category,
    description: data.description,
    base_price: Number(data.base_price),
    is_published: data.is_published,
    simbolismo: data.simbolismo,
    variants: rawVariants.map((v) => {
      const av = availByVariant.get(v.id);
      return {
        id: v.id,
        sku: v.sku,
        attributes: v.attributes ?? {},
        price_delta: Number(v.price_delta),
        is_active: v.is_active,
        image_url: v.image_url,
        availableUnits: Number(av?.available_units ?? 0),
        bottleneckItemId: (av?.bottleneck_item_id as string | null) ?? null,
        selfItemId: selfByVariant.get(v.id) ?? null,
        components: compsByVariant.get(v.id) ?? [],
      };
    }),
    options: (optionsRes.data ?? []).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      components: compsByOption.get(o.id as string) ?? [],
    })),
    stockItems,
  };
}
