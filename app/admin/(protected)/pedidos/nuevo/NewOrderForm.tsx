"use client";

import { useState, useTransition, type ReactNode } from "react";
import { formatCop } from "@/lib/format";
import {
  OCCASIONS,
  PAYMENT_SOURCES,
  REFERRAL_SOURCES,
  addProductToLines,
  computeTotals,
  fieldPaso,
  filterProducts,
  mergeDuplicateLines,
  validatePanelSale,
  type CatalogProduct,
  type DeliveryZone,
  type DetailKey,
  type FormLine,
  type Paso,
  type SaleErrorView,
} from "@/lib/domain/panelSale";
import { createPanelSale } from "./actions";

const INPUT =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 placeholder:text-admin-ink-muted focus:border-admin-accent aria-[invalid=true]:border-admin-critical-fg";
const LABEL = "text-sm font-medium text-admin-ink-secondary";
const FIELDSET =
  "flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04)]";
const SECONDARY_BUTTON =
  "min-h-11 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent";

type LineState = FormLine;

type Details = Record<DetailKey, string>;

const EMPTY_DETAILS: Details = {
  buyer_name: "",
  buyer_phone: "",
  buyer_email: "",
  recipient_name: "",
  recipient_phone: "",
  may_call_recipient: "si",
  delivery_unit: "",
  building_name: "",
  neighborhood: "",
  city: "",
  card_from: "",
  card_to: "",
  card_message: "",
  special_notes: "",
  wants_invoice: "no",
  invoice_legal_name: "",
  invoice_tax_id: "",
  invoice_email: "",
  referral_source: "",
};

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-admin-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-admin-critical-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-admin-critical-bg px-3 py-2 text-sm text-admin-critical-fg">
      {message}
    </p>
  );
}

