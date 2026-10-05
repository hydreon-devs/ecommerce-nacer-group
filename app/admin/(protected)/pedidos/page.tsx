import type { Metadata } from "next";
import Link from "next/link";
import { currentMonthPeriodBogota, getOrders } from "@/lib/data/orders";
import { RefreshButton } from "../RefreshButton";
import { ORDER_COLUMNS } from "./columns";

export const metadata: Metadata = { title: "Pedidos — Panel Nacer Group" };
// Lee `orders` en vivo en cada request — un panel operativo no debe servir
// un snapshot de build. Ver la misma nota en productos/page.tsx.
export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const period = currentMonthPeriodBogota();
  const orders = await getOrders(period);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Pedidos</h1>
          <p className="text-sm text-admin-ink-muted">Mes en curso, hora de Bogotá</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <Link
            href="/admin/estadisticas"
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
              <path d="M3 3v18h18M7 15l4-5 3 3 5-7" />
            </svg>
            Ver estadísticas
          </Link>
        </div>
      </div>

      <div className="overflow-hidden overflow-x-auto rounded-xl border border-admin-border bg-admin-surface-raised shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-admin-border text-left text-[10.5px] uppercase tracking-wide text-admin-ink-muted">
              {ORDER_COLUMNS.map((col) => (
                <th key={col.header || "acciones"} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-admin-border transition-colors duration-200 last:border-0 hover:bg-admin-surface-sunken"
              >
                {ORDER_COLUMNS.map((col) => (
                  <td
                    key={col.header || "acciones"}
                    className={`px-3 py-2.5 text-admin-ink-secondary ${col.mono ? "font-admin-mono" : ""}`}
                  >
                    {col.cell(order)}
                  </td>
                ))}
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={ORDER_COLUMNS.length}
                  className="px-4 py-6 text-center text-sm text-admin-ink-muted"
                >
                  Sin pedidos pagados en el periodo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
