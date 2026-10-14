import { BOGOTA_OFFSET_MS } from "./period.ts";

/**
 * Día de trabajo de Producción (`?fecha=YYYY-MM-DD`), en calendario de
 * America/Bogota. Módulo puro: el día viaja como string, nunca como `Date`
 * local, para que el huso del servidor no lo mueva.
 */

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Hoy (`YYYY-MM-DD`) en Bogotá para un instante dado. */
export function bogotaToday(now: Date): string {
  return new Date(now.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Instante UTC del día, o `null` si el texto no es un día real del calendario (2026-02-31). */
function dayToDate(day: string): Date | null {
  if (!DAY_FORMAT.test(day)) return null;
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // `Date` normaliza 02-31 a marzo: si el día no se conserva, no existía.
  return date.toISOString().slice(0, 10) === day ? date : null;
}

/** `true` si el texto es un día real con formato `YYYY-MM-DD`. */
export function isValidDay(value: string): boolean {
  return dayToDate(value) !== null;
}

/**
 * Valida `?fecha=`. Cualquier valor ausente, mal formado o imposible equivale
 * a hoy: la URL nunca rompe la pantalla.
 */
export function parseDayParam(raw: string | string[] | undefined, now: Date): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value !== undefined && dayToDate(value) ? value : bogotaToday(now);
}

/** Día `days` posteriores (o anteriores, si es negativo) a un día válido. */
export function shiftDay(day: string, days: number): string {
  const date = dayToDate(day);
  if (!date) throw new Error(`Día inválido: ${day}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "martes, 13 de octubre de 2026". */
export function formatLongDay(day: string): string {
  const date = dayToDate(day);
  if (!date) throw new Error(`Día inválido: ${day}`);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}
