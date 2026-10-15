/**
 * Enlaces de contacto para las tarjetas de Despachos y Perdidos. Puras, sin
 * dependencias, para que `node --test` las cargue.
 */

const COUNTRY_CODE = "57";

/**
 * Normaliza un teléfono colombiano a solo dígitos con indicativo 57.
 * Acepta móviles de 10 dígitos, números que ya traen 57 o `+57`, y formatos
 * con espacios, guiones o sufijos de WhatsApp. Devuelve `null` si no es un
 * número reconocible (así la UI lo deja como texto plano).
 */
export function normalizeColombianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const international = raw.trim().startsWith("+");
  const digits = raw.split("@")[0].replace(/\D/g, "");
  if (digits.length === 10 && !international) return `${COUNTRY_CODE}${digits}`;
  if (digits.length === 12 && digits.startsWith(COUNTRY_CODE)) return digits;
  // Otro país con "+": se respeta tal cual (E.164 admite hasta 15 dígitos).
  if (international && digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

/** `tel:+57...` o `null` si el valor no es un teléfono reconocible. */
export function phoneHref(raw: string | null | undefined): string | null {
  const normalized = normalizeColombianPhone(raw);
  return normalized ? `tel:+${normalized}` : null;
}

/** Búsqueda de Google Maps para una dirección; `null` si está vacía o es el marcador de ausencia. */
export function mapsSearchHref(address: string | null | undefined, placeholder = "—"): string | null {
  const trimmed = address?.trim();
  if (!trimmed || trimmed === placeholder) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}
