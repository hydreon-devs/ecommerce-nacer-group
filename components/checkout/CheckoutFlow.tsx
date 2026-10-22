"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { checkCartAvailability } from "@/app/(storefront)/checkout/actions";
import { useCart } from "@/components/cart/CartProvider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  hasBlockingIssue,
  type LineAvailability,
} from "@/lib/domain/checkout/availability";
import {
  currentQuote,
  reconcileDraft,
  toDeliveryStep,
} from "@/lib/domain/checkout/deliveryStep";
import { AvailabilityIssues } from "./AvailabilityIssues";
import { DeliveryStep } from "./DeliveryStep";
import { OrderSummary } from "./OrderSummary";
import { StepIndicator } from "./StepIndicator";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateDraft,
} from "./deliveryDraftStore";

type Check =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; results: LineAvailability[] };

const subscribeNothing = () => () => {};

/** False on the server and during hydration, true after: lets us wait for the stored cart. */
function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

interface Props {
  calendar: { today: string; dates: readonly string[]; holidays: readonly string[] };
  calendarFailed: boolean;
  mapsBrowserKey: string | null;
}

/**
 * Client leaf of `/checkout` (the page itself is a Server Component). Owns the
 * cart-derived state: the fresh availability re-check on entry, the delivery
 * draft in `sessionStorage`, and the order summary.
 */
export function CheckoutFlow({ calendar, calendarFailed, mapsBrowserKey }: Props) {
  const hydrated = useHydrated();
  const { cart, remove, setQuantity } = useCart();
  const storedDraft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const draft = useMemo(() => reconcileDraft(storedDraft, calendar.dates), [storedDraft, calendar.dates]);

  // ---- Availability re-check (fresh, non-reserving) ----------------------------
  const [check, setCheck] = useState<Check>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  // `cart.lines` keeps its identity until the cart changes, so this re-runs when the
  // customer adjusts or removes a line, and on retry.
  const lines = cart.lines;

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await checkCartAvailability(lines);
        if (cancelled) return;
        setCheck(
          response.ok
            ? { phase: "done", results: response.lines }
            : { phase: "error", message: response.message },
        );
      } catch {
        if (!cancelled) {
          setCheck({
            phase: "error",
            message: "No pudimos revisar la disponibilidad ahora mismo. Inténtalo de nuevo.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, lines, attempt]);

  // ---- Step heading focus (moves on step change; only step 1 exists today) -------
  const step: 1 | 2 | 3 = 1;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  if (!hydrated) {
    return (
      <>
        <CheckoutHeader />
        <CheckoutSkeleton />
      </>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <>
        <CheckoutHeader />
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
          <h2 className="font-display text-3xl text-ink">Tu carrito está vacío</h2>
          <p className="font-body text-base text-ink-muted">
            Cuando encuentres algo para ti o para alguien especial, lo verás aquí.
          </p>
          <Link
            href="/catalogo"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-moss px-8 font-body text-base font-medium text-cream transition-colors duration-150 hover:bg-moss-deep motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Ver el catálogo
          </Link>
        </div>
      </>
    );
  }

  const results = check.phase === "done" ? check.results : [];
  const checking = check.phase === "loading";
  const blocked = checking || check.phase === "error" || hasBlockingIssue(results);
  const delivery = toDeliveryStep(draft, calendar.dates);
  const canContinue = delivery.ok && !blocked;

  const quote = currentQuote(draft);
  const deliveryFeeCop =
    draft.method === "tienda" ? 0 : draft.method === "domicilio" && quote?.confirmed ? quote.feeCop : null;

  let continueHint: string;
  if (checking) continueHint = "Estamos revisando la disponibilidad de tu pedido…";
  else if (check.phase === "error") continueHint = "Necesitamos revisar la disponibilidad para continuar.";
  else if (hasBlockingIssue(results)) continueHint = "Ajusta o quita los productos señalados arriba para continuar.";
  else if (!delivery.ok) continueHint = "Completa la entrega para continuar.";
  else continueHint = "Todo listo. El siguiente paso (tus datos) estará disponible muy pronto.";

  return (
    <>
      <CheckoutHeader>
        <StepIndicator current={step} />
      </CheckoutHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10">
        <div className="space-y-5 md:space-y-6">
          {/* The step indicator names the step visually; this heading is the
              focus target on step change and the landmark for screen readers. */}
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">
            Paso {step}: Entrega
          </h2>

          <div role="status" aria-live="polite" className="empty:hidden">
            {checking && (
              <p className="font-body text-sm text-ink-muted">Revisando la disponibilidad de tu pedido…</p>
            )}
          </div>

          {check.phase === "error" && (
            <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
              <p className="font-body text-sm text-ink">{check.message}</p>
              <button
                type="button"
                onClick={() => {
                  setCheck({ phase: "loading" });
                  setAttempt((n) => n + 1);
                }}
                className="mt-3 inline-flex min-h-11 items-center rounded-full border border-ink/20 px-5 font-body text-sm text-ink hover:border-moss hover:bg-moss/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                Reintentar
              </button>
            </div>
          )}

          <AvailabilityIssues
            lines={cart.lines}
            results={results}
            onRemove={remove}
            onSetQuantity={setQuantity}
          />

          {calendarFailed && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4 font-body text-sm text-ink">
              No pudimos cargar las fechas disponibles. Recarga la página en unos minutos.
            </p>
          )}

          <DeliveryStep
            draft={draft}
            calendar={calendar}
            mapsBrowserKey={mapsBrowserKey}
            onChange={updateDraft}
          />
        </div>

        <OrderSummary
          cart={cart}
          results={results}
          deliveryFeeCop={deliveryFeeCop}
          deliveryLabel={draft.method === "tienda" ? "Recoger en el taller" : "Domicilio"}
        >
          {/* TODO(slice 3): enable and link to step 2 (Tus datos) once it exists.
              `canContinue` is already computed so slice 3 only has to wire it. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-describedby="continue-hint"
            data-ready={canContinue}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-moss px-8 font-body text-base font-medium text-cream transition-transform duration-150 ease-out enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:enabled:active:scale-100"
          >
            Continuar
          </button>
          <p id="continue-hint" className="mt-1.5 font-body text-xs text-ink-muted lg:mt-2 lg:text-sm">
            {continueHint}
          </p>
        </OrderSummary>
      </div>
    </>
  );
}

/**
 * Page title, with the step indicator on the same line (right-aligned) so the
 * form starts high enough for the whole step to fit on a phone screen.
 */
function CheckoutHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3 md:mb-8 md:items-end">
      <div>
        <div className="hidden md:block">
          <SectionLabel>Finalizar pedido</SectionLabel>
        </div>
        <h1 className="font-display text-3xl text-ink md:mt-2 md:text-5xl">Tu pedido</h1>
      </div>
      {children}
    </header>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none" />
    </div>
  );
}
