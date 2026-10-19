import type {
  AdicionalProducto,
  ColeccionFiltro,
  Disponibilidad,
  ImagenProducto,
  Producto,
  VarianteProducto,
} from "./types";

/**
 * Mapeo puro filas de Supabase -> `Producto` del storefront. Sin Supabase ni
 * React: se prueba con `node --test`. La consulta vive en
 * `lib/data/storefront-products.ts`.
 */

/** Marcas que venden en el sitio hoy (`CLAUDE.md`). Florea no tiene productos. */
const SELLING_BRANDS = ["crisalidas", "complementos"] as const;

/** Orden canónico de colecciones (`nacer-dominio` §1); Complementos va al final. */
const COLLECTION_ORDER = [
  "Pequeños Milagros",
  "Instantes de Vida",
  "Grandes Transformaciones",
  "Experiencias de Colección",
  "Mariposas de Liberación",
  "Complementos",
] as const;

type Numeric = number | string | null | undefined;

export interface StorefrontVariantRow {
  id: string;
  sku: string;
  attributes: Record<string, unknown> | null;
  price_delta: Numeric;
  image_url: string | null;
  is_active: boolean;
  short_name: string | null;
}

export interface StorefrontOptionRow {
  id: string;
  name: string;
  price: Numeric;
  max_qty: number | null;
  is_active: boolean;
}

export interface StorefrontProductRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  description: string | null;
  image_url: string | null;
  base_price: Numeric;
  category: string | null;
  simbolismo: string | null;
  short_name: string | null;
  created_at: string;
  is_published: boolean;
  product_variants: StorefrontVariantRow[] | null;
  product_options: StorefrontOptionRow[] | null;
}

/** `numeric` de Postgres llega como string: entero COP, nunca float en la UI. */
export function toCop(value: Numeric): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Slug determinista desde el SKU. Los SKU son únicos y solo tienen [A-Z0-9-],
 * así que minúsculas es reversible: la búsqueda compara `slug` exacto contra el
 * slug derivado, sin tocar la DB por una columna que no existe.
 */
export function skuToSlug(sku: string): string {
  return sku.trim().toLowerCase();
}

