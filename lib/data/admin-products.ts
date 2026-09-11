import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";

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
  stock_qty: number;
  reserved_qty: number;
  is_active: boolean;
  image_url: string | null;
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
}

interface RawVariant {
  id: string;
  sku: string;
  attributes: Record<string, string> | null;
  price_delta: number | string;
  stock_qty: number;
  reserved_qty: number;
  is_active: boolean;
  image_url: string | null;
}

function normalizeVariant(v: RawVariant): VariantRow {
  return {
    id: v.id,
    sku: v.sku,
    attributes: v.attributes ?? {},
    price_delta: Number(v.price_delta),
    stock_qty: v.stock_qty,
    reserved_qty: v.reserved_qty,
    is_active: v.is_active,
    image_url: v.image_url,
  };
}

export async function getProducts(filters: {
  brand?: string;
  published?: boolean;
}): Promise<ProductListItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, brand, category, base_price, is_published, product_variants(sku, image_url, stock_qty, reserved_qty, is_active)",
    )
    .order("name");

  if (filters.brand) query = query.eq("brand", filters.brand);
  if (typeof filters.published === "boolean") query = query.eq("is_published", filters.published);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => {
    const variants = (p.product_variants ?? []) as unknown as {
      image_url: string | null;
      stock_qty: number;
      reserved_qty: number;
      is_active: boolean;
    }[];
    const activeVariants = variants.filter((v) => v.is_active);
    const thumbnailUrl = activeVariants.find((v) => v.image_url)?.image_url ?? null;
    const availableUnits = activeVariants.reduce(
      (sum, v) => sum + Math.max(v.stock_qty - v.reserved_qty, 0),
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
      "id, sku, name, brand, category, description, base_price, is_published, simbolismo, product_variants(id, sku, attributes, price_delta, stock_qty, reserved_qty, is_active, image_url)",
    )
    .eq("sku", sku)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

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
    variants: (data.product_variants as unknown as RawVariant[]).map(normalizeVariant),
  };
}
