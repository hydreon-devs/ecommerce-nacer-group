import { bogotaToday } from "./productionDay.ts";

/**
 * Reglas puras del seguimiento de pedidos perdidos: resolución y nota,
 * quién puede resolverse, separación en grupos y días desde la pérdida.
 * La resolución es solo un registro: no reembolsa ni crea pedidos.
 */

export type LostResolution = "repuesto" | "reembolsado" | "cerrado_sin_accion";

export const LOST_RESOLUTIONS: readonly LostResolution[] = [
  "repuesto",
  "reembolsado",
  "cerrado_sin_accion",
];

export const RESOLUTION_LABELS: Record<LostResolution, string> = {
  repuesto: "Repuesto",
  reembolsado: "Reembolsado",
  cerrado_sin_accion: "Cerrado sin acción",
};

export const LOST_NOTE_MAX = 500;

export type ResolutionResult =
  | { ok: true; resolution: LostResolution; note: string | null }
  | { ok: false; error: "RESOLUCION_INVALIDA" | "NOTA_INVALIDA" };

/** Resolución obligatoria y nota opcional (recortada; vacía = null; máximo 500). */
export function validateResolution(resolution: unknown, note: unknown): ResolutionResult {
  const found = LOST_RESOLUTIONS.find((value) => value === resolution);
  if (!found) return { ok: false, error: "RESOLUCION_INVALIDA" };
  if (note === null || note === undefined) return { ok: true, resolution: found, note: null };
  if (typeof note !== "string") return { ok: false, error: "NOTA_INVALIDA" };
  const trimmed = note.trim();
  if (trimmed.length > LOST_NOTE_MAX) return { ok: false, error: "NOTA_INVALIDA" };
  return { ok: true, resolution: found, note: trimmed === "" ? null : trimmed };
}

/** Solo un pedido pagado, perdido y sin resolución puede resolverse. */
export function canResolveLost(order: {
  status: string;
  fulfillment_status: string | null;
  lost_resolution: string | null;
}): boolean {
  return (
    order.status === "pagado" &&
    order.fulfillment_status === "perdido" &&
    order.lost_resolution === null
  );
}

/**
 * Por resolver: el más antiguo por `lost_at` primero, los de fecha nula al
 * principio. Resueltos: el más reciente por `lost_resolved_at` primero.
 */
export function splitLostOrders<
  T extends { lost_at: string | null; lost_resolution: string | null; lost_resolved_at: string | null },
>(orders: T[]): { pending: T[]; resolved: T[] } {
  const time = (value: string | null, fallback: number) => {
    const ms = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(ms) ? fallback : ms;
  };
  const pending = orders
    .filter((o) => o.lost_resolution === null)
    .sort((a, b) => time(a.lost_at, -Infinity) - time(b.lost_at, -Infinity) || 0);
  const resolved = orders
    .filter((o) => o.lost_resolution !== null)
    .sort((a, b) => time(b.lost_resolved_at, -Infinity) - time(a.lost_resolved_at, -Infinity) || 0);
  return { pending, resolved };
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Días calendario (Bogotá) desde la pérdida; `null` si no hay fecha legible. Nunca negativo. */
export function daysSinceLoss(lostAt: string | null, now: Date): number | null {
  if (!lostAt) return null;
  const lost = new Date(lostAt);
  if (Number.isNaN(lost.getTime())) return null;
  return Math.max(0, dayNumber(bogotaToday(now)) - dayNumber(bogotaToday(lost)));
}

export function daysSinceLossLabel(days: number): string {
  if (days === 0) return "hoy";
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}
