"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { withParam } from "@/lib/domain/orderSearch";
import { MONTH_NAMES, type PeriodSelection, type YearMonth } from "@/lib/domain/period";

const LABEL = "text-xs text-admin-ink-muted";
const SELECT =
  "rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent";

interface PeriodFilterProps {
  selected: PeriodSelection;
  /** Mes en curso en Bogotá: tope de lo seleccionable. */
  current: YearMonth;
  minYear: number;
  /**
   * Término de búsqueda activo de la pantalla (solo Pedidos lo pasa). Cambiar el
   * periodo lo conserva y "Limpiar filtros" lo quita junto con el periodo.
   * Sin esta prop el componente se comporta como siempre.
   */
  search?: string | null;
  /** Estado activo (solo Pedidos): se conserva igual que la búsqueda y "Limpiar filtros" lo quita. */
  estado?: string | null;
}

function toUrl(pathname: string, selection: PeriodSelection): string {
  switch (selection.kind) {
    case "all":
      return pathname;
    case "year":
      return `${pathname}?anio=${selection.year}`;
    case "month":
      return `${pathname}?mes=${selection.month}&anio=${selection.year}`;
  }
}

/**
 * Mes y año de la pantalla. El estado vive en la URL (`?mes=&anio=`; sin
 * parámetros es todo el tiempo) para que la vista sea enlazable y
 * "Actualizar" conserve la selección; cambiar un control navega dentro de una
 * transición y el valor elegido se muestra de inmediato (optimista) hasta que
 * el servidor responde. "Limpiar filtros" siempre ocupa su sitio y se
 * deshabilita sin filtro activo, para que los selects no se desplacen.
 */
export function PeriodFilter({ selected, current, minYear, search, estado }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(selected);

  const year = value.kind === "all" ? null : value.year;
  const month = value.kind === "month" ? value.month : null;

  const years: number[] = [];
  for (let y = current.year; y >= minYear; y--) years.push(y);

  const lastMonth = year === current.year ? current.month : 12;

  function go(next: PeriodSelection, keepSearch = true) {
    let url = toUrl(pathname, next);
    if (keepSearch && search) url = withParam(url, "q", search);
    if (keepSearch && estado) url = withParam(url, "estado", estado);
    startTransition(() => {
      setValue(next);
      router.push(url);
    });
  }

  function onMonthChange(raw: string) {
    if (raw === "") {
      go(year === null ? { kind: "all" } : { kind: "year", year });
      return;
    }
    // Con "Todos los años", elegir un mes lo ancla al año en curso.
    const y = year ?? current.year;
    const m = y === current.year ? Math.min(Number(raw), current.month) : Number(raw);
    go({ kind: "month", year: y, month: m });
  }

  function onYearChange(raw: string) {
    if (raw === "") {
      go({ kind: "all" });
      return;
    }
    const y = Number(raw);
    if (month === null) {
      go({ kind: "year", year: y });
      return;
    }
    // Al pasar al año en curso, un mes posterior al actual no existe aún.
    go({ kind: "month", year: y, month: y === current.year ? Math.min(month, current.month) : month });
  }

  return (
    <div
      role="group"
      aria-label="Periodo"
      aria-busy={pending}
      className={`flex flex-wrap items-end gap-2 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="period-month" className={LABEL}>
          Mes
        </label>
        <select
          id="period-month"
          value={month ?? ""}
          onChange={(e) => onMonthChange(e.target.value)}
          className={SELECT}
        >
          <option value="">Todos los meses</option>
          {MONTH_NAMES.slice(0, lastMonth).map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="period-year" className={LABEL}>
          Año
        </label>
        <select
          id="period-year"
          value={year ?? ""}
          onChange={(e) => onYearChange(e.target.value)}
          className={SELECT}
        >
          <option value="">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => go({ kind: "all" }, false)}
        disabled={value.kind === "all" && !search && !estado}
        className="rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
      >
        Limpiar filtros
      </button>
      <span role="status" className="sr-only">
        {pending ? "Cargando periodo…" : ""}
      </span>
    </div>
  );
}
