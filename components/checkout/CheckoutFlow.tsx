"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { checkCartAvailability, createWebOrderAction } from "@/app/(storefront)/checkout/actions";
import { useCart } from "@/components/cart/CartProvider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  hasBlockingIssue,
  type LineAvailability,
} from "@/lib/domain/checkout/availability";
import { submitOrder, uuidV4FromBytes } from "@/lib/domain/checkout/attempt";
import {
  currentQuote,
  reconcileDraft,
  toDeliveryStep,
  type DeliveryDraft,
} from "@/lib/domain/checkout/deliveryStep";
import { reconcileFlow } from "@/lib/domain/checkout/flowDraft";
import {
  detailsPages,
  validateDetails,
  type DetailsDraft,
  type DetailsPageNumber,
} from "@/lib/domain/checkout/saleDetails";
import { buildOrderRequest, orderRequestSignature } from "@/lib/domain/checkout/webOrderPayload";
import type { OrderRoute, WebOrder } from "@/lib/domain/checkout/webOrderResult";
import { AvailabilityIssues } from "./AvailabilityIssues";
import { DeliveryStep } from "./DeliveryStep";
import { DetailsStep } from "./DetailsStep";
import { OrderSummary } from "./OrderSummary";
import { StepIndicator } from "./StepIndicator";
import { SummaryStep } from "./SummaryStep";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateDraft,
} from "./deliveryDraftStore";
import {
  getServerSnapshot as getFlowServerSnapshot,
  getSnapshot as getFlowSnapshot,
  subscribe as subscribeFlow,
  updateFlow,
} from "./flowDraftStore";
import { PRIMARY } from "./formStyles";

type Check =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; results: LineAvailability[] };

const subscribeNothing = () => () => {};

/** A message the server routed back to a step, shown above that step's form. */
type Notice = { step: 1 | 2; text: string };

