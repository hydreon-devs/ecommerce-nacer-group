"use client";

import { useId, useRef, useState } from "react";
import { quoteDeliveryAction } from "@/app/(storefront)/checkout/actions";
import {
  currentQuote,
  toDeliveryStep,
  type DeliveryDraft,
} from "@/lib/domain/checkout/deliveryStep";
import { isMunicipality, MUNICIPALITIES } from "@/lib/domain/checkout/municipalities";
import {
  ADDRESS_MAX_LENGTH,
  ADDRESS_MIN_LENGTH,
  quoteErrorMessage,
} from "@/lib/domain/checkout/quoteDelivery";
import { formatCop } from "@/lib/format";
import { DateCalendar } from "./DateCalendar";
import { DeliveryMap } from "./DeliveryMap";
import { Reveal } from "./Reveal";

const FIELD =
  "min-h-11 w-full rounded-xl border border-ink/20 bg-cream px-4 py-2.5 font-body text-base text-ink placeholder:text-ink-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss aria-[invalid=true]:border-danger";
const LABEL = "block font-body text-sm font-medium text-ink";
const HINT = "mt-1 font-body text-xs text-ink-muted";
const ERROR = "mt-1 font-body text-sm text-danger";
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-moss px-6 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ink/20 px-6 font-body text-sm text-ink transition-colors duration-150 hover:border-moss hover:bg-moss/8 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

interface Props {
  draft: DeliveryDraft;
  calendar: { today: string; dates: readonly string[]; holidays: readonly string[] };
  mapsBrowserKey: string | null;
  onChange: (patch: Partial<DeliveryDraft>) => void;
}

type QuoteUi = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string };

/**
 * Step 1 form: pickup or home delivery. Home delivery runs address ->
 * "Calcular domicilio" -> Google's resolved address + static map + fee ->
 * "¿Es aquí donde entregamos?" -> neighborhood, apartment/tower and date.
 * The fee is display only; slice 4 recomputes it server-side.
 */
