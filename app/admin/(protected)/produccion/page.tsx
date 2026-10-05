import type { Metadata } from "next";
import { currentMonthPeriodBogota, getOrders } from "@/lib/data/orders";
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_PILL_CLASS,
  FULFILLMENT_PILL_CLASS_UNSET,
} from "@/lib/domain/fulfillmentStatus";
import { RefreshButton } from "../RefreshButton";
import { SupplierInput } from "./SupplierInput";

export const metadata: Metadata = { title: "Producción — Panel Nacer Group" };
export const dynamic = "force-dynamic";

// Lo que ya está entregado o perdido no necesita más trabajo manual — se
// ordena al final, no se oculta (la artesana puede querer revisarlo igual).
const PENDING_FIRST: Record<string, number> = {
  en_construccion: 0,
  en_despacho: 1,
  entregado: 2,
  perdido: 2,
};

export default async function ProduccionPage() {
  const period = currentMonthPeriodBogota();
  const orders = await getOrders(period);

  const sorted = [...orders].sort((a, b) => {
    const rankA = a.fulfillment_status ? PENDING_FIRST[a.fulfillment_status] : -1;
    const rankB = b.fulfillment_status ? PENDING_FIRST[b.fulfillment_status] : -1;
    return rankA - rankB;
  });

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Producción</h1>
          <p className="text-sm text-admin-ink-muted">
            Pedidos del mes para armar — De, Para, producto y proveedor.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((order) => {
          const waitingForCustomer = !order.saleDetails?.submitted_at;
          const pillClass = order.fulfillment_status
            ? FULFILLMENT_PILL_CLASS[order.fulfillment_status]
            : FULFILLMENT_PILL_CLASS_UNSET;
          const statusLabel = order.fulfillment_status
            ? FULFILLMENT_LABELS[order.fulfillment_status]
            : "Sin definir";

          return (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-admin-mono text-sm font-semibold text-admin-ink">
                  {order.human_number}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pillClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <p className="text-sm font-medium text-admin-ink">{order.productSummary}</p>

              {waitingForCustomer ? (
                <p className="rounded-lg bg-admin-warning-bg px-2.5 py-1.5 text-xs text-admin-warning-fg">
                  Esperando datos del cliente — todavía no hay De/Para.
                </p>
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
                  <dt className="text-admin-ink-muted">De:</dt>
                  <dd>{order.saleDetails?.card_from || "—"}</dd>
                  <dt className="text-admin-ink-muted">Para:</dt>
                  <dd>{order.saleDetails?.card_to || "—"}</dd>
                </dl>
              )}

              <div className="mt-auto flex flex-col gap-1">
                <label className="text-xs text-admin-ink-muted">Proveedor</label>
                <SupplierInput orderId={order.id} supplierName={order.supplier_name} />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 ? (
          <p className="col-span-full py-6 text-center text-sm text-admin-ink-muted">
            Sin pedidos pagados en el periodo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
