import type { Metadata } from "next";
import { getProductionDay } from "@/lib/data/production";
import { ORDER_STATE_LABELS, ORDER_STATE_PILL_CLASS } from "@/lib/domain/orderState";
import { bogotaToday, parseDayParam, shiftDay } from "@/lib/domain/productionDay";
import { RefreshButton } from "../RefreshButton";
import { DayPicker } from "./DayPicker";
import { DetailsDialog } from "./DetailsDialog";
import { buildProductionDay, type ProductionRowView } from "./productionView";

export const metadata: Metadata = { title: "Producción — Panel Nacer Group" };
export const dynamic = "force-dynamic";

/** Un grupo del día, con el mismo encabezado y rejilla que las secciones de Despachos. */
function ProductionSection({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ProductionRowView[];
  empty: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-admin-ink">
        {title} <span className="font-admin-mono text-admin-ink-muted">({rows.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-transparent bg-admin-surface-raised p-4 shadow-admin-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-admin-mono text-sm font-semibold text-admin-ink">N° de pedido: {row.humanNumber}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATE_PILL_CLASS[row.state]}`}
              >
                {ORDER_STATE_LABELS[row.state]}
              </span>
            </div>

            <p className="text-sm text-admin-ink-secondary">
              {row.deliveryMethod} <span className="text-admin-ink-muted">· {row.productCount}</span>
            </p>

            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
              <dt className="text-admin-ink-muted">Asesor:</dt>
              <dd>{row.detail.advisor}</dd>
              <dt className="text-admin-ink-muted">Ciudad y barrio:</dt>
              <dd>{row.detail.place}</dd>
            </dl>

            <div className="mt-auto flex flex-wrap gap-2">
              <DetailsDialog
                orderId={row.id}
                detail={row.detail}
                advanceLabel={row.step?.to === "preparado" ? row.step.label : null}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-admin-ink-muted">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const day = parseDayParam(params.fecha, now);
  const view = buildProductionDay(await getProductionDay(day), day);
  // "Listos" es todo lo que ya salió de producción: preparado, en despacho, entregado o perdido.
  const building = view.rows.filter((row) => row.state === "en_construccion");
  const done = view.rows.filter((row) => row.state !== "en_construccion");

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Producción</h1>
          <p className="text-sm text-admin-ink-muted first-letter:uppercase">{view.dayLabel}</p>
          <p className="text-sm text-admin-ink-muted">
            {view.orderCount} {view.orderCount === 1 ? "pedido" : "pedidos"}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <DayPicker
            selected={day}
            previous={shiftDay(day, -1)}
            next={shiftDay(day, 1)}
            today={bogotaToday(now)}
          />
          <RefreshButton />
        </div>
      </div>

      <ProductionSection
        title="En construcción"
        rows={building}
        empty="No hay pedidos por armar para este día."
      />
      <ProductionSection
        title="Listos"
        rows={done}
        empty="Todavía no hay pedidos listos de este día."
      />
    </div>
  );
}
