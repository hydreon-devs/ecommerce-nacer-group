export const IMAGE_BUCKET = "catalogo_nacergroup";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageFolder = "variants" | "stock-items";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type ImageValidation = { ok: true; ext: string } | { ok: false; error: string };

export function validateImageFile(file: { type: string; size: number }): ImageValidation {
  if (file.size === 0) return { ok: false, error: "Selecciona una imagen." };
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Formato no soportado — usa PNG, JPG o WEBP." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "La imagen supera 5 MB." };
  return { ok: true, ext };
}

/** Entrada opcional de un `FormData`: un input de archivo vacío llega como `File` de 0 bytes. */
export function optionalImageFile(entry: unknown): File | null {
  return entry instanceof File && entry.size > 0 ? entry : null;
}

/** Ruta del objeto a partir del SKU de la base. `null` si el SKU podría salirse de la carpeta. */
export function imageObjectPath(folder: ImageFolder, sku: string, ext: string): string | null {
  if (!sku || sku.includes("/") || sku.includes("..")) return null;
  return `${folder}/${sku}.${ext}`;
}

/**
 * Ruta de storage derivada de una URL pública guardada en la base. Solo
 * devuelve rutas dentro de nuestro bucket y de la carpeta indicada; cualquier
 * otra URL (otro bucket, externa, con `..`) da `null` y nunca se borra nada.
 */
export function storagePathFromPublicUrl(url: string | null, folder: ImageFolder): string | null {
  if (!url) return null;
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const raw = url.slice(at + marker.length).split(/[?#]/)[0];
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const parts = path.split("/");
  if (parts.length !== 2 || parts[0] !== folder || !parts[1] || parts[1].includes("..")) return null;
  return path;
}