export function DeliveryStep({ draft, calendar, mapsBrowserKey, onChange }: Props) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const addressRef = useRef<HTMLInputElement>(null);
  const [quoteUi, setQuoteUi] = useState<QuoteUi>({ phase: "idle" });
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const quote = currentQuote(draft);
  const confirmed = quote?.confirmed === true;
  const validation = toDeliveryStep(draft, calendar.dates);
  const errors = validation.ok ? {} : validation.errors;
  const fieldError = (field: string) => (touched.has(field) ? errors[field] : undefined);

  async function calculate() {
    const address = draft.address.trim();
    if (address.length < ADDRESS_MIN_LENGTH || !isMunicipality(draft.municipality)) {
      setQuoteUi({ phase: "error", message: quoteErrorMessage("invalid_input") });
      return;
    }
    const municipality = draft.municipality;
    setQuoteUi({ phase: "loading" });
    try {
      const result = await quoteDeliveryAction({ address, municipality });
      if (!result.ok) {
        setQuoteUi({ phase: "error", message: result.message });
        return;
      }
      onChange({
        quote: {
          address,
          municipality,
          resolvedAddress: result.resolvedAddress,
          meters: result.meters,
          feeCop: result.feeCop,
          confirmed: false,
        },
      });
      setQuoteUi({ phase: "idle" });
    } catch {
      setQuoteUi({ phase: "error", message: quoteErrorMessage("provider_error") });
    }
  }

  function correctAddress() {
    onChange({ quote: null });
    setQuoteUi({ phase: "idle" });
    requestAnimationFrame(() => addressRef.current?.focus());
  }

  const dateLabelId = id("date-label");
  const datePicker = (
    <div role="group" aria-labelledby={dateLabelId}>
      <p id={dateLabelId} className={LABEL}>
        {draft.method === "tienda" ? "¿Qué día pasas por tu pedido?" : "¿Qué día te lo entregamos?"}
      </p>
      {calendar.dates.length === 0 ? (
        <p id={id("date-error")} role="alert" className={ERROR}>
          Por ahora no tenemos fechas disponibles. Escríbenos por WhatsApp y lo coordinamos contigo.
        </p>
      ) : (
        <>
          <p id={id("date-hint")} className={`${HINT} mb-2`}>
            Lunes a sábado, sin festivos. La confirmamos al crear el pedido.
          </p>
          <DateCalendar
            dates={calendar.dates}
            holidays={calendar.holidays}
            today={calendar.today}
            value={draft.date}
            onChange={(date) => onChange({ date })}
            onBlur={() => touch("date")}
            labelId={dateLabelId}
            describedBy={`${id("date-hint")}${fieldError("date") ? ` ${id("date-error")}` : ""}`}
            summaryLabel={draft.method === "tienda" ? "Recogida" : "Entrega"}
          />
          {fieldError("date") && (
            <p id={id("date-error")} className={ERROR}>
              {fieldError("date")}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <fieldset>
        <legend className="font-display text-lg text-ink md:text-xl">¿Cómo quieres recibir tu pedido?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
          {(
            [
              ["tienda", "Recoger en el taller", "Sin costo. Te avisamos cuando esté listo."],
              ["domicilio", "Domicilio", "Medellín y área metropolitana."],
            ] as const
          ).map(([value, title, note]) => (
            <label
              key={value}
              className="flex min-h-14 cursor-pointer items-start gap-2 rounded-xl border border-ink/20 p-3 transition-colors duration-150 has-[:checked]:border-moss has-[:checked]:bg-moss/8 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss motion-reduce:transition-none sm:gap-3 sm:p-4"
            >
              <input
                type="radio"
                name={id("method")}
                value={value}
                checked={draft.method === value}
                onChange={() => onChange({ method: value })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-moss"
              />
              <span className="min-w-0">
                <span className="block font-body text-sm leading-snug font-medium text-ink sm:text-base">
                  {title}
                </span>
                <span className="mt-0.5 block font-body text-xs leading-snug text-ink-muted sm:text-sm">
                  {note}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Reveal show={draft.method === "tienda"} id="tienda">
        {datePicker}
      </Reveal>

      <Reveal show={draft.method === "domicilio"} id="domicilio">
        <div className="space-y-5 md:space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
            <div>
              <label htmlFor={id("address")} className={LABEL}>
                Dirección de entrega
              </label>
              <input
                ref={addressRef}
                id={id("address")}
                type="text"
                autoComplete="street-address"
                maxLength={ADDRESS_MAX_LENGTH}
                value={draft.address}
                onChange={(e) => onChange({ address: e.target.value })}
                aria-describedby={`${id("address-hint")}${quoteUi.phase === "error" ? ` ${id("quote-error")}` : ""}`}
                aria-invalid={quoteUi.phase === "error" ? true : undefined}
                placeholder="Calle 10 #5-20"
                className={FIELD}
              />
              <p id={id("address-hint")} className={HINT}>
                Tipo de vía, número y, si quieres, un punto de referencia.
              </p>
            </div>
            <div>
              <label htmlFor={id("municipality")} className={LABEL}>
                Municipio
              </label>
              <select
                id={id("municipality")}
                value={draft.municipality}
                onChange={(e) =>
                  onChange({ municipality: isMunicipality(e.target.value) ? e.target.value : "" })
                }
                autoComplete="address-level2"
                className={FIELD}
              >
                <option value="">Elige uno</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!quote && (
            <div>
              <button
                type="button"
                onClick={calculate}
                disabled={quoteUi.phase === "loading"}
                aria-busy={quoteUi.phase === "loading"}
                className={PRIMARY}
              >
                {quoteUi.phase === "loading" ? "Calculando…" : "Calcular domicilio"}
              </button>
              {quoteUi.phase === "error" && (
                <p id={id("quote-error")} role="alert" className={ERROR}>
                  {quoteUi.message}
                </p>
              )}
            </div>
          )}

          <div aria-live="polite">
            <Reveal show={quote !== null && !confirmed} id="quote">
              {quote && (
                <div className="grid gap-4 rounded-2xl border border-ink/10 bg-cream-soft p-4 sm:grid-cols-[1fr_15rem] sm:p-5">
                  <div className="space-y-3">
                    <div>
                      <p className="font-body text-xs uppercase tracking-[0.16em] text-moss">
                        Encontramos esta dirección
                      </p>
                      <p className="mt-1 font-display text-lg text-ink">{quote.resolvedAddress}</p>
                      <p className="mt-1 font-body text-sm text-ink-muted">
                        Domicilio estimado:{" "}
                        <span className="font-medium text-ink">{formatCop(quote.feeCop)}</span> (se confirma
                        al pagar)
                      </p>
                    </div>
                    <p className="font-display text-lg text-ink">¿Es aquí donde entregamos?</p>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        type="button"
                        className={PRIMARY}
                        onClick={() => onChange({ quote: { ...quote, confirmed: true } })}
                      >
                        Sí, es aquí
                      </button>
                      <button type="button" className={SECONDARY} onClick={correctAddress}>
                        Corregir dirección
                      </button>
                    </div>
                  </div>
                  {/* Phones: map first, so the question and its answers close the card. */}
                  <div className="max-sm:-order-1 sm:self-center">
                    <DeliveryMap resolvedAddress={quote.resolvedAddress} browserKey={mapsBrowserKey} />
                  </div>
                </div>
              )}
            </Reveal>
          </div>

          <Reveal show={confirmed} id="confirmed">
            {quote && (
              <div className="space-y-5 md:space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moss/40 bg-moss/8 p-3 sm:p-4">
                  <p className="font-body text-sm text-ink">
                    <span className="font-medium">Entregamos en:</span> {quote.resolvedAddress}
                    <span className="block text-ink-muted">
                      Domicilio estimado {formatCop(quote.feeCop)}
                    </span>
                  </p>
                  <button type="button" className={SECONDARY} onClick={correctAddress}>
                    Cambiar dirección
                  </button>
                </div>

                {/* From `lg`: address details left, calendar right, so the step fits one screen. */}
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
                  <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <label htmlFor={id("neighborhood")} className={LABEL}>
                        Barrio
                      </label>
                      <input
                        id={id("neighborhood")}
                        type="text"
                        maxLength={100}
                        value={draft.neighborhood}
                        onChange={(e) => onChange({ neighborhood: e.target.value })}
                        onBlur={() => touch("neighborhood")}
                        aria-required="true"
                        aria-invalid={fieldError("neighborhood") ? true : undefined}
                        aria-describedby={fieldError("neighborhood") ? id("neighborhood-error") : undefined}
                        className={FIELD}
                      />
                      {fieldError("neighborhood") && (
                        <p id={id("neighborhood-error")} className={ERROR}>
                          {fieldError("neighborhood")}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={id("unit")} className={LABEL}>
                        Apartamento o torre <span className="font-normal text-ink-muted">(opcional)</span>
                      </label>
                      <input
                        id={id("unit")}
                        type="text"
                        maxLength={100}
                        value={draft.unit}
                        onChange={(e) => onChange({ unit: e.target.value })}
                        autoComplete="address-line2"
                        className={FIELD}
                      />
                    </div>
                  </div>

                  {datePicker}
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </Reveal>
    </div>
  );
}
