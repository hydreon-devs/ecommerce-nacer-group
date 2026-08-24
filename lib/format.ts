/**
 * Precios en enteros COP, sin decimales (`CLAUDE.md` — nunca float para
 * dinero). Formato `es-CO` en toda la UI.
 */
const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
  return cop.format(value);
}
