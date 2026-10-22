import { addDays, weekdayOf } from "./deliveryCalendar.ts";

/**
 * Pure helpers behind the month-grid date picker. The list of selectable dates
 * comes from `buildDeliveryCalendar` and stays the single source of truth; this
 * module only lays it out and moves the keyboard focus over it.
 * Dates are `YYYY-MM-DD` strings; months are 1-12; weeks start on Monday.
 */

export type DayReason = "past" | "holiday" | "sunday" | "outside" | "closed";

export interface MonthCell {
  date: string;
  /** Belongs to the displayed month (the rest is adjacent-month filler). */
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
  /** Why a day cannot be picked; absent when selectable. */
  reason?: DayReason;
}

export interface YearMonth {
  year: number;
  month: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Monday-first weekday index: Monday 0 ... Sunday 6. */
function mondayIndex(date: string): number {
  return (weekdayOf(date) + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function reasonFor(
  date: string,
  today: string,
  holidays: ReadonlySet<string>,
  last: string | undefined,
): DayReason {
  if (date <= today) return "past";
  if (holidays.has(date)) return "holiday";
  if (weekdayOf(date) === 0) return "sunday";
  if (last !== undefined && date > last) return "outside";
  return "closed";
}

/** Weeks x 7 cells (Monday-first) covering the month, with adjacent-month filler. */
export function buildMonthGrid(
  year: number,
  month: number,
  selectableDates: readonly string[],
  today: string,
  holidays: readonly string[] = [],
): MonthCell[][] {
  const selectable = new Set(selectableDates);
  const holidaySet = new Set(holidays);
  const last = selectableDates.reduce<string | undefined>(
    (max, d) => (max === undefined || d > max ? d : max),
    undefined,
  );

  const first = `${year}-${pad(month)}-01`;
  const lastOfMonth = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
  const start = addDays(first, -mondayIndex(first)) as string;
  const end = addDays(lastOfMonth, 6 - mondayIndex(lastOfMonth)) as string;

  const weeks: MonthCell[][] = [];
  let cursor = start;
  while (cursor <= end) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const isSelectable = selectable.has(cursor);
      week.push({
        date: cursor,
        inMonth: cursor.startsWith(`${year}-${pad(month)}-`),
        selectable: isSelectable,
        isToday: cursor === today,
        ...(isSelectable ? {} : { reason: reasonFor(cursor, today, holidaySet, last) }),
      });
      cursor = addDays(cursor, 1) as string;
    }
    weeks.push(week);
  }
  return weeks;
}

function toYearMonth(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

/** First and last month that contain selectable dates; null when there are none. */
export function monthRange(selectableDates: readonly string[]): { first: YearMonth; last: YearMonth } | null {
  if (selectableDates.length === 0) return null;
  const sorted = [...selectableDates].sort();
  return { first: toYearMonth(sorted[0]), last: toYearMonth(sorted[sorted.length - 1]) };
}

/** Same day in the month `delta` away, clamped to that month's length. */
function shiftMonth(date: string, delta: number): { target: string; prefix: string } {
  const { year, month } = toYearMonth(date);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(y, m));
  return { target: `${y}-${pad(m)}-${pad(day)}`, prefix: `${y}-${pad(m)}-` };
}

function dayDistance(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * Next focus target for a keyboard key over the selectable dates, or null for
 * keys it does not handle. It only ever lands on a selectable date and stays on
 * `current` when there is nowhere to go, so focus never leaves the range.
 */
export function moveFocus(
  current: string,
  key: string,
  selectableDates: readonly string[],
): string | null {
  const dates = [...selectableDates].sort();
  const before = (limit: string, inclusive: boolean) =>
    [...dates].reverse().find((d) => (inclusive ? d <= limit : d < limit));
  const after = (limit: string, inclusive: boolean) =>
    dates.find((d) => (inclusive ? d >= limit : d > limit));

  switch (key) {
    case "ArrowLeft":
      return before(current, false) ?? current;
    case "ArrowRight":
      return after(current, false) ?? current;
    case "ArrowUp":
      return before(addDays(current, -7) ?? current, true) ?? current;
    case "ArrowDown":
      return after(addDays(current, 7) ?? current, true) ?? current;
    case "Home":
    case "End": {
      const monday = addDays(current, -mondayIndex(current)) as string;
      const sunday = addDays(monday, 6) as string;
      const week = dates.filter((d) => d >= monday && d <= sunday);
      if (week.length === 0) return current;
      return key === "Home" ? week[0] : week[week.length - 1];
    }
    case "PageUp":
    case "PageDown": {
      const { target, prefix } = shiftMonth(current, key === "PageUp" ? -1 : 1);
      const inMonth = dates.filter((d) => d.startsWith(prefix));
      if (inMonth.length === 0) return current;
      // Nearest to the same day; on a tie, the later date.
      return inMonth.reduce((best, d) => {
        const diff = dayDistance(d, target) - dayDistance(best, target);
        return diff < 0 || (diff === 0 && d > best) ? d : best;
      });
    }
    default:
      return null;
  }
}

const monthLabel = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "Octubre de 2026". */
export function formatMonthLabel(year: number, month: number): string {
  const text = monthLabel.format(new Date(Date.UTC(year, month - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
