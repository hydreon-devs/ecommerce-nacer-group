/**
 * Lógica pura de recetas de insumos (plan "productos compuestos por insumos").
 * La disponibilidad oficial la calcula la vista `v_variant_availability`;
 * `computeRecipeAvailability` replica esa regla solo para la vista previa del
 * editor antes de guardar.
 */

export interface RecipeRow {
  stockItemId: string;
  qtyRequired: number;
}

export interface ItemAvailability {
  available: number;
  isActive: boolean;
}

export interface RecipeAvailability {
  availableUnits: number;
  bottleneckItemId: string | null;
}

export function computeRecipeAvailability(
  rows: RecipeRow[],
  items: Record<string, ItemAvailability>,
): RecipeAvailability {
  if (rows.length === 0) return { availableUnits: 0, bottleneckItemId: null };

  let best: RecipeAvailability | null = null;
  for (const row of rows) {
    const item = items[row.stockItemId];
    const units =
      !item || !item.isActive || row.qtyRequired <= 0
        ? 0
        : Math.floor(Math.max(item.available, 0) / row.qtyRequired);
    if (best === null || units < best.availableUnits) {
      best = { availableUnits: units, bottleneckItemId: row.stockItemId };
    }
  }
  return best ?? { availableUnits: 0, bottleneckItemId: null };
}

export type RecipeValidation =
  | { ok: true }
  | { ok: false; error: "RECETA_VACIA" | "COMPONENTES_INVALIDOS" };

export function validateRecipeRows(
  rows: RecipeRow[],
  options: { allowEmpty?: boolean } = {},
): RecipeValidation {
  if (rows.length === 0) {
    return options.allowEmpty ? { ok: true } : { ok: false, error: "RECETA_VACIA" };
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.stockItemId || seen.has(row.stockItemId)) {
      return { ok: false, error: "COMPONENTES_INVALIDOS" };
    }
    seen.add(row.stockItemId);
    if (!Number.isInteger(row.qtyRequired) || row.qtyRequired <= 0) {
      return { ok: false, error: "COMPONENTES_INVALIDOS" };
    }
  }
  return { ok: true };
}

const RPC_MESSAGES: Record<string, string> = {
  MODO_INVALIDO: "Modo de ajuste inválido.",
  CANTIDAD_INVALIDA: "La cantidad debe ser un número entero válido.",
  MOTIVO_REQUERIDO: "Indica el motivo del ajuste.",
  INSUMO_NO_EXISTE: "El insumo ya no existe.",
  STOCK_NEGATIVO: "El ajuste dejaría el stock negativo.",
  VARIANTE_NO_EXISTE: "La variante ya no existe.",
  OPCION_NO_EXISTE: "El adicional ya no existe.",
  COMPONENTES_INVALIDOS:
    "Hay componentes inválidos: cada insumo debe aparecer una vez con una cantidad entera mayor que cero.",
  RECETA_VACIA: "Una variante necesita al menos un componente.",
  SKU_INVALIDO: "El SKU no es válido.",
  STOCK_INVALIDO: "El stock inicial debe ser un entero mayor o igual a cero.",
  PRODUCTO_NO_EXISTE: "El producto ya no existe.",
  SKU_EN_USO: "Ese SKU ya está en uso.",
  NOMBRE_REQUERIDO: "El nombre es obligatorio.",
  ORIGEN_INVALIDO: "Elige el origen del insumo.",
  VARIANTE_SOLO_TALLER: "Solo los insumos hechos en taller pueden tener variantes.",
  SKU_BASE_INVALIDO: "El insumo base no tiene una referencia válida para derivar variantes.",
  SUFIJOS_AGOTADOS: "Ese insumo ya no admite más variantes.",
  SECUENCIA_AGOTADA: "Se agotó la secuencia de referencias para este origen.",
};

export function rpcErrorMessage(code: string | undefined | null, fallback?: string): string {
  if (code && RPC_MESSAGES[code]) return RPC_MESSAGES[code];
  return fallback || "No se pudo completar la operación.";
}
