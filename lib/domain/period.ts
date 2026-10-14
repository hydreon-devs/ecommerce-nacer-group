/**
 * Periodos mensuales en America/Bogota (UTC-5 fijo, sin horario de verano).
 * Módulo puro, sin acceso a datos: lo comparten las consultas y el filtro de
 * Estadísticas, y por eso se puede probar sin Supabase.
 */

export interface PeriodRange {
  desde: string;
  hasta: string;
}

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

const MIN_YEAR = 2000;

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Rango UTC [desde, hasta) del mes calendario `month` (1-12) de `year` en Bogotá. */
export function periodForMonth(year: number, month: number): PeriodRange {
  // Date.UTC normaliza month = 12 a enero del año siguiente.
  const start = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const nextStart = Date.UTC(year, month, 1, 0, 0, 0);
  return {
    desde: new Date(start + BOGOTA_OFFSET_MS).toISOString(),
    hasta: new Date(nextStart + BOGOTA_OFFSET_MS).toISOString(),
  };
}

/** Año y mes calendario de Bogotá para un instante dado. */
export function bogotaYearMonth(now: Date): YearMonth {
  const bogota = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  return { year: bogota.getUTCFullYear(), month: bogota.getUTCMonth() + 1 };
}

/** Qué parte del tiempo muestra la pantalla; "all" es la vista sin filtros. */
export type PeriodSelection =
  | { kind: "all" }
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number };

/** Rango UTC de la selección; `null` significa sin límite de fechas. */
export function periodRange(selection: PeriodSelection): PeriodRange | null {
  switch (selection.kind) {
    case "all":
      return null;
    case "month":
      return periodForMonth(selection.year, selection.month);
    case "year":
      return {
        desde: new Date(Date.UTC(selection.year, 0, 1) + BOGOTA_OFFSET_MS).toISOString(),
        hasta: new Date(Date.UTC(selection.year + 1, 0, 1) + BOGOTA_OFFSET_MS).toISOString(),
      };
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "" ? undefined : v;
}

const UNFILTERED: PeriodSelection = { kind: "all" };

/**
 * Valida `?mes=&anio=`. Sin parámetros, o con cualquier valor mal formado,
 * fuera de rango o posterior al mes en curso, devuelve la vista sin filtros:
 * la URL nunca rompe la pantalla. `mes` sin `anio` no es un estado válido.
 */
export function parsePeriodParams(
  raw: { mes?: string | string[]; anio?: string | string[] },
  now: Date,
): PeriodSelection {
  const current = bogotaYearMonth(now);
  const mes = firstValue(raw.mes);
  const anio = firstValue(raw.anio);

  if (anio === undefined) return UNFILTERED;
  if (!/^\d{4}$/.test(anio)) return UNFILTERED;
  const year = Number(anio);
  if (year < MIN_YEAR || year > current.year) return UNFILTERED;

  if (mes === undefined) return { kind: "year", year };

  if (!/^\d{1,2}$/.test(mes)) return UNFILTERED;
  const month = Number(mes);
  if (month < 1 || month > 12) return UNFILTERED;
  if (year === current.year && month > current.month) return UNFILTERED;

  return { kind: "month", year, month };
}

const ALL: PeriodSelection = { kind: "all" };

export function samePeriod(a: PeriodSelection, b: PeriodSelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "all" || b.kind === "all") return true;
  if (a.year !== b.year) return false;
  return a.kind === "month" && b.kind === "month" ? a.month === b.month : true;
}

/**
 * Como `parsePeriodParams`, pero con un periodo por defecto de la pantalla:
 * sin parámetros, o con valores mal formados o imposibles, devuelve `fallback`
 * (no "todo el tiempo"). `?periodo=todos` es la forma explícita de pedir todo
 * el tiempo. Con `fallback` = todo (el valor por omisión) se comporta igual
 * que `parsePeriodParams`.
 */
export function resolvePeriodSelection(
  raw: { mes?: string | string[]; anio?: string | string[]; periodo?: string | string[] },
  now: Date,
  fallback: PeriodSelection = ALL,
): PeriodSelection {
  if (firstValue(raw.periodo) === "todos") return ALL;
  const parsed = parsePeriodParams(raw, now);
  return parsed.kind === "all" ? fallback : parsed;
}

/**
 * Query de la URL para una selección (`""` = URL sin parámetros). La selección
 * por defecto de la pantalla es la URL limpia; "todo el tiempo" solo se
 * escribe explícitamente (`?periodo=todos`) cuando el valor por defecto no es
 * todo. Inversa de `resolvePeriodSelection`.
 */
export function periodQuery(selection: PeriodSelection, fallback: PeriodSelection = ALL): string {
  if (samePeriod(selection, fallback)) return "";
  switch (selection.kind) {
    case "all":
      return "?periodo=todos";
    case "year":
      return `?anio=${selection.year}`;
    case "month":
      return `?mes=${selection.month}&anio=${selection.year}`;
  }
}

/** "Todos los periodos", "2026" u "Octubre de 2026". */
export function periodLabel(selection: PeriodSelection): string {
  switch (selection.kind) {
    case "all":
      return "Todos los periodos";
    case "year":
      return String(selection.year);
    case "month":
      return `${MONTH_NAMES[selection.month - 1]} de ${selection.year}`;
  }
}

/**
 * Día calendario (`YYYY-MM-DD`) en America/Bogota de un instante ISO. Los
 * `timestamptz` llegan en UTC: cortar el string daría el día UTC y movería
 * al día siguiente todo lo ocurrido después de las 7 p. m. de Bogotá.
 */
export function bogotaDay(iso: string): string {
  return new Date(new Date(iso).getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

export type TrendGranularity = "day" | "month";

/** Por día solo dentro de un mes; un año o todo el tiempo serían ilegibles diarios. */
export function trendGranularity(selection: PeriodSelection): TrendGranularity {
  return selection.kind === "month" ? "day" : "month";
}

export interface TrendPoint {
  /** `YYYY-MM-DD` (día) o `YYYY-MM` (mes), calendario de Bogotá. */
  date: string;
  total: number;
}

/** Suma ventas por día o mes de Bogotá, en orden cronológico. */
export function bucketTrend(
  orders: { confirmed_at: string; grand_total: number | string }[],
  granularity: TrendGranularity,
): TrendPoint[] {
  const buckets = new Map<string, number>();
  for (const order of orders) {
    const day = bogotaDay(order.confirmed_at);
    const key = granularity === "day" ? day : day.slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(order.grand_total));
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}
