import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import {
  IMAGE_BUCKET,
  imageObjectPath,
  storagePathFromPublicUrl,
  validateImageFile,
  type ImageFolder,
} from "@/lib/domain/imageUpload";

export type ImageTarget = {
  table: "product_variants" | "stock_items";
  folder: ImageFolder;
  id: string;
};

export type UploadImageResult =
  | { ok: true; url: string; sku: string }
  | { ok: false; error: string };
export type RemoveImageResult = { ok: true; sku: string } | { ok: false; error: string };

const NOT_FOUND = "No se encontró el registro.";
const UNAUTHORIZED = "Tu sesión expiró. Vuelve a iniciar sesión.";

/** Las acciones usan `service_role`, así que la sesión se verifica aquí además de en `proxy.ts`. */
async function hasSession(): Promise<boolean> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user !== null;
}

async function loadRow(target: ImageTarget) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(target.table)
    .select("sku, image_url")
    .eq("id", target.id)
    .maybeSingle();
  if (error) throw error;
  return data as { sku: string; image_url: string | null } | null;
}

/** El SKU y la ruta salen de la fila en la base, nunca del cliente. */
export async function storeImage(target: ImageTarget, file: unknown): Promise<UploadImageResult> {
  if (!(await hasSession())) return { ok: false, error: UNAUTHORIZED };
  if (!(file instanceof File)) return { ok: false, error: "Selecciona una imagen." };

  const validation = validateImageFile(file);
  if (!validation.ok) return validation;

  const row = await loadRow(target);
  if (!row) return { ok: false, error: NOT_FOUND };

  const path = imageObjectPath(target.folder, row.sku, validation.ext);
  if (!path) return { ok: false, error: "El SKU no permite guardar una imagen." };

  const supabase = createAdminClient();
  const storage = supabase.storage.from(IMAGE_BUCKET);

  const { error: uploadError } = await storage.upload(path, await file.arrayBuffer(), {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    return { ok: false, error: `No se pudo subir la imagen: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = storage.getPublicUrl(path);

  const { error: updateError } = await supabase
    .from(target.table)
    .update({ image_url: publicUrl })
    .eq("id", target.id);
  if (updateError) {
    return { ok: false, error: `No se pudo guardar la imagen: ${updateError.message}` };
  }

  // Si la extensión anterior era distinta, borra el objeto viejo: si no, queda
  // un archivo huérfano. Va después de guardar la URL nueva para no dejar la
  // fila apuntando a un objeto ya borrado si algo falla antes.
  const previous = storagePathFromPublicUrl(row.image_url, target.folder);
  if (previous && previous !== path) await storage.remove([previous]);

  return { ok: true, url: publicUrl, sku: row.sku };
}

export async function clearImage(target: ImageTarget): Promise<RemoveImageResult> {
  if (!(await hasSession())) return { ok: false, error: UNAUTHORIZED };

  const row = await loadRow(target);
  if (!row) return { ok: false, error: NOT_FOUND };

  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from(target.table)
    .update({ image_url: null })
    .eq("id", target.id);
  if (updateError) {
    return { ok: false, error: `No se pudo eliminar la imagen: ${updateError.message}` };
  }

  // Solo se borra el objeto si la URL apunta a nuestro bucket y carpeta.
  const path = storagePathFromPublicUrl(row.image_url, target.folder);
  if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path]);

  return { ok: true, sku: row.sku };
}
