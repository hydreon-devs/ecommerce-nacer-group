import type { Metadata } from "next";
import { CART_CAP, getCartColumns, type CartRow } from "@/lib/data/carts";
import { getEarliestOrderYear } from "@/lib/data/orders";
import { formatDateTimeBogota } from "@/lib/format";
import { ORDER_STATE_LABELS, ORDER_STATE_PILL_CLASS } from "@/lib/domain/orderState";
import {
  bogotaYearMonth,
  periodLabel,
  periodRange,
  resolvePeriodSelection,
  type PeriodSelection,
} from "@/lib/domain/period";
import { PeriodFilter } from "../PeriodFilter";
import { RefreshButton } from "../RefreshButton";

export const metadata: Metadata = { title: "Carritos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const COLUMNS = [
  {
    key: "abiertos",
    title: "Abiertos",
    hint: "Vigentes ahora, sin importar el periodo",
    empty: "No hay pedidos abiertos con reserva vigente.",
  },
  {
    key: "vencidos",
    title: "Vencidos",
    hint: "Reserva vencida sin pagar, del periodo",
    empty: "Sin pedidos vencidos en el periodo.",
  },
  {
    key: "cancelados",
    title: "Cancelados",
    hint: "Cancelados por el cliente, del periodo",
    empty: "Sin pedidos cancelados en el periodo.",
  },
] as const;

function CartItem({ row }: { row: CartRow }) {
  return (
    <li className="flex flex-col gap-2 border-b border-admin-border px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-admin-mono text-xs font-semibold text-admin-ink">{row.human_number}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ORDER_STATE_PILL_CLASS[row.state]}`}
        >
          {ORDER_STATE_LABELS[row.state]}
        </span>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div>
          <dt className="text-admin-ink-muted">Última actividad</dt>
          <dd className="whitespace-nowrap font-admin-mono text-admin-ink-secondary">
            <time dateTime={row.updated_at}>{formatDateTimeBogota(row.updated_at)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-admin-ink-muted">Iniciado</dt>
          <dd className="whitespace-nowrap font-admin-mono text-admin-ink-secondary">
            <time dateTime={row.created_at}>{formatDateTimeBogota(row.created_at)}</time>
          </dd>
        </div>
      </dl>
    </li>
  );
}

export default async function CarritosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const current = bogotaYearMonth(now);
  // Sin parámetros el panel abre en el mes en curso (Pedidos abre en todo el tiempo).
  const defaultSelection: PeriodSelection = { kind: "month", ...current };
  const selected = resolvePeriodSelection(params, now, defaultSelection);

  const [{ columns, truncated }, earliestYear] = await Promise.all([
    getCartColumns(periodRange(selected), now),
    getEarliestOrderYear(),
  ]);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Carritos</h1>
          <p className="text-sm text-admin-ink-muted">
            Pedidos iniciados que no llegaron a pagarse, en hora de Bogotá. Abiertos muestra lo vigente
            ahora, sin importar el periodo; Vencidos y Cancelados siguen el periodo elegido (
            {periodLabel(selected)}).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodFilter
            selected={selected}
            defaultSelection={defaultSelection}
            current={current}
            minYear={selected.kind === "all" ? earliestYear : Math.min(earliestYear, selected.year)}
          />
          <RefreshButton />
        </div>
      </div>

      {truncated ? (
        <p role="status" className="text-xs text-admin-ink-muted">
          Se alcanzó el tope de {CART_CAP} pedidos por consulta: se muestran los más recientes y los
          conteos pueden quedar cortos. Filtra por mes o año para ver el resto.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const rows = columns[col.key];
          const headingId = `carritos-${col.key}`;
          return (
            <section
              key={col.key}
              aria-labelledby={headingId}
              className="min-w-0 overflow-hidden rounded-xl border border-admin-border bg-admin-surface-raised shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]"
            >
              <header className="border-b border-admin-border px-4 py-3">
                <h2 id={headingId} className="text-sm font-semibold text-admin-ink">
                  {col.title} <span className="font-admin-mono">({rows.length})</span>
                </h2>
                <p className="text-xs text-admin-ink-muted">{col.hint}</p>
              </header>
              {rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-admin-ink-muted">{col.empty}</p>
              ) : (
                <ul aria-labelledby={headingId}>
                  {rows.map((row) => (
                    <CartItem key={row.id} row={row} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
