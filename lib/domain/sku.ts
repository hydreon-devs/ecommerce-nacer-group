import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Prefijos confirmados contra `products.sku` real (plan §7) — no de ningún
 * documento. `nacer-dominio` documenta `CM`/`JA`/`FL`, que no es lo que hay
 * cargado en la base real.
 */
const BRAND_PREFIX: Record<string, string> = {
  crisalidas: "CRI",
  jagua: "JAG",
  florea: "FLO",
};

export function brandPrefix(brand: string): string {
  const prefix = BRAND_PREFIX[brand];
  if (!prefix) throw new Error(`Marca desconocida: ${brand}`);
  return prefix;
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugCode(value: string, maxLength: number): string {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);
}

/** Sugerencia inicial, editable antes de guardar (plan §7) — no pretende
 * reproducir la abreviatura humana exacta de los SKU ya cargados. */
export function suggestProductSku(brand: string, tipo: string, name: string): string {
  return `${brandPrefix(brand)}-${slugCode(tipo, 3)}-${slugCode(name, 12)}`;
}

export function suggestVariantSku(productSku: string, attributeValue: string | null): string {
  if (!attributeValue) return `${productSku}-STD`;
  return `${productSku}-${slugCode(attributeValue, 2)}`;
}

export async function isProductSkuTaken(sku: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function isVariantSkuTaken(sku: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("sku")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * Si el código de 2 letras ya existe entre las variantes de ese producto,
 * prueba con 3 antes de devolver conflicto real al llamador (plan §7).
 */
export async function resolveVariantSku(
  productSku: string,
  attributeValue: string | null,
): Promise<{ sku: string; conflict: boolean }> {
  const twoLetter = suggestVariantSku(productSku, attributeValue);
  if (!(await isVariantSkuTaken(twoLetter))) return { sku: twoLetter, conflict: false };

  if (!attributeValue) return { sku: twoLetter, conflict: true };

  const threeLetter = `${productSku}-${slugCode(attributeValue, 3)}`;
  if (!(await isVariantSkuTaken(threeLetter))) return { sku: threeLetter, conflict: false };

  return { sku: threeLetter, conflict: true };
}
