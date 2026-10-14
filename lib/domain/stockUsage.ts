/**
 * Agrupa por producto las variantes cuya receta usa un insumo (lógica pura,
 * para el diálogo "Ver más detalles" de Insumos).
 */

export interface VariantUsageRow {
  productSku: string;
  productName: string;
  variantSku: string;
  attributes: Record<string, unknown> | null;
  qtyRequired: number;
  /** `product_variants.image_url`; `products.image_url` está vacía. */
  imageUrl: string | null;
}

export interface ProductUsageVariant {
  sku: string;
  label: string;
  qtyRequired: number;
}

export interface ProductUsage {
  productSku: string;
  productName: string;
  imageUrl: string | null;
  variants: ProductUsageVariant[];
  /** Cantidad por unidad si es la misma en todas las variantes; `null` si difiere. */
  uniformQty: number | null;
  /** Hay que listar variantes: más de una, o cantidades distintas. */
  showVariants: boolean;
}

export function attributesLabel(attributes: Record<string, unknown> | null): string {
  if (!attributes) return "";
  return Object.values(attributes)
    .filter((v) => v !== null && v !== undefined && String(v) !== "")
    .map(String)
    .join(" · ");
}

const bySku = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function groupUsageByProduct(rows: VariantUsageRow[]): ProductUsage[] {
  const groups = new Map<string, VariantUsageRow[]>();
  for (const r of rows) groups.set(r.productSku, [...(groups.get(r.productSku) ?? []), r]);

  return [...groups.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => bySku(a.variantSku, b.variantSku));
      const qtys = new Set(sorted.map((r) => r.qtyRequired));
      return {
        productSku: sorted[0].productSku,
        productName: sorted[0].productName,
        imageUrl: sorted.find((r) => r.imageUrl)?.imageUrl ?? null,
        variants: sorted.map((r) => ({
          sku: r.variantSku,
          label: attributesLabel(r.attributes),
          qtyRequired: r.qtyRequired,
        })),
        uniformQty: qtys.size === 1 ? sorted[0].qtyRequired : null,
        showVariants: sorted.length > 1 || qtys.size > 1,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName, "es") || bySku(a.productSku, b.productSku));
}
