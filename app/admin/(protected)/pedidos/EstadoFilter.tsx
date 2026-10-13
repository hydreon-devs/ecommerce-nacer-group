"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { withParam } from "@/lib/domain/orderSearch";
import { ORDER_STATES, ORDER_STATE_LABELS, type OrderState } from "@/lib/domain/orderState";

/**
 * Filtro por Estado. Vive en la URL (`?estado=`) junto a `?q=` y el periodo; la
 * URL se lee al momento de navegar, así que conserva lo demás. El valor elegido
 * se muestra de inmediato (optimista) hasta que el servidor responde.
 */
export function EstadoFilter({ estado }: { estado: OrderState | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(estado);

  return (
    <div
      className={`flex flex-col gap-1 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}
    >
      <label htmlFor="order-estado" className="text-xs text-admin-ink-muted">
        Estado
      </label>
      <select
        id="order-estado"
        value={value ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            setValue((next as OrderState) || null);
            router.push(withParam(`${pathname}${window.location.search}`, "estado", next));
          });
        }}
        className="rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
      >
        <option value="">Todos los estados</option>
        {ORDER_STATES.map((state) => (
          <option key={state} value={state}>
            {ORDER_STATE_LABELS[state]}
          </option>
        ))}
      </select>
    </div>
  );
}
