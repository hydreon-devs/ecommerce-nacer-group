"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { isValidDay } from "@/lib/domain/productionDay";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

const BUTTON =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent";

interface DayPickerProps {
  /** Día mostrado (`YYYY-MM-DD`). */
  selected: string;
  previous: string;
  next: string;
  today: string;
}

function hrefFor(pathname: string, day: string, today: string): string {
  return day === today ? pathname : `${pathname}?fecha=${day}`;
}

/**
 * Día de Producción. El calendario admite cualquier fecha; anterior,
 * siguiente y "Hoy" son atajos. El día vive en la URL (`?fecha=`; sin
 * parámetro es hoy) para que la vista sea enlazable y "Actualizar" la
 * conserve. Los días vecinos llegan calculados del servidor.
 */
export function DayPicker({ selected, previous, next, today }: DayPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(selected);

  function onChange(day: string) {
    // Un calendario vaciado o un valor fuera de formato (p. ej. año de cinco
    // dígitos) no es un día: se ignora y se conserva el actual.
    if (!isValidDay(day)) return;
    startTransition(() => {
      setValue(day);
      router.push(hrefFor(pathname, day, today));
    });
  }

  return (
    <div
      role="group"
      aria-label="Día de entrega"
      aria-busy={pending}
      className={`flex flex-wrap items-end gap-2 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}
    >
      <Link href={hrefFor(pathname, previous, today)} className={BUTTON} aria-label="Día anterior">
        <Chevron direction="left" />
        Anterior
      </Link>
      <div className="flex flex-col gap-1">
        <label htmlFor="production-day" className="text-xs text-admin-ink-muted">
          Fecha de entrega
        </label>
        <input
          id="production-day"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-base font-medium sm:text-sm text-admin-ink transition-colors duration-150 hover:border-admin-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        />
      </div>
      <Link href={hrefFor(pathname, next, today)} className={BUTTON} aria-label="Día siguiente">
        Siguiente
        <Chevron direction="right" />
      </Link>
      <Link
        href={pathname}
        aria-current={selected === today ? "date" : undefined}
        className={`${BUTTON} ${selected === today ? "border-admin-accent text-admin-ink" : ""}`}
      >
        Hoy
      </Link>
      <span role="status" className="sr-only">
        {pending ? "Cargando día…" : ""}
      </span>
    </div>
  );
}
