import type { Metadata } from "next";
import Link from "next/link";
import { currentMonthPeriodBogota, getOrderCounts, getOrders } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";
import { FulfillmentStatusSelect } from "./FulfillmentStatusSelect";

export const metadata: Metadata = { title: "Pedidos — Panel Nacer Group" };
// Lee `orders` en vivo en cada request — un panel operativo no debe servir
// un snapshot de build. Ver la misma nota en productos/page.tsx.
export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const period = currentMonthPeriodBogota();
  const [counts, orders] = await Promise.all([getOrderCounts(period), getOrders(period)]);

  const tiles = [
    { label: "Vendidos", value: counts.vendidos },
    { label: "En construcción", value: counts.enConstruccion },
    { label: "En despacho", value: counts.enDespacho },
    { label: "Entregados", value: counts.entregados },
    { label: "Perdidos", value: counts.perdidos },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500">Mes en curso, hora de Bogotá</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2">Pedido</th>
              <th className="px-4 py-2">Pagado</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Entrega</th>
              <th className="px-4 py-2">Cumplimiento</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {order.id.slice(0, 8)}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {order.confirmed_at
                    ? new Date(order.confirmed_at).toLocaleDateString("es-CO")
                    : "—"}
                </td>
                <td className="px-4 py-2 text-slate-900">{formatCop(order.grand_total)}</td>
                <td className="px-4 py-2 text-slate-700">{order.delivery_method ?? "—"}</td>
                <td className="px-4 py-2">
                  <FulfillmentStatusSelect orderId={order.id} value={order.fulfillment_status} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="text-xs text-slate-500 underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
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
