/**
 * Fuente única de los tipos de producto del panel: solo hay dos.
 * Sin dependencias de servidor para poder usarse en cliente, servidor y tests.
 */

export const PRODUCT_TYPES = [
  { value: "crisalidas", label: "Crisálidas y Mariposas", skuPrefix: "CRI" },
  { value: "complementos", label: "Complementos", skuPrefix: "COM" },
] as const;

export type ProductTypeValue = (typeof PRODUCT_TYPES)[number]["value"];

/** Colecciones (franjas de precio) de Crisálidas, en orden canónico. */
export const CRISALIDAS_COLLECTIONS = [
  "Pequeños Milagros",
  "Instantes de Vida",
  "Grandes Transformaciones",
  "Experiencias de Colección",
  "Mariposas de Liberación",
] as const;

export const NO_COLLECTION_LABEL = "Sin colección";

export function isProductType(value: string | undefined): value is ProductTypeValue {
  return PRODUCT_TYPES.some((t) => t.value === value);
}

/** "Crisálidas y Mariposas · Instantes de Vida" / "Complementos". */
export function productTypeLabel(brand: string, category: string | null): string {
  const type = PRODUCT_TYPES.find((t) => t.value === brand);
  if (!type) return brand;
  return brand === "crisalidas" && category ? `${type.label} · ${category}` : type.label;
}

interface Groupable {
  brand: string;
  category: string | null;
}

export interface ProductGroup<T> {
  type: (typeof PRODUCT_TYPES)[number];
  count: number;
  /** Todos los productos del tipo, en el orden recibido. */
  items: T[];
  /** Solo crisalidas: subgrupos por colección (vacío para complementos). */
  collections: { name: string; items: T[] }[];
}

export function groupProductsByType<T extends Groupable>(products: T[]): ProductGroup<T>[] {
  return PRODUCT_TYPES.map((type) => {
    const items = products.filter((p) => p.brand === type.value);
    const collections: { name: string; items: T[] }[] = [];
    if (type.value === "crisalidas") {
      const known = new Set<string>(CRISALIDAS_COLLECTIONS);
      for (const name of CRISALIDAS_COLLECTIONS) {
        const inCollection = items.filter((p) => p.category === name);
        if (inCollection.length > 0) collections.push({ name, items: inCollection });
      }
      const rest = items.filter((p) => !p.category || !known.has(p.category));
      if (rest.length > 0) collections.push({ name: NO_COLLECTION_LABEL, items: rest });
    }
    return { type, count: items.length, items, collections };
  });
}
