"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { withParam } from "@/lib/domain/orderSearch";
import type { DispatchFilter } from "@/lib/domain/dispatch";

const OPTIONS: { value: DispatchFilter; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "atrasados", label: "Atrasados" },
  { value: "proximos", label: "Próximos" },
  { value: "todos", label: "Todos" },
];

/**
 * Filtro de "Listos para despacho" en cuatro posiciones, con su conteo. Vive en
 * la URL (`?listos=`); la posición elegida se muestra de inmediato (optimista)
 * hasta que el servidor responde. `hoy` es el valor por defecto y no se escribe.
 */
export function ReadyFilter({
  filter,
  counts,
}: {
  filter: DispatchFilter;
  counts: Record<DispatchFilter, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(filter);

  return (
    <div
      role="group"
      aria-label="Filtrar listos para despacho"
      className={`inline-flex flex-wrap gap-1 rounded-lg bg-admin-surface-sunken p-1 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}
    >
      {OPTIONS.map(({ value: option, label }) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              startTransition(() => {
                setValue(option);
                router.push(
                  withParam(
                    `${pathname}${window.location.search}`,
                    "listos",
                    option === "hoy" ? "" : option,
                  ),
                );
              })
            }
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent ${
              selected
                ? "bg-admin-surface-raised text-admin-ink shadow-sm"
                : "text-admin-ink-secondary hover:text-admin-ink"
            }`}
          >
            {label}
            <span className="font-admin-mono text-xs text-admin-ink-muted">{counts[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
