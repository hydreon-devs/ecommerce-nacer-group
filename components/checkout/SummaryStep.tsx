"use client";

import { useEffect, useRef, useState } from "react";
import { describeOrderLines, type NamedCartLine } from "@/lib/domain/checkout/orderLines";
import type { DeliveryStep } from "@/lib/domain/checkout/deliveryStep";
import { formatDeliveryDate, formatExpiryBogota, minutesUntil, type WebOrder } from "@/lib/domain/checkout/webOrderResult";
import { formatCop } from "@/lib/format";
import { PRIMARY, SECONDARY } from "./formStyles";

interface Props {
  order: WebOrder;
  cartLines: readonly NamedCartLine[];
  delivery: DeliveryStep;
  recipientName: string;
  busy: boolean;
  onEditDelivery: () => void;
  onEditDetails: () => void;
  /** Reserve again after the hold ended. */
  onReserveAgain: () => void;
}

/** Re-renders every 30 s so the remaining time stays honest. Null on the server. */
function useNow(intervalMs: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Checkout step 3 (Resumen). READ-ONLY and rendered from the SERVER's answer:
 * order number, lines with unit and total prices, subtotal, delivery fee and
 * grand total are exactly what `create_web_order` priced and reserved. Nothing
 * here is computed from the cart. Payment arrives with slice 5.
 */
export function SummaryStep({
  order,
  cartLines,
  delivery,
  recipientName,
  busy,
  onEditDelivery,
  onEditDetails,
  onReserveAgain,
}: Props) {
  const now = useNow(30_000);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const lines = describeOrderLines(order.lines, cartLines);
  const until = formatExpiryBogota(order.expiresAt);
  const remaining = now ? minutesUntil(order.expiresAt, now) : null;
  const expired = remaining === 0;

  const pickup = delivery.method === "tienda";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10">
      <div className="space-y-6">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.16em] text-moss">Paso 3 · Resumen</p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-2xl text-ink outline-none md:text-3xl">
            Tu pedido {order.humanNumber}
          </h2>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-4 font-body text-sm ${
            expired ? "border-danger/40 bg-danger/5 text-ink" : "border-moss/40 bg-moss/8 text-ink"
          }`}
        >
          {expired ? (
            <>
              <p>El tiempo de tu reserva terminó. Podemos reservar tus productos de nuevo.</p>
              <button type="button" onClick={onReserveAgain} disabled={busy} aria-busy={busy} className={`${PRIMARY} mt-3`}>
                {busy ? "Reservando…" : "Reservar de nuevo"}
              </button>
            </>
          ) : (
            <p>
              Separamos tus productos hasta las <strong className="font-medium">{until}</strong>
              {remaining !== null && remaining > 0 ? ` (faltan ${remaining} min)` : ""}.
            </p>
          )}
        </div>

        <section aria-labelledby="summary-lines">
          <h3 id="summary-lines" className="font-display text-xl text-ink">
            Lo que llevas
          </h3>
          <ul className="mt-2 divide-y divide-ink/10">
            {lines.map(({ name, label, line }, index) => (
              <li key={`${line.variantSku}-${index}`} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-body text-sm text-ink">{name}</p>
                  <p className="font-body text-xs text-ink-muted">
                    {label ? `${label} · ` : ""}
                    {line.qty} × {formatCop(line.unitPrice)}
                  </p>
                  {line.options.map((o) => (
                    <p key={o.name} className="font-body text-xs text-ink-muted">
                      + {o.name} × {o.qty} ({formatCop(o.unitPrice)} c/u)
                    </p>
                  ))}
                </div>
                <span className="font-body text-sm tabular-nums text-ink">{formatCop(line.totalPrice)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="summary-delivery" className="rounded-2xl border border-ink/10 bg-cream-soft p-4 sm:p-5">
          <h3 id="summary-delivery" className="font-display text-xl text-ink">
            {pickup ? "Recogida" : "Entrega"}
          </h3>
          <dl className="mt-2 space-y-2 font-body text-sm">
            <div>
              <dt className="text-ink-muted">Método</dt>
              <dd className="text-ink">{pickup ? "Recoger en el taller" : "Domicilio"}</dd>
            </div>
            {delivery.method === "domicilio" && (
              <div>
                <dt className="text-ink-muted">Dirección</dt>
                <dd className="text-ink">
                  {delivery.resolvedAddress}
                  <span className="block text-ink-muted">
                    {delivery.neighborhood}
                    {delivery.unit ? ` · ${delivery.unit}` : ""}
                    {delivery.building ? ` · ${delivery.building}` : ""}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-ink-muted">{pickup ? "Quién recoge" : "Quién recibe"}</dt>
              <dd className="text-ink">{recipientName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Fecha</dt>
              <dd className="text-ink">{formatDeliveryDate(delivery.date)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={SECONDARY} onClick={onEditDelivery} disabled={busy}>
              Cambiar la entrega
            </button>
            <button type="button" className={SECONDARY} onClick={onEditDetails} disabled={busy}>
              Cambiar mis datos
            </button>
          </div>
        </section>
      </div>

      <aside
        aria-labelledby="summary-total-title"
        className="rounded-2xl border border-ink/10 bg-cream-soft p-5 lg:sticky lg:top-28"
      >
        <h3 id="summary-total-title" className="font-display text-xl text-ink">
          Total a pagar
        </h3>
        <dl className="mt-3 space-y-2 font-body text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{formatCop(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">{pickup ? "Recogida" : "Domicilio"}</dt>
            <dd className="tabular-nums text-ink">
              {order.deliveryFee === 0 ? "Sin costo" : formatCop(order.deliveryFee)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
            <dt className="text-ink">Total</dt>
            <dd className="font-display text-2xl tabular-nums text-ink">{formatCop(order.grandTotal)}</dd>
          </div>
        </dl>
        {/* TODO(slice 5): create the Mercado Pago preference and enable this button.
            Do not clear the cart here; that happens after payment (slice 6). */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-describedby="pay-hint"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-moss px-8 font-body text-base font-medium text-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pagar con Mercado Pago
        </button>
        <p id="pay-hint" className="mt-2 font-body text-xs text-ink-muted">
          Muy pronto podrás pagar aquí con tarjeta o PSE. Tu pedido queda separado mientras tanto.
        </p>
      </aside>
    </div>
  );
}