export function NewOrderForm({
  catalog,
  zones,
}: {
  catalog: CatalogProduct[];
  zones: DeliveryZone[];
}) {
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  const [nextKey, setNextKey] = useState(1);

  const [deliveryMethod, setDeliveryMethod] = useState<"tienda" | "domicilio">("tienda");
  const [zone, setZone] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [occasion, setOccasion] = useState("");

  const [paymentSource, setPaymentSource] = useState<"transferencia" | "mercadopago">("transferencia");
  const [paymentRef, setPaymentRef] = useState("");

  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [stepError, setStepError] = useState<SaleErrorView | null>(null);

  const productById = new Map(catalog.map((p) => [p.id, p]));
  const skuNames: Record<string, string> = {};
  for (const p of catalog) {
    for (const v of p.variants) {
      skuNames[v.sku] = p.variants.length > 1 ? `${p.name} (${v.label})` : p.name;
    }
  }

  const zoneValue = deliveryMethod === "domicilio" ? (zones.find((z) => String(z.number) === zone)?.value ?? 0) : 0;
  const totals = computeTotals(
    lines.map((l) => ({ variantSku: l.variantSku, qty: l.qty, optionName: l.optionName || null, optionQty: l.optionQty })),
    catalog,
    zoneValue,
  );

  const results = filterProducts(catalog, search).slice(0, 8);

  /** Unidades de un SKU ya tomadas por las demás líneas. */
  function takenByOthers(sku: string, key: number): number {
    return lines.filter((l) => l.key !== key && l.variantSku === sku).reduce((sum, l) => sum + l.qty, 0);
  }

  function addProduct(product: CatalogProduct) {
    setLines((prev) => addProductToLines(prev, product, nextKey));
    setNextKey((k) => k + 1);
    setSearch("");
  }

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((prev) => mergeDuplicateLines(prev.map((l) => (l.key === key ? { ...l, ...patch } : l))));
  }

  function setDetail(key: DetailKey, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function isBad(field: string): boolean {
    return field in fieldErrors || marked.includes(field);
  }
  const err = (field: string) => fieldErrors[field];
  const invalid = (field: string) => (isBad(field) ? true : undefined);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      lines: lines.map((l) => ({ variantSku: l.variantSku, qty: l.qty, optionName: l.optionName || null, optionQty: l.optionQty })),
      deliveryMethod,
      deliveryZone: zone === "" ? null : Number(zone),
      deliveryAddress: address,
      desiredDeliveryDate: date,
      occasion,
      paymentSource,
      paymentRef,
      details,
    };

    // Misma validación que el servidor, para marcar los campos sin viaje de red.
    const local = validatePanelSale(input);
    // Una línea por encima del stock disponible se bloquea aquí; el servidor lo confirma al reservar.
    const stockErrors: Record<string, string> = {};
    lines.forEach((l, index) => {
      const variant = productById.get(l.productId)?.variants.find((v) => v.sku === l.variantSku);
      if (variant && l.qty + takenByOthers(l.variantSku, l.key) > variant.available) {
        stockErrors[`line:${index}`] = `Solo hay ${variant.available} disponibles.`;
      }
    });
    const errors = { ...(local.ok ? {} : local.errors), ...stockErrors };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMarked([]);
      setStepError({
        paso: fieldPaso(Object.keys(errors)[0]),
        message: "Revisa los campos marcados.",
        fields: Object.keys(errors),
      });
      return;
    }

    setFieldErrors({});
    setMarked([]);
    setStepError(null);
    startTransition(async () => {
      const state = await createPanelSale(input, skuNames);
      setFieldErrors(state.fieldErrors);
      setMarked(state.error?.fields ?? []);
      setStepError(state.error);
    });
  }

  const messageFor = (paso: Paso) => (stepError?.paso === paso ? stepError.message : null);
  const lineBad = (l: LineState, index: number) =>
    `line:${index}` in fieldErrors || marked.includes(`line:${l.variantSku}`);

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-6">
      {/* 1. Productos */}
      <fieldset className={FIELDSET}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">1. Productos</legend>

        <div className="flex flex-col gap-2">
          <Field id="product-search" label="Buscar producto" error={err("lines")}>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              placeholder="Nombre del producto"
              aria-invalid={invalid("lines")}
              className={INPUT}
            />
          </Field>
          {search.trim() !== "" ? (
            <ul className="flex flex-col overflow-hidden rounded-lg border border-admin-border">
              {results.map((product) => {
                const stock = product.variants.reduce((sum, v) => sum + v.available, 0);
                const left = stock - lines.filter((l) => l.productId === product.id).reduce((sum, l) => sum + l.qty, 0);
                return (
                  <li key={product.id} className="border-b border-admin-border last:border-0">
                    <button
                      type="button"
                      disabled={left <= 0}
                      onClick={() => addProduct(product)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-admin-ink-secondary transition-colors duration-150 hover:bg-admin-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
                    >
                      <span>{product.name}</span>
                      <span className="font-admin-mono text-xs text-admin-ink-muted">
                        {stock === 0 ? "Sin stock" : left <= 0 ? "Todo en el pedido" : `${left} disp.`}
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-admin-ink-muted">Ningún producto coincide.</li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-admin-ink-muted">Aún no hay productos en el pedido.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line, index) => {
              const product = productById.get(line.productId);
              if (!product) return null;
              const variant = product.variants.find((v) => v.sku === line.variantSku) ?? product.variants[0];
              const room = Math.max(variant.available - takenByOthers(variant.sku, line.key), 0);
              const option = product.options.find((o) => o.name === line.optionName);
              const bad = lineBad(line, index);
              return (
                <li
                  key={line.key}
                  className={`animate-view-in flex flex-col gap-3 rounded-lg border p-3 ${
                    bad ? "border-admin-critical-fg" : "border-admin-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-admin-ink">{product.name}</p>
                      <p className="text-xs text-admin-ink-muted">
                        {formatCop(variant.price)} c/u · {variant.available} disponibles
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="min-h-11 rounded-lg px-2.5 text-xs font-medium text-admin-ink-muted transition-colors duration-150 hover:bg-admin-surface-sunken hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {product.variants.length > 1 ? (
                      <Field id={`variant-${line.key}`} label="Variante">
                        <select
                          id={`variant-${line.key}`}
                          value={line.variantSku}
                          onChange={(e) => updateLine(line.key, { variantSku: e.target.value, qty: 1 })}
                          className={INPUT}
                        >
                          {product.variants.map((v) => (
                            <option key={v.sku} value={v.sku} disabled={v.available === 0}>
                              {v.label} — {formatCop(v.price)}
                              {v.available === 0 ? " (agotada)" : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    <Field id={`qty-${line.key}`} label="Cantidad" error={err(`line:${index}`)}>
                      <input
                        id={`qty-${line.key}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={Math.max(room, 1)}
                        value={line.qty}
                        onChange={(e) => {
                          const raw = Math.floor(Number(e.target.value)) || 1;
                          updateLine(line.key, { qty: Math.min(Math.max(raw, 1), Math.max(room, 1)) });
                        }}
                        aria-invalid={bad || undefined}
                        className={`${INPUT} font-admin-mono`}
                      />
                    </Field>
                    {product.options.length > 0 ? (
                      <Field id={`option-${line.key}`} label="Adicional">
                        <select
                          id={`option-${line.key}`}
                          value={line.optionName}
                          onChange={(e) => updateLine(line.key, { optionName: e.target.value, optionQty: 1 })}
                          className={INPUT}
                        >
                          <option value="">Sin adicional</option>
                          {product.options.map((o) => (
                            <option key={o.name} value={o.name}>
                              {o.name} — {formatCop(o.price)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                  </div>

                  {option && option.maxQty > 1 ? (
                    <div className="max-w-40">
                      <Field id={`option-qty-${line.key}`} label="Cantidad del adicional">
                        <input
                          id={`option-qty-${line.key}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={option.maxQty}
                          value={line.optionQty}
                          onChange={(e) => {
                            const raw = Math.floor(Number(e.target.value)) || 1;
                            updateLine(line.key, { optionQty: Math.min(Math.max(raw, 1), option.maxQty) });
                          }}
                          className={`${INPUT} font-admin-mono`}
                        />
                      </Field>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <StepMessage message={messageFor("productos")} />
      </fieldset>

      {/* 2. Entrega */}
      <fieldset className={FIELDSET}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">2. Entrega</legend>

        <div role="radiogroup" aria-label="Tipo de entrega" className="flex flex-wrap gap-4">
          {(
            [
              ["tienda", "Recoger en tienda"],
              ["domicilio", "Domicilio"],
            ] as const
          ).map(([value, text]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-admin-ink-secondary">
              <input
                type="radio"
                name="delivery_method"
                value={value}
                checked={deliveryMethod === value}
                onChange={() => setDeliveryMethod(value)}
                className="accent-admin-accent"
              />
              {text}
            </label>
          ))}
        </div>

        {deliveryMethod === "domicilio" ? (
          <div className="grid animate-view-in grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="delivery-zone" label="Zona de domicilio" error={err("delivery_zone")}>
              <select
                id="delivery-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                aria-invalid={invalid("delivery_zone")}
                className={INPUT}
              >
                <option value="">Elige la zona</option>
                {zones.map((z) => (
                  <option key={z.number} value={z.number}>
                    Zona {z.number} — {formatCop(z.value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="delivery-address" label="Dirección" error={err("delivery_address")}>
              <input
                id="delivery-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={200}
                aria-invalid={invalid("delivery_address")}
                className={INPUT}
              />
            </Field>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="delivery-date" label="Fecha de entrega (opcional)" error={err("desired_delivery_date")}>
            <input
              id="delivery-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={invalid("desired_delivery_date")}
              className={`${INPUT} font-admin-mono`}
            />
          </Field>
          <Field id="occasion" label="Ocasión (opcional)" error={err("occasion")}>
            <select
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              aria-invalid={invalid("occasion")}
              className={INPUT}
            >
              <option value="">Sin ocasión</option>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <StepMessage message={messageFor("entrega")} />
      </fieldset>

      {/* 3. Pago */}
      <fieldset className={FIELDSET}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">3. Pago</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="payment-source" label="Medio de pago" error={err("payment_source")}>
            <select
              id="payment-source"
              value={paymentSource}
              onChange={(e) => setPaymentSource(e.target.value as typeof paymentSource)}
              aria-invalid={invalid("payment_source")}
              className={INPUT}
            >
              {PAYMENT_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="payment-ref" label="Referencia (opcional)" error={err("payment_ref")}>
            <input
              id="payment-ref"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              maxLength={100}
              aria-invalid={invalid("payment_ref")}
              className={`${INPUT} font-admin-mono`}
            />
          </Field>
        </div>

        <dl className="flex flex-col gap-1 rounded-lg bg-admin-surface-sunken p-3 text-sm text-admin-ink-secondary">
          <div className="flex justify-between">
            <dt>Productos</dt>
            <dd className="font-admin-mono">{formatCop(totals.products)}</dd>
          </div>
          {totals.addOns > 0 ? (
            <div className="flex justify-between">
              <dt>Adicionales</dt>
              <dd className="font-admin-mono">{formatCop(totals.addOns)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Domicilio</dt>
            <dd className="font-admin-mono">{formatCop(totals.delivery)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-admin-border pt-2 font-semibold text-admin-ink">
            <dt>Total</dt>
            <dd className="font-admin-mono" aria-live="polite">
              {formatCop(totals.total)}
            </dd>
          </div>
        </dl>
        <StepMessage message={messageFor("pago")} />
      </fieldset>

      {/* 4. Comprador y destinatario */}
      <fieldset className={FIELDSET}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">4. Comprador y destinatario</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="buyer-name" label="Nombre del comprador" error={err("buyer_name")}>
            <input id="buyer-name" value={details.buyer_name} onChange={(e) => setDetail("buyer_name", e.target.value)} maxLength={150} aria-invalid={invalid("buyer_name")} className={INPUT} />
          </Field>
          <Field id="buyer-phone" label="Celular del comprador" error={err("buyer_phone")} hint="Entre 7 y 15 dígitos.">
            <input id="buyer-phone" type="tel" value={details.buyer_phone} onChange={(e) => setDetail("buyer_phone", e.target.value)} aria-invalid={invalid("buyer_phone")} className={`${INPUT} font-admin-mono`} />
          </Field>
          <Field id="buyer-email" label="Correo (opcional)" error={err("buyer_email")}>
            <input id="buyer-email" type="email" value={details.buyer_email} onChange={(e) => setDetail("buyer_email", e.target.value)} maxLength={150} aria-invalid={invalid("buyer_email")} className={INPUT} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="recipient-name" label="Quien recibe (opcional)" error={err("recipient_name")}>
            <input id="recipient-name" value={details.recipient_name} onChange={(e) => setDetail("recipient_name", e.target.value)} maxLength={150} aria-invalid={invalid("recipient_name")} className={INPUT} />
          </Field>
          <Field id="recipient-phone" label="Teléfono de quien recibe (opcional)" error={err("recipient_phone")}>
            <input id="recipient-phone" type="tel" value={details.recipient_phone} onChange={(e) => setDetail("recipient_phone", e.target.value)} aria-invalid={invalid("recipient_phone")} className={`${INPUT} font-admin-mono`} />
          </Field>
          <Field id="may-call" label="¿Se puede llamar a quien recibe?">
            <select id="may-call" value={details.may_call_recipient} onChange={(e) => setDetail("may_call_recipient", e.target.value)} className={INPUT}>
              <option value="si">Sí</option>
              <option value="no">No, puede ser una sorpresa</option>
            </select>
          </Field>
          <Field id="delivery-unit" label="Unidad / Apto (opcional)" error={err("delivery_unit")}>
            <input id="delivery-unit" value={details.delivery_unit} onChange={(e) => setDetail("delivery_unit", e.target.value)} maxLength={120} aria-invalid={invalid("delivery_unit")} className={INPUT} />
          </Field>
          <Field id="building-name" label="Edificio (opcional)" error={err("building_name")}>
            <input id="building-name" value={details.building_name} onChange={(e) => setDetail("building_name", e.target.value)} maxLength={120} aria-invalid={invalid("building_name")} className={INPUT} />
          </Field>
          <Field id="neighborhood" label="Barrio (opcional)" error={err("neighborhood")}>
            <input id="neighborhood" value={details.neighborhood} onChange={(e) => setDetail("neighborhood", e.target.value)} maxLength={120} aria-invalid={invalid("neighborhood")} className={INPUT} />
          </Field>
          <Field id="city" label="Ciudad (opcional)" error={err("city")}>
            <input id="city" value={details.city} onChange={(e) => setDetail("city", e.target.value)} maxLength={120} aria-invalid={invalid("city")} className={INPUT} />
          </Field>
        </div>
        <StepMessage message={messageFor("datos")} />
      </fieldset>

      {/* 5. Tarjeta, factura y cómo nos conoció */}
      <fieldset className={FIELDSET}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">5. Tarjeta, factura y cómo nos conoció</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="card-from" label="Tarjeta: de (opcional)" error={err("card_from")}>
            <input id="card-from" value={details.card_from} onChange={(e) => setDetail("card_from", e.target.value)} maxLength={100} aria-invalid={invalid("card_from")} className={INPUT} />
          </Field>
          <Field id="card-to" label="Tarjeta: para (opcional)" error={err("card_to")}>
            <input id="card-to" value={details.card_to} onChange={(e) => setDetail("card_to", e.target.value)} maxLength={100} aria-invalid={invalid("card_to")} className={INPUT} />
          </Field>
        </div>
        <Field id="card-message" label="Mensaje de la tarjeta (opcional)" error={err("card_message")}>
          <textarea id="card-message" rows={3} value={details.card_message} onChange={(e) => setDetail("card_message", e.target.value)} maxLength={1000} aria-invalid={invalid("card_message")} className={INPUT} />
        </Field>
        <Field id="special-notes" label="Observación especial (opcional)" error={err("special_notes")}>
          <textarea id="special-notes" rows={2} value={details.special_notes} onChange={(e) => setDetail("special_notes", e.target.value)} maxLength={1000} aria-invalid={invalid("special_notes")} className={INPUT} />
        </Field>

        <Field id="referral" label="¿Cómo nos conoció? (opcional)" error={err("referral_source")}>
          <select id="referral" value={details.referral_source} onChange={(e) => setDetail("referral_source", e.target.value)} aria-invalid={invalid("referral_source")} className={INPUT}>
            <option value="">Sin dato</option>
            {REFERRAL_SOURCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex min-h-11 items-center gap-2 text-sm text-admin-ink-secondary">
          <input
            type="checkbox"
            checked={details.wants_invoice === "si"}
            onChange={(e) => setDetail("wants_invoice", e.target.checked ? "si" : "no")}
            className="accent-admin-accent"
          />
          El comprador quiere factura electrónica
        </label>
        {details.wants_invoice === "si" ? (
          <div className="grid animate-view-in grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="invoice-legal-name" label="Razón social (opcional)" error={err("invoice_legal_name")}>
              <input id="invoice-legal-name" value={details.invoice_legal_name} onChange={(e) => setDetail("invoice_legal_name", e.target.value)} maxLength={150} aria-invalid={invalid("invoice_legal_name")} className={INPUT} />
            </Field>
            <Field id="invoice-tax-id" label="NIT / documento (opcional)" error={err("invoice_tax_id")} hint="Solo dígitos; el guion y el dígito de verificación son opcionales.">
              <input id="invoice-tax-id" value={details.invoice_tax_id} onChange={(e) => setDetail("invoice_tax_id", e.target.value)} aria-invalid={invalid("invoice_tax_id")} className={`${INPUT} font-admin-mono`} />
            </Field>
            <Field id="invoice-email" label="Correo de facturación (opcional)" error={err("invoice_email")}>
              <input id="invoice-email" type="email" value={details.invoice_email} onChange={(e) => setDetail("invoice_email", e.target.value)} maxLength={150} aria-invalid={invalid("invoice_email")} className={INPUT} />
            </Field>
          </div>
        ) : null}
      </fieldset>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-admin-ink-secondary">
          Total: <span className="font-admin-mono font-semibold text-admin-ink">{formatCop(totals.total)}</span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className={`${SECONDARY_BUTTON} border-transparent bg-admin-accent text-admin-accent-ink hover:opacity-90 disabled:opacity-60`}
        >
          {pending ? "Registrando…" : "Registrar pedido"}
        </button>
      </div>
    </form>
  );
}
