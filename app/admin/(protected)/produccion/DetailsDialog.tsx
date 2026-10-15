"use client";

import { useState } from "react";
import { ORDER_STATE_LABELS, ORDER_STATE_PILL_CLASS } from "@/lib/domain/orderState";
import { AdvanceOrderButton } from "../AdvanceOrderButton";
import { Dialog } from "../ui/Dialog";
import { secondaryButtonClass } from "../ui/formClasses";
import { ProductThumbnail } from "../productos/ProductThumbnail";
import { OrderNameInput } from "./OrderNameInput";
import type { ProductionDetailView } from "./productionView";

const DASH = "—";

// Producto | cantidad | crisálidas: las mismas columnas en filas, encabezado y totales.
const LINE_GRID = "grid grid-cols-[4rem_minmax(0,1fr)_3.5rem_4.5rem] items-center gap-x-3";

/**
 * "Ver detalles": diálogo centrado con el desglose completo de un pedido, sin
 * cambiar de página ni de día. Usa `Dialog` (modal nativo: foco atrapado,
 * Escape y clic en el fondo cierran, el foco vuelve al botón).
 */
export function DetailsDialog({
  orderId,
  detail,
  advanceLabel,
}: {
  orderId: string;
  detail: ProductionDetailView;
  /** Texto del siguiente paso ("Marcar preparado"); `null` si el pedido ya no lo admite. */
  advanceLabel: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
        Ver detalles
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={detail.humanNumber}
        titleClassName="font-admin-mono text-base font-semibold text-admin-ink"
        badge={
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATE_PILL_CLASS[detail.state]}`}
          >
            {ORDER_STATE_LABELS[detail.state]}
          </span>
        }
        bodyClassName="gap-6"
        footer={advanceLabel ? <AdvanceOrderButton orderId={orderId} label={advanceLabel} /> : undefined}
      >
        <section aria-labelledby={`delivery-${orderId}`} className="flex flex-col gap-2">
          <h3 id={`delivery-${orderId}`} className={SECTION_TITLE}>
            Entrega
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Fecha de entrega" value={detail.deliveryDate} mono />
            <Field label="Ocasión" value={detail.occasion} />
            <Field label="Tipo de envío" value={detail.deliveryMethod} />
            <Field label="Ciudad y barrio" value={detail.place} />
          </dl>
        </section>

        <section aria-labelledby={`lines-${orderId}`} className="flex flex-col gap-2">
          <h3 id={`lines-${orderId}`} className={SECTION_TITLE}>
            Productos
          </h3>
          {detail.lines.length === 0 ? (
            <p className="text-sm text-admin-ink-muted">Sin líneas de producto.</p>
          ) : (
            <div className="flex flex-col text-sm">
              <div
                aria-hidden="true"
                className={`${LINE_GRID} pb-1 text-xs font-semibold uppercase tracking-wide text-admin-ink-muted`}
              >
                <span className="col-span-2">Producto</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Crisálidas</span>
              </div>
              <ul className="flex flex-col divide-y divide-admin-border border-y border-admin-border">
                {detail.lines.map((line, i) => (
                  <li key={`${line.sku}-${i}`} className={`${LINE_GRID} py-2`}>
                    <span className="relative block h-16 w-16 overflow-hidden rounded-lg bg-admin-surface-sunken">
                      <ProductThumbnail url={line.imageUrl} alt={line.productName} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium text-admin-ink">{line.productName}</span>
                      {line.variant ? (
                        <span className="text-xs text-admin-ink-secondary">{line.variant}</span>
                      ) : null}
                      {line.extras.length > 0 ? (
                        <span className="text-xs text-admin-ink-muted">+ {line.extras.join(", ")}</span>
                      ) : null}
                    </span>
                    <span className="text-right font-admin-mono text-admin-ink-secondary">
                      <span className="sr-only">Cantidad: </span>
                      {line.qty}
                    </span>
                    <span className="text-right font-admin-mono text-admin-ink-secondary">
                      <span className="sr-only">Crisálidas: </span>
                      {line.chrysalisLabel}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={`${LINE_GRID} pt-2 font-semibold text-admin-ink`}>
                <span className="col-span-2">Total</span>
                <span className="text-right font-admin-mono">{detail.totalQty}</span>
                <span className="text-right font-admin-mono">{detail.chrysalisLabel}</span>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby={`card-${orderId}`} className="flex flex-col gap-2">
          <h3 id={`card-${orderId}`} className={SECTION_TITLE}>
            Tarjeta
          </h3>
          {detail.card ? (
            <dl className="flex flex-col gap-2 text-sm">
              <Field label="De" value={detail.card.from} />
              <Field label="Para" value={detail.card.to} />
              <Field label="Mensaje" value={detail.card.message} />
            </dl>
          ) : (
            <p className="rounded-lg bg-admin-warning-bg px-2.5 py-1.5 text-xs text-admin-warning-fg">
              Esperando datos del cliente — todavía no hay De/Para.
            </p>
          )}
        </section>

        <section aria-labelledby={`obs-${orderId}`} className="flex flex-col gap-2">
          <h3 id={`obs-${orderId}`} className={SECTION_TITLE}>
            Observación especial
          </h3>
          <p
            className={`whitespace-pre-wrap break-words text-sm ${
              detail.observation === DASH ? "text-admin-ink-muted" : "text-admin-ink-secondary"
            }`}
          >
            {detail.observation}
          </p>
        </section>

        <section aria-labelledby={`team-${orderId}`} className="flex flex-col gap-3">
          <h3 id={`team-${orderId}`} className={SECTION_TITLE}>
            Equipo
          </h3>
          <dl className="text-sm">
            <Field label="Asesor" value={detail.advisor} />
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`supplier-${orderId}`} className="text-xs text-admin-ink-muted">
                Proveedor
              </label>
              <OrderNameInput
                id={`supplier-${orderId}`}
                field="supplier"
                orderId={orderId}
                value={detail.supplierName}
                placeholder="¿Quién provee las mariposas?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`artisan-${orderId}`} className="text-xs text-admin-ink-muted">
                Artesano
              </label>
              <OrderNameInput
                id={`artisan-${orderId}`}
                field="artisan"
                orderId={orderId}
                value={detail.artisanName}
                placeholder="¿Quién lo arma?"
              />
            </div>
          </div>
        </section>
      </Dialog>
    </>
  );
}

const SECTION_TITLE = "text-xs font-semibold uppercase tracking-wide text-admin-ink-muted";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-admin-ink-muted">{label}</dt>
      <dd
        className={`whitespace-pre-wrap break-words ${
          value === DASH ? "text-admin-ink-muted" : "text-admin-ink-secondary"
        } ${mono ? "font-admin-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
