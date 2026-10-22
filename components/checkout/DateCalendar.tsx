"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import {
  buildMonthGrid,
  formatMonthLabel,
  monthRange,
  moveFocus,
  type DayReason,
  type YearMonth,
} from "@/lib/domain/checkout/calendarGrid";
import { formatDeliveryDate } from "@/lib/domain/checkout/deliveryCalendar";

const WEEKDAYS = [
  ["L", "lunes"],
  ["M", "martes"],
  ["M", "miércoles"],
  ["J", "jueves"],
  ["V", "viernes"],
  ["S", "sábado"],
  ["D", "domingo"],
] as const;

const REASON_TEXT: Record<DayReason, string> = {
  past: "no disponible",
  holiday: "festivo, sin entregas",
  sunday: "domingo, sin entregas",
  closed: "sin atención",
  outside: "fuera del rango de fechas",
};

const NAV =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors duration-150 hover:border-moss hover:bg-moss/8 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/20 disabled:hover:bg-transparent motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

const monthOf = (date: string): YearMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});
const monthIndex = (m: YearMonth) => m.year * 12 + m.month;

interface Props {
  /** Selectable dates (`buildDeliveryCalendar`): the only dates that can be picked. */
  dates: readonly string[];
  holidays: readonly string[];
  /** Today's Bogotá date; marked, never selectable. */
  today: string;
  /** Selected date, or "". */
  value: string;
  onChange: (date: string) => void;
  /** Id of the visible label that names the picker. */
  labelId: string;
  describedBy?: string;
  /** "Entrega" / "Recogida": prefix of the text under the grid. */
  summaryLabel: string;
  onBlur?: () => void;
}

/**
 * Month-grid date picker following the WAI-ARIA date grid pattern: `role="grid"`
 * with a roving tabindex, arrow keys (day/week), Home/End (week), PageUp/PageDown
 * (month), Enter/Space to pick. Only dates in `dates` are buttons; the rest are
 * muted, not focusable and say why. Month change is a short slide + fade
 * (transform/opacity, 220 ms; plain fade with reduced motion, none on first render).
 */
export function DateCalendar({
  dates,
  holidays,
  today,
  value,
  onChange,
  labelId,
  describedBy,
  summaryLabel,
  onBlur,
}: Props) {
  const uid = useId();
  const reduced = useReducedMotion();
  const range = useMemo(() => monthRange(dates), [dates]);
  const gridRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef(false);

  const initialDate = dates.includes(value) ? value : (dates[0] ?? today);
  const [view, setView] = useState<YearMonth>(() => monthOf(initialDate));
  const [focused, setFocused] = useState(initialDate);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, dates, today, holidays),
    [view, dates, today, holidays],
  );

  // Roving tabindex: the focused date if it is on screen, else the first pickable day shown.
  const visible = weeks.flat().filter((c) => c.inMonth && c.selectable);
  const tabStop = visible.some((c) => c.date === focused) ? focused : visible[0]?.date;

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, view]);

  if (!range) return null;

  const canGoPrev = monthIndex(view) > monthIndex(range.first);
  const canGoNext = monthIndex(view) < monthIndex(range.last);

  function showMonth(next: YearMonth) {
    setDirection(monthIndex(next) > monthIndex(view) ? 1 : -1);
    setView(next);
  }
  function step(delta: -1 | 1) {
    const index = monthIndex(view) - 1 + delta;
    showMonth({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!current) return;
    const next = moveFocus(current, event.key, dates);
    if (next === null) return;
    event.preventDefault();
    pendingFocus.current = true;
    setFocused(next);
    const nextMonth = monthOf(next);
    if (monthIndex(nextMonth) !== monthIndex(view)) showMonth(nextMonth);
  }

  const captionId = `${uid}-caption`;
  const offset = reduced ? 0 : 24;

  return (
    <div className="w-full min-w-[19.25rem] max-[359px]:-mx-4 max-[359px]:w-[calc(100%+2rem)] sm:max-w-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className={NAV}
          onClick={() => step(-1)}
          disabled={!canGoPrev}
          aria-label="Mes anterior"
        >
          <ChevronLeftIcon />
        </button>
        <p id={captionId} aria-live="polite" className="font-display text-lg text-ink">
          {formatMonthLabel(view.year, view.month)}
        </p>
        <button
          type="button"
          className={NAV}
          onClick={() => step(1)}
          disabled={!canGoNext}
          aria-label="Mes siguiente"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="min-h-[18.5rem] overflow-hidden">
        <motion.div
          key={`${view.year}-${view.month}`}
          initial={direction === 0 ? false : { opacity: 0, x: direction * offset }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION_UI - 0.03, ease: EASE_UI }}
        >
          <table
            ref={gridRef}
            role="grid"
            aria-labelledby={`${labelId} ${captionId}`}
            aria-describedby={describedBy}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className="w-full table-fixed border-collapse"
          >
            <thead>
              <tr>
                {WEEKDAYS.map(([initial, name]) => (
                  <th
                    key={name}
                    scope="col"
                    abbr={name}
                    className="h-8 text-center font-body text-xs font-medium text-ink-muted"
                  >
                    <span aria-hidden="true">{initial}</span>
                    <span className="sr-only">{name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0].date}>
                  {week.map((cell) => {
                    if (!cell.inMonth) {
                      return <td key={cell.date} role="gridcell" aria-hidden="true" className="h-11" />;
                    }
                    const day = Number(cell.date.slice(8, 10));
                    const full = formatDeliveryDate(cell.date);
                    if (!cell.selectable) {
                      const why = cell.isToday ? "hoy, no disponible" : REASON_TEXT[cell.reason ?? "closed"];
                      return (
                        <td
                          key={cell.date}
                          role="gridcell"
                          aria-disabled="true"
                          aria-current={cell.isToday ? "date" : undefined}
                          className="p-0 text-center"
                        >
                          <span
                            aria-hidden="true"
                            className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full font-body text-sm text-ink/35 ${cell.isToday ? "ring-1 ring-ink/30" : ""}`}
                          >
                            {day}
                          </span>
                          <span className="sr-only">{`${full}, ${why}`}</span>
                        </td>
                      );
                    }
                    const selected = cell.date === value;
                    return (
                      <td key={cell.date} role="gridcell" aria-selected={selected} className="p-0 text-center">
                        <button
                          type="button"
                          data-date={cell.date}
                          tabIndex={cell.date === tabStop ? 0 : -1}
                          aria-label={full}
                          onFocus={() => setFocused(cell.date)}
                          onClick={() => {
                            setFocused(cell.date);
                            onChange(cell.date);
                          }}
                          className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full font-body text-sm tabular-nums transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
                            selected ? "bg-moss text-cream" : "text-ink hover:bg-moss/12"
                          }`}
                        >
                          {day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      <p aria-live="polite" className="mt-2 font-body text-sm text-ink">
        {value && dates.includes(value) ? (
          <>
            <span className="text-ink-muted">{summaryLabel}:</span>{" "}
            <span className="font-medium">{formatDeliveryDate(value)}</span>
          </>
        ) : (
          <span className="text-ink-muted">Aún no has elegido una fecha.</span>
        )}
      </p>
    </div>
  );
}
