/**
 * Clasificación del nivel de existencias para resaltar urgencias en las
 * tablas de inventario. Pura, para que `node --test` la cargue.
 *
 * Solo ve unidades: la disponibilidad editable (`Bajo pedido`) no llega a las
 * listas, por eso el cero se llama "Sin stock" y no "Agotado".
 */
/** Por debajo de este número de unidades se avisa "Pocas unidades". */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "out" | "low" | "ok";

export function classifyStock(units: number): StockLevel {
  if (units <= 0) return "out";
  if (units < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export const STOCK_LEVEL_LABEL: Record<Exclude<StockLevel, "ok">, string> = {
  out: "Sin stock",
  low: "Pocas unidades",
};
