import { ORDER_STATE_LABELS, ORDER_STATE_PILL_CLASS } from "@/lib/domain/orderState";
import { OrderPanel } from "./OrderPanel";
import type { OrderView } from "./orderView";

/** Mismas pistas en la cabecera y en cada fila: los valores alinean en vertical. */
export const ROW_GRID = "grid grid-cols-1 md:grid-cols-[11rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem_11rem] md:gap-x-4";

/**
 * Una fila colapsable. El estado es de solo lectura: un pedido avanza por
 * proceso desde Producción y Despachos, no desde la lista.
 */
export function OrderRow({
  view,
  open,
  onToggle,
}: {
  view: OrderView;
  open: boolean;
  onToggle: () => void;
}) {
  const { row } = view;
  const panelId = `order-panel-${view.id}`;

  return (
    <li className="border-b border-admin-border transition-[background-color] duration-150 last:border-0 hover:bg-admin-surface-sunken">
      <div className={`${ROW_GRID} items-center px-4`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-11 min-w-0 flex-col gap-1 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-admin-accent md:col-span-4 md:grid md:grid-cols-subgrid md:items-center md:gap-y-0"
        >
          <span className="flex min-w-0 items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className={`h-4 w-4 shrink-0 text-admin-ink-muted motion-safe:transition-transform motion-safe:duration-150 ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span className="font-admin-mono text-sm font-semibold text-admin-ink">{row.humanNumber}</span>
                {row.channelMarker ? (
                  <span className="rounded-full bg-admin-surface-sunken px-2 py-px text-[0.6875rem] font-semibold text-admin-ink-secondary">
                    {row.channelMarker}
                  </span>
                ) : null}
              </span>
              <span className="truncate text-xs text-admin-ink-secondary">{row.buyerLabel}</span>
            </span>
          </span>
          <span className="min-w-0 truncate text-sm text-admin-ink-secondary">
            <span className="text-xs text-admin-ink-muted md:sr-only">Vendedor </span>
            {row.seller}
          </span>
          <span className="text-sm text-admin-ink-secondary">
            <span className="text-xs text-admin-ink-muted md:sr-only">Factura </span>
            {row.invoice}
          </span>
          <span className="flex flex-col">
            <span className="font-admin-mono text-sm text-admin-ink-secondary">
              <span className="font-sans text-xs text-admin-ink-muted md:sr-only">Creado </span>
              {row.createdDate}
            </span>
            <span className="text-xs text-admin-ink-muted">
              <span className="sr-only">Valor a pagar </span>
              {row.amount}
            </span>
          </span>
        </button>
        <div className="pb-3 pl-6 md:py-2 md:pl-0">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATE_PILL_CLASS[row.state]}`}
          >
            {ORDER_STATE_LABELS[row.state]}
          </span>
        </div>
      </div>
      <div id={panelId} hidden={!open} className="opacity-100 transition-[opacity] duration-150 ease-out starting:opacity-0">
        <OrderPanel
          orderId={view.id}
          groups={view.groups}
          openHref={view.openHref}
        />
      </div>
    </li>
  );
}
