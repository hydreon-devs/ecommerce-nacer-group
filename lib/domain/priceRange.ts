/**
 * Filtro de precio del catálogo. Se filtra por `precioDesdeCop` porque es el
 * precio que muestra la tarjeta: filtrar por el de otra variante dejaría ver
 * un "Desde $X" fuera del rango elegido. Sin React, para que `node --test` lo
 * cargue. Todo en enteros COP.
 */

/** Paso de la barra en COP: fino para precios como $139.900, sin decimales. */
export const PRICE_STEP = 1000;

export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Extremos de la barra para un conjunto de productos, redondeados al paso
 * (piso el mínimo, techo el máximo) para que el rango incluya a todos.
 * `null` sin productos. Si todos cuestan lo mismo, el rango no colapsa.
 */
export function priceBounds(productos: { precioDesdeCop: number }[]): PriceRange | null {
  if (productos.length === 0) return null;
  const prices = productos.map((p) => p.precioDesdeCop);
  const min = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
  const max = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
  return { min, max: max > min ? max : min + PRICE_STEP };
}

/** Productos con `precioDesdeCop` dentro del rango, extremos incluidos. */
export function filterByPrice<T extends { precioDesdeCop: number }>(
  productos: T[],
  range: PriceRange | null,
): T[] {
  if (!range) return productos;
  return productos.filter((p) => p.precioDesdeCop >= range.min && p.precioDesdeCop <= range.max);
}
