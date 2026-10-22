"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { DURATION_UI, DURATION_UI_SLOW, EASE_UI } from "@/components/motion/variants";
import { CloseIcon } from "@/components/ui/icons";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { lineSubtotal, MAX_LINE_QTY, type CartLine } from "@/lib/domain/cart";
import { formatCop } from "@/lib/format";
import { useCart } from "./CartProvider";

const FOCUSABLE =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Cart drawer (chosen over a /carrito page): the shopper keeps their place in
 * the catalogue or product page, and `nacer-motion` lists "panel lateral con
 * deslizamiento" as the cart's animation zone. Slide is `transform` only; with
 * reduced motion it is a plain opacity fade. 300ms, within the 150-400ms band.
 *
 * A modal dialog: Escape closes, Tab is trapped, focus moves in on open and
 * returns to the opener on close, and document scroll is locked meanwhile.
 */
export function CartDrawer() {
  const { cart, subtotal, drawerOpen, closeDrawer, setQuantity, remove } = useCart();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      };

  return (
    <AnimatePresence initial={false}>
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            aria-hidden="true"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_UI, ease: EASE_UI }}
            className="absolute inset-0 bg-ink/40"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            {...panelMotion}
            transition={{ duration: DURATION_UI_SLOW - 0.1, ease: EASE_UI }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
              <h2 id="cart-title" className="font-display text-2xl text-ink">
                Tu carrito
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar carrito"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/5 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                <CloseIcon />
              </button>
            </div>

            {cart.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="font-display text-xl text-ink">Tu carrito está vacío</p>
                <p className="font-body text-sm text-ink-muted">
                  Cuando agregues algo, lo verás aquí.
                </p>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-6">
                {cart.lines.map((line) => (
                  <CartLineItem
                    key={line.key}
                    line={line}
                    onQuantity={(q) => setQuantity(line.key, q)}
                    onRemove={() => remove(line.key)}
                  />
                ))}
              </ul>
            )}

            <div className="border-t border-ink/10 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-baseline justify-between font-body">
                <span className="text-sm text-ink-muted">Subtotal</span>
                <span className="font-display text-2xl text-ink">{formatCop(subtotal)}</span>
              </div>
              <p className="mt-1 font-body text-xs text-ink-muted">
                El domicilio y el total final se confirman al pagar.
              </p>
              {cart.lines.length === 0 ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-moss px-6 py-3.5 font-body text-base font-medium text-cream disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : (
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-moss px-6 py-3.5 font-body text-base font-medium text-cream transition-colors duration-150 hover:bg-moss-deep motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  Continuar
                </Link>
              )}
              <p className="mt-2 text-center font-body text-xs text-ink-muted">
                El pago en línea estará disponible muy pronto.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CartLineItem({
  line,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  onQuantity: (value: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-ink">{line.nombre}</p>
          <p className="font-body text-sm text-ink-muted">{line.etiqueta}</p>
          {line.adicionales.length > 0 && (
            <ul className="mt-1 font-body text-xs text-ink-muted">
              {line.adicionales.map((a) => (
                <li key={a.id}>
                  + {a.nombre} × {a.cantidad}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="font-body text-sm tabular-nums text-ink">
          {formatCop(lineSubtotal(line))}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <QuantityStepper
          value={line.cantidad}
          min={1}
          max={MAX_LINE_QTY}
          onChange={onQuantity}
          label={`Cantidad de ${line.nombre}, ${line.etiqueta}`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${line.nombre}, ${line.etiqueta}`}
          className="inline-flex min-h-11 items-center rounded-full px-3 font-body text-sm text-ink-muted underline-offset-4 transition-colors duration-150 hover:text-danger hover:underline motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          Quitar
        </button>
      </div>
    </li>
  );
}
