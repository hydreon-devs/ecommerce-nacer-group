/**
 * Búsqueda por número de pedido (`?q=`). Módulo puro: normaliza el término
 * crudo de la URL y arma URLs conservando el resto de parámetros.
 */

export const SEARCH_MAX_LENGTH = 32;

/**
 * Solo letras, dígitos y guiones: nada de `%`, `_`, `*`, comas ni paréntesis,
 * así que lo escrito no puede actuar como comodín ni como sintaxis de filtro.
 * Vacío significa "sin búsqueda" (`null`).
 */
export function normalizeSearchTerm(raw: string | string[] | undefined | null): string | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) return null;
  const clean = first.trim().replace(/[^A-Za-z0-9-]/g, "").slice(0, SEARCH_MAX_LENGTH);
  return clean === "" ? null : clean;
}

/**
 * Si el término de la URL cambió por algo ajeno al campo ("Limpiar filtros",
 * el botón Atrás). Mientras el servidor responde, la URL sigue con el término
 * anterior, y cuando responde trae el que el propio campo envió: ninguno de
 * los dos casos debe pisar lo que el usuario está escribiendo.
 */
export function isExternalTermChange(urlTerm: string, previousUrlTerm: string, lastSent: string): boolean {
  return urlTerm !== previousUrlTerm && urlTerm !== lastSent;
}

/** Fija o quita (valor vacío) un parámetro de una URL relativa, sin tocar los demás. */
export function withParam(url: string, key: string, value: string): string {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  if (value === "") params.delete(key);
  else params.set(key, value);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
