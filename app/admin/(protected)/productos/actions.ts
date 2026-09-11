"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { isProductSkuTaken, isVariantSkuTaken, resolveVariantSku } from "@/lib/domain/sku";

/** Techos de precio de Crisálidas (spec 001 §4.1) — advertencia, no bloqueo
 * (spec 002 §3.4.3): no hay CHECK en la base, así que tampoco lo hay aquí. */
const CRISALIDAS_PRICE_CEILING: Record<string, number> = {
  "Pequeños Milagros": 100000,
  "Instantes de Vida": 200000,
  "Grandes Transformaciones": 300000,
  "Experiencias de Colección": 350000,
};

export type FormState = { error: string | null; warning?: string | null };

const createProductSchema = z.object({
  brand: z.enum(["crisalidas", "jagua", "florea"]),
  sku: z.string().trim().min(3).max(40),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  basePrice: z.coerce.number().int().nonnegative(),
  variantSku: z.string().trim().min(3).max(60),
  attributeKey: z.string().trim().optional(),
  attributeValue: z.string().trim().optional(),
  stockQty: z.coerce.number().int().nonnegative(),
});

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const input = parsed.data;

  if (await isProductSkuTaken(input.sku)) {
    return { error: `El SKU de producto "${input.sku}" ya existe.` };
  }
  if (await isVariantSkuTaken(input.variantSku)) {
    return { error: `El SKU de variante "${input.variantSku}" ya existe.` };
  }

  let warning: string | null = null;
  if (input.brand === "crisalidas" && input.category) {
    const ceiling = CRISALIDAS_PRICE_CEILING[input.category];
    if (ceiling && input.basePrice > ceiling) {
      warning = `El precio supera el techo de "${input.category}" (${ceiling.toLocaleString("es-CO")} COP) — se guardó igual.`;
    }
  }

  const supabase = createAdminClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      sku: input.sku,
      name: input.name,
      brand: input.brand,
      description: input.description || null,
      category: input.brand === "crisalidas" ? input.category || null : null,
      base_price: input.basePrice,
    })
    .select("id, sku")
    .single();

  if (productError) {
    return { error: `No se pudo crear el producto: ${productError.message}` };
  }

  const attributes =
    input.attributeKey && input.attributeValue ? { [input.attributeKey]: input.attributeValue } : {};

  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: product.id,
    sku: input.variantSku,
    attributes,
    stock_qty: input.stockQty,
  });

  if (variantError) {
    // El producto no debe quedar huérfano sin ninguna variante.
    await supabase.from("products").delete().eq("id", product.id);
    return { error: `No se pudo crear la variante inicial: ${variantError.message}` };
  }

  revalidatePath("/admin/productos");

  if (warning) {
    redirect(`/admin/productos/${product.sku}?warning=${encodeURIComponent(warning)}`);
  }
  redirect(`/admin/productos/${product.sku}`);
}

export async function setProductPublished(productId: string, published: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_published: published })
    .eq("id", productId);
  if (error) throw error;
  revalidatePath("/admin/productos");
}

export async function updateVariantStock(variantId: string, stockQty: number) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ stock_qty: stockQty })
    .eq("id", variantId);
  if (error) throw error;
  revalidatePath("/admin/productos");
}

export async function setVariantActive(variantId: string, active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ is_active: active })
    .eq("id", variantId);
  if (error) throw error;
  revalidatePath("/admin/productos");
}

const createVariantSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  attributeKey: z.string().trim().optional(),
  attributeValue: z.string().trim().optional(),
  stockQty: z.coerce.number().int().nonnegative(),
});

export async function createVariant(
  formData: FormData,
): Promise<{ ok: true; sku: string } | { ok: false; error: string }> {
  const parsed = createVariantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const input = parsed.data;

  const { sku, conflict } = await resolveVariantSku(input.productSku, input.attributeValue || null);
  if (conflict) {
    return {
      ok: false,
      error: `No se encontró un SKU disponible a partir de "${input.attributeValue}". Ajusta el atributo.`,
    };
  }

  const attributes =
    input.attributeKey && input.attributeValue ? { [input.attributeKey]: input.attributeValue } : {};

  const supabase = createAdminClient();
  const { error } = await supabase.from("product_variants").insert({
    product_id: input.productId,
    sku,
    attributes,
    stock_qty: input.stockQty,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/productos");
  return { ok: true, sku };
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadVariantImage(
  variantId: string,
  variantSku: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecciona una imagen." };
  }

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: "Formato no soportado — usa PNG, JPG o WEBP." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La imagen supera 5 MB." };
  }

  const supabase = createAdminClient();

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("image_url")
    .eq("id", variantId)
    .maybeSingle();
  if (variantError) throw variantError;

  const path = `variants/${variantSku}.${ext}`;

  // Si la extensión anterior era distinta, borra el objeto viejo (plan §5):
  // si no, queda un archivo huérfano sirviendo una URL que nadie referencia.
  const previousMatch = variant?.image_url?.match(/variants\/[^/]+\.(\w+)$/);
  const previousExt = previousMatch?.[1];
  if (previousExt && previousExt !== ext) {
    await supabase.storage
      .from("catalogo_nacergroup")
      .remove([`variants/${variantSku}.${previousExt}`]);
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("catalogo_nacergroup")
    .upload(path, arrayBuffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { ok: false, error: `No se pudo subir la imagen: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("catalogo_nacergroup").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({ image_url: publicUrl })
    .eq("id", variantId);

  if (updateError) {
    return { ok: false, error: `No se pudo actualizar la variante: ${updateError.message}` };
  }

  revalidatePath("/admin/productos");
  return { ok: true, url: publicUrl };
}
