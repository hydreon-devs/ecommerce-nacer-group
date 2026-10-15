export type AdjustMode = "delta" | "set";

/**
 * Valor inicial del campo de cantidad al cambiar el tipo de ajuste. En "fijar
 * valor" arranca en el stock actual (si no, enviar sin tocar dejaría el stock
 * en 0); en "sumar / restar" vuelve a 0.
 */
export function nextQtyForMode(mode: AdjustMode, currentStock: number): number {
  return mode === "set" ? currentStock : 0;
}

/**
 * Un ajuste absoluto que deja el stock en 0 o que lo baja más de la mitad se
 * confirma antes de aplicarse. Sumar/restar nunca pide confirmación.
 */
export function adjustNeedsConfirmation(input: {
  mode: AdjustMode;
  current: number;
  qty: number;
}): boolean {
  if (input.mode !== "set" || input.current <= 0) return false;
  return input.qty === 0 || input.qty < input.current / 2;
}
