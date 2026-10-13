import type { Metadata } from "next";
import Link from "next/link";
import { getEarliestOrderYear, getOrders } from "@/lib/data/orders";
import { normalizeSearchTerm } from "@/lib/domain/orderSearch";
import { ORDER_STATE_LABELS, parseEstadoParam } from "@/lib/domain/orderState";
import { bogotaYearMonth, parsePeriodParams, periodLabel, periodRange } from "@/lib/domain/period";
import { PeriodFilter } from "../PeriodFilter";
import { RefreshButton } from "../RefreshButton";
import { EstadoFilter } from "./EstadoFilter";
import { OrderList } from "./OrderList";
import { OrderSearch } from "./OrderSearch";
import { buildOrderView, capRows } from "./orderView";

export const metadata: Metadata = { title: "Pedidos — Panel Nacer Group" };
// Lee `orders` en vivo en cada request — un panel operativo no debe servir
// un snapshot de build. Ver la misma nota en productos/page.tsx.
export const dynamic = "force-dynamic";

// Tope de filas mostradas. Se pide una más para saber si la lista está completa.
const ORDER_CAP = 50;

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const selected = parsePeriodParams(params, now);
  const q = normalizeSearchTerm(params.q);
  const estado = parseEstadoParam(params.estado);
  const [fetched, earliestYear] = await Promise.all([
    getOrders(periodRange(selected), ORDER_CAP + 1, q, estado),
    getEarliestOrderYear(),
  ]);
  const { shown, hasMore } = capRows(fetched, ORDER_CAP);
  const views = shown.map(buildOrderView);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Pedidos</h1>
          <p className="text-sm text-admin-ink-muted">{periodLabel(selected)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <OrderSearch q={q} />
          <EstadoFilter estado={estado} />
          <PeriodFilter
            search={q}
            estado={estado}
            selected={selected}
            current={bogotaYearMonth(now)}
            minYear={selected.kind === "all" ? earliestYear : Math.min(earliestYear, selected.year)}
          />
          <RefreshButton />
          <Link
            href="/admin/pedidos/nuevo"
            className="flex items-center gap-1.5 rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo pedido
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface-raised shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]">
        {views.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-admin-ink-muted">
            {q || estado
              ? `Ningún pedido${estado ? ` en estado "${ORDER_STATE_LABELS[estado]}"` : ""}${q ? ` coincide con "${q}"` : ""}${selected.kind === "all" ? "" : ` en ${periodLabel(selected)}`}.`
              : "Sin pedidos en el periodo."}
          </p>
        ) : (
          <OrderList views={views} />
        )}
      </div>
      {hasMore ? (
        <p className="text-xs text-admin-ink-muted">
          Se muestran los {ORDER_CAP} pedidos más recientes. Filtra por mes o año para ver el resto.
        </p>
      ) : null}
    </div>
  );
}
