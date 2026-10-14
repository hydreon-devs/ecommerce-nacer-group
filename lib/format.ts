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

const bogotaDateTime = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fecha y hora de un instante ISO en America/Bogota, sin depender de la zona del servidor. */
export function formatDateTimeBogota(iso: string): string {
  return bogotaDateTime.format(new Date(iso));
}