function newAttemptId(): string {
  return uuidV4FromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

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
 * draft and the details/attempt draft in `sessionStorage`, the three steps
 * and the order creation. Neither draft is a source of truth: the server
 * re-validates, re-measures and re-prices everything on `createWebOrderAction`.
 */
export function CheckoutFlow({ calendar, calendarFailed, mapsBrowserKey }: Props) {
  const hydrated = useHydrated();
  const { cart, remove, setQuantity } = useCart();
  const storedDraft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const draft = useMemo(() => reconcileDraft(storedDraft, calendar.dates), [storedDraft, calendar.dates]);
  const storedFlow = useSyncExternalStore(subscribeFlow, getFlowSnapshot, getFlowServerSnapshot);

  const delivery = toDeliveryStep(draft, calendar.dates);
  const flow = reconcileFlow(storedFlow, { deliveryReady: delivery.ok });

  // ---- Availability re-check (fresh, non-reserving) ----------------------------
  const [check, setCheck] = useState<Check>({ phase: "loading" });
  const [recheck, setRecheck] = useState(0);
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
  }, [hydrated, lines, recheck]);

  // ---- Order creation -----------------------------------------------------------
  const [order, setOrder] = useState<WebOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});
  const [deliveryErrors, setDeliveryErrors] = useState<Record<string, string>>({});

  function changeDelivery(patch: Partial<DeliveryDraft>) {
    const keys = Object.keys(patch);
    if (keys.length > 0 && Object.keys(deliveryErrors).length > 0) {
      setDeliveryErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.includes(k))));
    }
    updateDraft(patch);
  }

  function changeDetails(patch: Partial<DetailsDraft>) {
    const keys = Object.keys(patch);
    if (keys.some((k) => k in detailsErrors)) {
      setDetailsErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.includes(k))));
    }
    updateFlow({ details: { ...getFlowSnapshot().details, ...patch } });
  }

  function productNames(variantSku: string | undefined): string | null {
    if (!variantSku) return null;
    const names = [...new Set(cart.lines.filter((l) => l.sku === variantSku).map((l) => l.nombre))];
    return names.length > 0 ? names.join(", ") : null;
  }

  function applyRoute(route: OrderRoute) {
    switch (route.kind) {
      case "datos":
        setDetailsErrors(route.fieldErrors);
        setNotice({ step: 2, text: route.message });
        updateFlow({ step: 2, subPage: route.page });
        break;
      case "entrega": {
        setDeliveryErrors(route.fieldErrors);
        setNotice({ step: 1, text: route.message });
        // A date the database refused must be picked again.
        if (route.fieldErrors.date) updateDraft({ date: "" });
        updateFlow({ step: 1 });
        break;
      }
      case "productos": {
        const name = productNames(route.variantSku);
        setNotice({ step: 1, text: name ? `${name}: ${route.message}` : route.message });
        updateFlow({ step: 1 });
        // Fresh check: it flags the line and offers to adjust or remove it.
        setCheck({ phase: "loading" });
        setRecheck((n) => n + 1);
        break;
      }
      case "intento":
      case "retry":
        setSubmitError(route.message);
        break;
    }
  }

  async function submit() {
    if (submittingRef.current) return;
    if (!delivery.ok) {
      updateFlow({ step: 1 });
      return;
    }
    const method = delivery.step.method;
    const current = getFlowSnapshot();

    // Whole-form check first: a restored draft may have an invalid earlier page.
    const whole = validateDetails(current.details, method);
    if (!whole.ok) {
      const pages = detailsPages(method);
      const firstBad = pages.find((p) => p.fields.some((f) => f in whole.errors));
      setDetailsErrors(whole.errors);
      updateFlow({ step: 2, subPage: firstBad?.number ?? 1 });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setNotice(null);
    setDetailsErrors({});
    setDeliveryErrors({});

    const request = buildOrderRequest(cart.lines, delivery.step, current.details);
    try {
      const { attempt, result } = await submitOrder({
        state: current.attempt,
        signature: orderRequestSignature(request),
        newId: newAttemptId,
        call: ({ attemptId, replacesAttemptId }) =>
          createWebOrderAction({ attemptId, replacesAttemptId, ...request }),
      });
      updateFlow({ attempt });
      if (result.ok) {
        setOrder(result.order);
        updateFlow({ step: 3 });
      } else {
        applyRoute(result.route);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Reload on the Summary: ask the RPC again with the same attempt. It is
  // idempotent (`reutilizado`), so the customer sees the same order.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    if (!(flow.step === 3 && order === null && delivery.ok && cart.lines.length > 0)) return;
    // Deferred so the submission (which sets state) does not run inside the effect body.
    const id = window.setTimeout(() => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      void submit();
    }, 0);
    return () => window.clearTimeout(id);
    // `submit` reads fresh state from the stores; this must fire once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, flow.step, order, delivery.ok, cart.lines.length]);

  // ---- Step heading focus (step 1 only; steps 2 and 3 focus their own heading) ----
  const step = flow.step;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    if (step === 1) headingRef.current?.focus();
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

  // ---- Step 3: Resumen (server result) ------------------------------------------
  if (step === 3 && delivery.ok) {
    return (
      <>
        <CheckoutHeader>
          <StepIndicator current={3} />
        </CheckoutHeader>
        {order === null ? (
          <div role="status" aria-live="polite" className="space-y-4">
            <p className="font-body text-sm text-ink-muted">Recuperando tu pedido…</p>
            {submitError && (
              <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
                <p className="font-body text-sm text-ink">{submitError}</p>
                <button type="button" className={`${PRIMARY} mt-3`} onClick={() => void submit()} disabled={submitting}>
                  Reintentar
                </button>
              </div>
            )}
          </div>
        ) : (
          <SummaryStep
            order={order}
            cartLines={cart.lines}
            delivery={delivery.step}
            recipientName={flow.details.recipient_name.trim()}
            busy={submitting}
            onEditDelivery={() => updateFlow({ step: 1 })}
            onEditDetails={() => updateFlow({ step: 2, subPage: 1 })}
            onReserveAgain={() => void submit()}
          />
        )}
      </>
    );
  }

  const results = check.phase === "done" ? check.results : [];
  const checking = check.phase === "loading";
  const blocked = checking || check.phase === "error" || hasBlockingIssue(results);
  const canContinue = delivery.ok && !blocked;

  const quote = currentQuote(draft);
  const deliveryFeeCop =
    draft.method === "tienda" ? 0 : draft.method === "domicilio" && quote?.confirmed ? quote.feeCop : null;

  let continueHint: string;
  if (checking) continueHint = "Estamos revisando la disponibilidad de tu pedido…";
  else if (check.phase === "error") continueHint = "Necesitamos revisar la disponibilidad para continuar.";
  else if (hasBlockingIssue(results)) continueHint = "Ajusta o quita los productos señalados arriba para continuar.";
  else if (!delivery.ok) continueHint = "Completa la entrega para continuar.";
  else continueHint = "Todo listo. El siguiente paso son tus datos.";

  const stepNotice = notice && notice.step === step ? notice.text : null;

  return (
    <>
      <CheckoutHeader>
        <StepIndicator current={step} />
      </CheckoutHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10">
        <div className="space-y-5 md:space-y-6">
          {step === 1 ? (
            <>
              {/* The step indicator names the step visually; this heading is the
                  focus target on step change and the landmark for screen readers. */}
              <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                Paso 1: Entrega
              </h2>

              <div role="status" aria-live="polite" className="empty:hidden">
                {checking && (
                  <p className="font-body text-sm text-ink-muted">Revisando la disponibilidad de tu pedido…</p>
                )}
              </div>

              {stepNotice && (
                <p role="alert" className="rounded-2xl border border-amber/60 bg-amber/10 p-4 font-body text-sm text-ink">
                  {stepNotice}
                </p>
              )}

              {check.phase === "error" && (
                <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
                  <p className="font-body text-sm text-ink">{check.message}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCheck({ phase: "loading" });
                      setRecheck((n) => n + 1);
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
                onChange={changeDelivery}
                serverErrors={deliveryErrors}
              />
            </>
          ) : (
            delivery.ok && (
              <DetailsStep
                method={delivery.step.method}
                details={flow.details}
                page={flow.subPage}
                serverErrors={detailsErrors}
                notice={stepNotice}
                submitting={submitting}
                submitError={submitError}
                onChange={changeDetails}
                onPageChange={(page: DetailsPageNumber) => {
                  setNotice(null);
                  updateFlow({ subPage: page });
                }}
                onBackToDelivery={() => updateFlow({ step: 1 })}
                onSubmit={() => void submit()}
              />
            )
          )}
        </div>

        <OrderSummary
          cart={cart}
          results={results}
          deliveryFeeCop={deliveryFeeCop}
          deliveryLabel={draft.method === "tienda" ? "Recoger en el taller" : "Domicilio"}
        >
          {step === 1 ? (
            <>
              <button
                type="button"
                disabled={!canContinue}
                aria-disabled={!canContinue}
                aria-describedby="continue-hint"
                onClick={() => {
                  setNotice(null);
                  setSubmitError(null);
                  updateFlow({ step: 2, subPage: 1 });
                }}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-moss px-8 font-body text-base font-medium text-cream transition-transform duration-150 ease-out enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:enabled:active:scale-100"
              >
                Continuar
              </button>
              <p id="continue-hint" className="mt-1.5 font-body text-xs text-ink-muted lg:mt-2 lg:text-sm">
                {continueHint}
              </p>
            </>
          ) : null}
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
