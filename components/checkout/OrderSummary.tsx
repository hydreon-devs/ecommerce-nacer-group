"use client";

import { useState, type ReactNode } from "react";
import {
  cartItemCount,
  cartSubtotal,
  lineUnitPrice,
  type Cart,
} from "@/lib/domain/cart";
import type { LineAvailability } from "@/lib/domain/checkout/availability";
import { formatCop } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";

interface Props {
  cart: Cart;
  results: readonly LineAvailability[];
  /** Delivery fee when known: 0 for pickup, the quote for confirmed home delivery, else null. */
  deliveryFeeCop: number | null;
  deliveryLabel: string;
  /** The step's primary action (Continuar + hint), always on screen. */
  children: ReactNode;
}

/**
 * Order summary + the step's primary action. Below `lg` it is a bar fixed to
 * the bottom of the viewport (total, "Ver detalle" and the action, so the
 * customer never scrolls to find them); the detail expands upward inside the
 * bar. From `lg` it is a sticky side panel, always open. Every number here is
 * an ESTIMATE for display; the server re-prices at checkout (slice 4) and the
 * final total is confirmed at payment.
 */
export function OrderSummary({ cart, results, deliveryFeeCop, deliveryLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const resultByKey = new Map(results.map((r) => [r.key, r]));

  const unitPrice = (key: string, fallback: number) =>
    resultByKey.get(key)?.currentUnitPriceCop ?? fallback;
  const subtotal = cart.lines.reduce(
    (sum, l) => sum + unitPrice(l.key, lineUnitPrice(l)) * l.cantidad,
    0,
  );
  // Same figure the drawer shows when nothing changed.
  const stale = subtotal !== cartSubtotal(cart);
  const total = subtotal + (deliveryFeeCop ?? 0);
  const count = cartItemCount(cart);

  return (
    <aside
      aria-labelledby="summary-title"
      className="z-40 bg-cream-soft max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-2xl max-lg:border-t max-lg:border-ink/10 max-lg:px-4 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-1px_2px_rgb(0_0_0/0.04),0_-8px_24px_-8px_rgb(0_0_0/0.12)] sm:max-lg:px-6 lg:sticky lg:top-28 lg:rounded-2xl lg:border lg:border-ink/10 lg:p-5"
    >
      <h2 id="summary-title" className="font-display text-xl text-ink max-lg:sr-only">
        Tu pedido
      </h2>

      <div
        id="summary-body"
        className={
          open
            ? "max-lg:max-h-[45svh] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:border-b max-lg:border-ink/10 max-lg:pb-3"
            : "hidden lg:block"
        }
      >
        <ul className="divide-y divide-ink/10 lg:mt-3">
          {cart.lines.map((line) => {
            const unit = unitPrice(line.key, lineUnitPrice(line));
            return (
              <li key={line.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-body text-sm text-ink">{line.nombre}</p>
                  <p className="font-body text-xs text-ink-muted">
                    {line.etiqueta} · {line.cantidad} × {formatCop(unit)}
                  </p>
                  {line.adicionales.map((a) => (
                    <p key={a.id} className="font-body text-xs text-ink-muted">
                      + {a.nombre} × {a.cantidad}
                    </p>
                  ))}
                </div>
                <span className="font-body text-sm tabular-nums text-ink">
                  {formatCop(unit * line.cantidad)}
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="space-y-2 border-t border-ink/10 pt-3 font-body text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{formatCop(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">{deliveryLabel}</dt>
            <dd className="tabular-nums text-ink">
              {deliveryFeeCop === null ? "Por calcular" : deliveryFeeCop === 0 ? "Sin costo" : formatCop(deliveryFeeCop)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 font-body text-xs text-ink-muted">
          Valores estimados, solo para que te orientes.{" "}
          {stale ? "Usamos los precios actuales. " : ""}
          El total final se confirma al pagar.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 max-lg:pt-1 lg:mt-3 lg:border-t lg:border-ink/10 lg:pt-3">
        <dl className="min-w-0 font-body">
          <dt className="text-xs text-ink-muted lg:text-sm lg:text-ink">Total estimado</dt>
          <dd className="font-display text-xl leading-tight tabular-nums text-ink lg:text-2xl">
            {formatCop(total)}
          </dd>
        </dl>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="summary-body"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full pr-2 pl-3 font-body text-sm text-moss-deep lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          {open ? "Ocultar detalle" : `Ver detalle (${count})`}
          <ChevronRightIcon
            width={16}
            height={16}
            className={`transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? "rotate-90" : "-rotate-90"}`}
          />
        </button>
      </div>

      <div className="mt-2 lg:mt-4">{children}</div>
    </aside>
  );
}
