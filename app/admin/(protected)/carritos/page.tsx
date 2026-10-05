import type { Metadata } from "next";
import { getFunnelCounts, getIncompleteOrders } from "@/lib/data/carts";
import { currentMonthPeriodBogota } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_PILL_CLASS } from "@/lib/domain/orderStatus";
import { RefreshButton } from "../RefreshButton";

export const metadata: Metadata = { title: "Carritos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CarritosPage() {
  const period = currentMonthPeriodBogota();
  const [orders, funnel] = await Promise.all([
    getIncompleteOrders(period),
    getFunnelCounts(period),
  ]);

  const tiles = [
    { label: "Abiertos", value: funnel.abierto, hint: "intentos de compra en curso" },
    { label: "Vencidos", value: funnel.vencido, hint: "la reserva expiró sin pagar" },
    { label: "Cancelados", value: funnel.cancelado, hint: "el cliente canceló" },
  ];

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Carritos</h1>
          <p className="text-sm text-admin-ink-muted">
            Pedidos iniciados este mes que no llegaron a pagarse — hora de Bogotá.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]"
          >
            <p className="mb-1.5 text-[11.5px] uppercase tracking-wide text-admin-ink-muted">
              {tile.label}
            </p>
            <p className="font-admin-mono text-2xl font-bold tracking-tight text-admin-ink">
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-admin-ink-muted">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden overflow-x-auto rounded-xl border border-admin-border bg-admin-surface-raised shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-admin-border text-left text-[10.5px] uppercase tracking-wide text-admin-ink-muted">
              <th className="px-3 py-2.5 font-semibold">Pedido</th>
              <th className="px-3 py-2.5 font-semibold">Estado</th>
              <th className="px-3 py-2.5 font-semibold">Iniciado</th>
              <th className="px-3 py-2.5 font-semibold">Última actividad</th>
              <th className="px-3 py-2.5 font-semibold">Producto(s) intentado(s)</th>
              <th className="px-3 py-2.5 font-semibold">Valor estimado</th>
              <th className="px-3 py-2.5 font-semibold">Chat</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-admin-border transition-colors duration-200 last:border-0 hover:bg-admin-surface-sunken"
              >
                <td className="px-3 py-2.5 font-admin-mono text-xs font-semibold text-admin-ink">
                  {order.human_number}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ORDER_STATUS_PILL_CLASS[order.status] ?? "bg-admin-surface-sunken text-admin-ink-muted"}`}
                  >
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  {order.reservationsAllExpired ? (
                    <span
                      className="ml-1.5 text-[10.5px] text-admin-ink-muted"
                      title="Sigue marcado 'abierto' pero ninguna reserva sigue vigente — expire_reservations() no corre sola en la base."
                    >
                      (vencido, sin barrer)
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 font-admin-mono text-xs text-admin-ink-secondary">
                  {formatDateTime(order.created_at)}
                </td>
                <td className="px-3 py-2.5 font-admin-mono text-xs text-admin-ink-secondary">
                  {formatDateTime(order.updated_at)}
                </td>
                <td className="px-3 py-2.5 text-admin-ink-secondary">
                  <span className="whitespace-nowrap">{order.productSummary}</span>
                </td>
                <td className="px-3 py-2.5 font-admin-mono text-admin-ink">
                  {formatCop(order.grand_total)}
                </td>
                <td className="px-3 py-2.5 font-admin-mono text-xs text-admin-ink-muted">
                  {order.chat_id}
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-admin-ink-muted">
                  Sin carritos incompletos en el periodo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
