import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  variantLabel,
  type CatalogOption,
  type CatalogProduct,
  type DeliveryZone,
} from "@/lib/domain/panelSale";

/**
 * Lecturas del formulario "Nuevo pedido": catálogo vendible (productos
 * publicados con variantes activas y sus adicionales) y zonas de domicilio.
 */

interface ProductRow {
  id: string;
  name: string;
  base_price: number | string;
  product_variants: {
    id: string;
    sku: string;
    attributes: Record<string, string> | null;
    price_delta: number | string;
    is_active: boolean;
  }[];
}

export async function getSaleCatalog(): Promise<CatalogProduct[]> {
  const supabase = createAdminClient();

  const [productsRes, optionsRes, availRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, base_price, product_variants(id, sku, attributes, price_delta, is_active)",
      )
      .eq("is_published", true)
      .order("name"),
    supabase
      .from("product_options")
      .select("product_id, name, price, max_qty")
      .eq("is_active", true)
      .order("name"),
    supabase.from("v_variant_availability").select("variant_id, available_units"),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (availRes.error) throw availRes.error;
  if (optionsRes.error) throw optionsRes.error;

  const unitsByVariant = new Map(
    (availRes.data ?? []).map((a) => [a.variant_id as string, Number(a.available_units)]),
  );

  const optionsByProduct = new Map<string, CatalogOption[]>();
  for (const row of optionsRes.data ?? []) {
    const list = optionsByProduct.get(row.product_id) ?? [];
    list.push({ name: row.name, price: Number(row.price), maxQty: Number(row.max_qty) });
    optionsByProduct.set(row.product_id, list);
  }

  return ((productsRes.data ?? []) as unknown as ProductRow[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      variants: (p.product_variants ?? [])
        .filter((v) => v.is_active)
        .map((v) => ({
          sku: v.sku,
          label: variantLabel(v.attributes),
          price: Number(p.base_price) + Number(v.price_delta),
          available: unitsByVariant.get(v.id) ?? 0,
        })),
      options: optionsByProduct.get(p.id) ?? [],
    }))
    .filter((p) => p.variants.length > 0);
}

/** Zona N = N-ésimo tramo de `delivery_tariffs` por `km_from`; su valor es `base_price`. */
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_tariffs")
    .select("km_from, base_price")
    .order("km_from", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row, index) => ({ number: index + 1, value: Number(row.base_price) }));
}
