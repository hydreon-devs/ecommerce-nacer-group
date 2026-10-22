/**
 * Delivery / pickup calendar. Pure: the server supplies `today`, the open
 * weekdays (`business_hours`) and the `holidays` rows.
 *
 * AUTHORITY: this calendar only decides which dates the picker offers. The
 * database function `is_delivery_date` is the authority and is re-checked at
 * order creation (slice 4). If the two ever disagree, the database wins.
 */

/** Calendar horizon, in days after today (`next_delivery_date` also searches 60). */
export const DELIVERY_HORIZON_DAYS = 60;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's calendar date in `America/Bogota` as `YYYY-MM-DD`, whatever the server's zone. */
export function bogotaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Day-of-week (0 = Sunday, as Postgres `extract(dow)`) of a `YYYY-MM-DD` date. */
export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

export function addDays(isoDate: string, days: number): string | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [, y, m, d] = match;
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d) + days);
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10);
}

export interface DeliveryCalendarInput {
  /** Today's Bogotá date, `YYYY-MM-DD`. */
  today: string;
  /** Weekdays with a `business_hours` row (0 = Sunday). */
  businessWeekdays: readonly number[];
  /** `holidays.holiday_date` values, `YYYY-MM-DD`. */
  holidays: readonly string[];
  horizonDays: number;
}

/**
 * Selectable dates, ascending: from TOMORROW up to `horizonDays` days ahead,
 * without closed weekdays or holidays. Empty when nothing is open.
 */
export function buildDeliveryCalendar(input: DeliveryCalendarInput): string[] {
  const open = new Set(input.businessWeekdays);
  const closed = new Set(input.holidays);
  const dates: string[] = [];
  for (let offset = 1; offset <= input.horizonDays; offset++) {
    const date = addDays(input.today, offset);
    if (date === null) return [];
    if (open.has(weekdayOf(date)) && !closed.has(date)) dates.push(date);
  }
  return dates;
}

const dateLabel = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC", // the string is a plain calendar date: no zone shift
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "viernes 23 de octubre" for a `YYYY-MM-DD` calendar date; anything else is returned as is. */
export function formatDeliveryDate(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) return isoDate;
  return dateLabel.format(new Date(`${isoDate}T00:00:00Z`)).replace(",", "");
}
