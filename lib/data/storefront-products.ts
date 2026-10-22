import "server-only";
import { unstable_cache } from "next/cache";
import {
  listCollections,
  mapStorefrontProducts,
  selectFeatured,
  selectRelated,
  type StorefrontProductRow,
} from "@/lib/domain/storefrontCatalog";
import type { ColeccionFiltro, Producto } from "@/lib/domain/types";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Catálogo público. RLS está activo sin políticas en las tablas de producto, así
 * que el anon key no lee nada y la vista de disponibilidad es `security_invoker`:
 * se lee en servidor con `createAdminClient()`, seleccionando SOLO columnas
 * públicas (nunca `select("*")`, ni stock_qty/reserved_qty/costos). Ni el cliente
 * ni las filas crudas cruzan a componentes de cliente: salen `Producto`s ya
 * mapeados, sin unidades exactas.
 */

/** Productos mapeados + unidades vendibles por variante (`available_units`). */
export interface FreshStorefrontCatalog {
  products: Producto[];
  unitsByVariant: Map<string, number>;
}

const FEATURED_LIMIT = 6;
const RELATED_LIMIT = 4;

/**
 * Caché: `unstable_cache` con `revalidate: 300` (5 min). El proyecto no usa
 * Cache Components, y según la guía "Caching (previous model)" esta es la forma
 * de cachear consultas que no son `fetch` (supabase-js no es cacheable por
 * `fetch`). Cinco minutos: el stock cambia con las ventas pero un desfase corto
 * es aceptable en vitrina, y el checkout/WhatsApp vuelve a validar. La clave es
 * única (todo el catálogo son ~43 productos) y lleva tag para invalidar bajo
 * demanda con `revalidateTag("storefront-products")` desde el panel.
 */
const loadCatalog = unstable_cache(
  async (): Promise<Producto[]> => (await queryCatalog()).products,
  ["storefront-products"],
  { revalidate: 300, tags: ["storefront-products"] },
);

/**
 * Lectura directa a la base, sin caché. Sin `productIds` trae todo el catálogo
 * (lo que cachea `loadCatalog`); con ellos, solo esos productos. Devuelve además
 * las unidades por variante, que NO cruzan al cliente: las usa el re-chequeo de
 * disponibilidad del checkout, que necesita datos frescos.
 */
async function queryCatalog(productIds?: readonly string[]): Promise<FreshStorefrontCatalog> {
  if (productIds && productIds.length === 0) {
    return { products: [], unitsByVariant: new Map() };
  }
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, brand, description, image_url, base_price, category, simbolismo, short_name, created_at, is_published, " +
        "product_variants(id, sku, attributes, price_delta, image_url, is_active, short_name), " +
        "product_options(id, name, price, max_qty, is_active)",
    )
    .eq("is_published", true)
    .in("brand", ["crisalidas", "complementos"]);
  if (productIds) query = query.in("id", [...productIds]);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as StorefrontProductRow[];
  if (rows.length === 0) return { products: [], unitsByVariant: new Map() };

  const { data: avail, error: availError } = await supabase
    .from("v_variant_availability")
    .select("variant_id, available_units")
    .in(
      "product_id",
      rows.map((r) => r.id),
    );
  if (availError) throw availError;

  const unitsByVariant = new Map<string, number>(
    (avail ?? []).map((a) => [a.variant_id as string, Number(a.available_units)]),
  );

  return { products: mapStorefrontProducts(rows, unitsByVariant), unitsByVariant };
}

/**
 * Catálogo FRESCO de los productos pedidos, saltándose la caché de 5 minutos.
 * Solo para el re-chequeo no reservante al entrar a `/checkout`; el resto de la
 * vitrina sigue leyendo `getStorefrontProducts`.
 */
export async function getFreshStorefrontProducts(
  productIds: readonly string[],
): Promise<FreshStorefrontCatalog> {
  return queryCatalog(productIds);
}

export async function getStorefrontProducts(): Promise<Producto[]> {
  return loadCatalog();
}

export async function getStorefrontProductBySlug(slug: string): Promise<Producto | null> {
  const products = await loadCatalog();
  // Slug exacto: el derivado del SKU, sin normalizar lo que llega por la URL.
  return products.find((p) => p.slug === slug) ?? null;
}

/** Los {@link FEATURED_LIMIT} vendibles más recientes; regla en `selectFeatured`. */
export async function getFeaturedProducts(): Promise<Producto[]> {
  return selectFeatured(await loadCatalog(), FEATURED_LIMIT);
}

/** Hasta {@link RELATED_LIMIT} vendibles de la misma colección; regla en `selectRelated`. */
export async function getRelatedProducts(producto: Producto): Promise<Producto[]> {
  return selectRelated(await loadCatalog(), producto, RELATED_LIMIT);
}

export async function getStorefrontCollections(): Promise<ColeccionFiltro[]> {
  return listCollections(await loadCatalog());
}