export function collectionSlug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryLabel(brand: string, category: string | null): string {
  if (category && category.trim()) return category.trim();
  return brand === "complementos" ? "Complementos" : "Crisálidas";
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function variantLabel(
  attributes: Record<string, unknown> | null,
  shortName: string | null,
  sku: string,
): string {
  const values = Object.values(attributes ?? {})
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  if (values.length > 0) return capitalize(values.join(" · "));
  return shortName?.trim() || sku;
}

export function buildGallery(
  productName: string,
  productImage: string | null,
  variants: { etiqueta: string; imagenUrl: string | null }[],
): ImagenProducto[] {
  const gallery: ImagenProducto[] = [];
  const seen = new Set<string>();
  const push = (url: string | null, alt: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    gallery.push({ url, alt });
  };
  push(productImage, productName);
  for (const v of variants) push(v.imagenUrl, `${productName} — ${v.etiqueta}`);
  return gallery;
}

function collator() {
  return new Intl.Collator("es", { sensitivity: "base" });
}

function collectionRank(nombre: string): number {
  const i = (COLLECTION_ORDER as readonly string[]).indexOf(nombre);
  return i === -1 ? COLLECTION_ORDER.length : i;
}

/**
 * @param availability unidades vendibles por `variant_id`, de
 *   `v_variant_availability`. Una variante sin fila cuenta como 0.
 */
export function mapStorefrontProducts(
  rows: StorefrontProductRow[],
  availability: ReadonlyMap<string, number>,
): Producto[] {
  const products: Producto[] = [];

  for (const r of rows) {
    if (!r.is_published) continue;
    if (!(SELLING_BRANDS as readonly string[]).includes(r.brand)) continue;

    const base = toCop(r.base_price);
    const variantes: VarianteProducto[] = (r.product_variants ?? [])
      .filter((v) => v.is_active)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        etiqueta: variantLabel(v.attributes, v.short_name, v.sku),
        precioCop: Math.max(0, base + toCop(v.price_delta)),
        vendible: (availability.get(v.id) ?? 0) > 0,
        imagenUrl: v.image_url,
      }))
      .sort((a, b) => a.precioCop - b.precioCop || a.sku.localeCompare(b.sku));

    if (variantes.length === 0) continue;

    const adicionales: AdicionalProducto[] = (r.product_options ?? [])
      .filter((o) => o.is_active)
      .map((o) => ({
        id: o.id,
        nombre: o.name,
        precioCop: toCop(o.price),
        maxCantidad: Math.max(1, Math.round(Number(o.max_qty ?? 1)) || 1),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    // `disponibilidad` manda: se deriva de la vista de disponibilidad, no de
    // stock crudo. No hay "Bajo pedido" en los datos, así que no se fabrica.
    const disponibilidad: Disponibilidad = variantes.some((v) => v.vendible)
      ? "Disponible"
      : "Agotado";

    const coleccion = categoryLabel(r.brand, r.category);
    const precios = variantes.map((v) => v.precioCop);

    products.push({
      id: r.id,
      sku: r.sku,
      slug: skuToSlug(r.sku),
      nombre: r.name,
      coleccion,
      coleccionSlug: collectionSlug(coleccion),
      descripcion: r.description?.trim() || null,
      simbolismo: r.simbolismo?.trim() || null,
      precioDesdeCop: precios[0],
      tienePreciosVariables: precios[precios.length - 1] !== precios[0],
      disponibilidad,
      variantes,
      adicionales,
      imagenes: buildGallery(r.name, r.image_url, variantes),
      creadoEn: r.created_at,
    });
  }

  const cmp = collator();
  return products.sort(
    (a, b) =>
      collectionRank(a.coleccion) - collectionRank(b.coleccion) ||
      cmp.compare(a.nombre, b.nombre) ||
      a.sku.localeCompare(b.sku),
  );
}

/** Colecciones presentes en el catálogo, en orden canónico, para el filtro. */
export function listCollections(productos: Producto[]): ColeccionFiltro[] {
  const byName = new Map<string, ColeccionFiltro>();
  for (const p of productos) {
    if (!byName.has(p.coleccion)) {
      byName.set(p.coleccion, { slug: p.coleccionSlug, nombre: p.coleccion });
    }
  }
  return [...byName.values()].sort(
    (a, b) => collectionRank(a.nombre) - collectionRank(b.nombre) || a.nombre.localeCompare(b.nombre, "es"),
  );
}

/**
 * Destacados: los `limit` productos vendibles más recientes (`creadoEn` desc,
 * desempate por SKU). Determinista y sin curaduría manual; un producto que se
 * agota sale solo. Cuando exista una marca editorial (`destacado`), se cambia
 * aquí sin tocar a los consumidores.
 */
export function selectFeatured(productos: Producto[], limit: number): Producto[] {
  return productos
    .filter((p) => p.disponibilidad !== "Agotado")
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn) || a.sku.localeCompare(b.sku))
    .slice(0, limit);
}

const COMPLEMENTOS_SLUG = collectionSlug(categoryLabel("complementos", null));

const newestFirst = (a: Producto, b: Producto) =>
  b.creadoEn.localeCompare(a.creadoEn) || a.sku.localeCompare(b.sku);

/**
 * Recomendaciones de la ficha: otros vendibles de la misma colección, y si no
 * alcanzan el límite se completan con Complementos. Cada grupo va de más
 * reciente a más antiguo (empate por SKU, igual que `selectFeatured`). Los
 * agotados no se recomiendan y ningún producto se repite.
 */
export function selectRelated(productos: Producto[], current: Producto, limit: number): Producto[] {
  const candidates = productos.filter(
    (p) => p.id !== current.id && p.disponibilidad !== "Agotado",
  );
  const sameCollection = candidates
    .filter((p) => p.coleccionSlug === current.coleccionSlug)
    .sort(newestFirst);
  const complementos = candidates
    .filter((p) => p.coleccionSlug === COMPLEMENTOS_SLUG && p.coleccionSlug !== current.coleccionSlug)
    .sort(newestFirst);
  return [...sameCollection, ...complementos].slice(0, limit);
}
