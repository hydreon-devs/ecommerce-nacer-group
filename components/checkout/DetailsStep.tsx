"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  DETAILS_PAGE_COUNT,
  detailsPages,
  isSoberOccasion,
  LIMITS,
  OCCASIONS,
  OCCASION_LABELS,
  REFERRAL_SOURCES,
  validateDetailsPage,
  YES_NO,
  type DeliveryMethod,
  type DetailsDraft,
  type DetailsPageNumber,
} from "@/lib/domain/checkout/saleDetails";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "./DetailsFields";
import { PageTransition } from "./PageTransition";
import { Reveal } from "./Reveal";
import { PRIMARY, SECONDARY } from "./formStyles";

interface Props {
  method: DeliveryMethod;
  details: DetailsDraft;
  page: DetailsPageNumber;
  /** Messages from the server for fields the client validation let through. */
  serverErrors: Record<string, string>;
  /** A message to show above the form (a server-routed problem). */
  notice: string | null;
  submitting: boolean;
  /** A "try again" message from the last submission (network, rate limit). */
  submitError: string | null;
  onChange: (patch: Partial<DetailsDraft>) => void;
  onPageChange: (page: DetailsPageNumber) => void;
  onBackToDelivery: () => void;
  /** Called from the last page, after the whole page validated. */
  onSubmit: () => void;
}

const SECTION_NOTE = "mt-1 font-body text-sm text-ink-muted";

/**
 * Checkout step 2, "Tus datos", in four sub-pages with progress ("1 de 4").
 * Each page validates before advancing; the heading takes focus on every
 * page change. Spanish copy is the one of the WhatsApp form (spec 015 RF-14,
 * n8n "Armar Página de Datos"). Address-related fields are NOT asked here:
 * they belong to step 1.
 */
export function DetailsStep({
  method,
  details,
  page,
  serverErrors,
  notice,
  submitting,
  submitError,
  onChange,
  onPageChange,
  onBackToDelivery,
  onSubmit,
}: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const pages = detailsPages(method);
  const current = pages[page - 1];
  const pickup = method === "tienda";

  // Focus moves to the page heading whenever the sub-page changes (and on entry).
  useEffect(() => {
    headingRef.current?.focus();
  }, [page]);

  const validation = validateDetailsPage(page, details, method);
  const clientErrors = validation.ok ? {} : validation.errors;
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const errorFor = (field: string) =>
    (touched.has(field) ? clientErrors[field] : undefined) ?? serverErrors[field];

  const common = (name: keyof DetailsDraft) => ({
    uid,
    name,
    error: errorFor(name),
    onBlur: () => touch(name),
  });

  // The server can flag a field whose page we are not on yet; show it when we get there.
  const pageHasServerError = current.fields.some((f) => serverErrors[f]);

  function focusFirstInvalid(fields: string[]) {
    const first = current.fields.find((f) => fields.includes(f));
    if (!first) return;
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] select`,
        )
        ?.focus();
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!validation.ok) {
      setTouched((prev) => new Set([...prev, ...current.fields]));
      focusFirstInvalid(Object.keys(validation.errors));
      return;
    }
    if (page < DETAILS_PAGE_COUNT) {
      onPageChange((page + 1) as DetailsPageNumber);
      return;
    }
    onSubmit();
  }

  const sober = isSoberOccasion(details.occasion);
  const lastPage = page === DETAILS_PAGE_COUNT;
  const notesLabel = "Observación especial (opcional)";
  const notesField = (
    <TextAreaField
      {...common("special_notes")}
      label={notesLabel}
      value={details.special_notes}
      onChange={(special_notes) => onChange({ special_notes })}
      limit={LIMITS.longText}
      placeholder={
        pickup
          ? "Ej. Paso a recogerlo el viernes por la tarde"
          : "Ej. Entregar después de las 2 p.m. si es posible"
      }
    />
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby={`${uid}-title`}>
      <div className="flex items-center gap-3">
        <p className="font-body text-xs uppercase tracking-[0.16em] text-moss">
          Paso 2 · {page} de {DETAILS_PAGE_COUNT}
        </p>
        <div aria-hidden="true" className="flex flex-1 gap-1.5">
          {pages.map((p) => (
            <span
              key={p.number}
              className={`h-1 flex-1 rounded-full ${p.number <= page ? "bg-moss" : "bg-ink/15"}`}
            />
          ))}
        </div>
      </div>
      <h2
        id={`${uid}-title`}
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-display text-2xl text-ink outline-none md:text-3xl"
      >
        {current.title}
      </h2>

      {notice && (
        <p role="alert" className="mt-4 rounded-xl border border-amber/60 bg-amber/10 p-4 font-body text-sm text-ink">
          {notice}
        </p>
      )}
      {pageHasServerError && !notice && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/5 p-4 font-body text-sm text-ink">
          Revisa los datos señalados para continuar.
        </p>
      )}

      <PageTransition pageKey={`details-${page}`} sober={sober}>
        <div className="mt-4 space-y-5">
          {page === 1 && (
            <>
              <p className={SECTION_NOTE}>Cuéntanos quién hace el pedido.</p>
              <TextField
                {...common("buyer_name")}
                label="Nombre completo de quien compra"
                value={details.buyer_name}
                onChange={(buyer_name) => onChange({ buyer_name })}
                placeholder="Ej. Ana Restrepo Gómez"
                autoComplete="name"
                required
              />
              <TextField
                {...common("buyer_phone")}
                label="Tu celular"
                type="tel"
                inputMode="tel"
                value={details.buyer_phone}
                onChange={(buyer_phone) => onChange({ buyer_phone })}
                placeholder="Ej. 300 123 4567, o +1 305 555 0100 si no es de Colombia"
                autoComplete="tel"
                required
              />
              <TextField
                {...common("buyer_email")}
                label="Correo electrónico (opcional)"
                type="email"
                inputMode="email"
                value={details.buyer_email}
                onChange={(buyer_email) => onChange({ buyer_email })}
                placeholder="Ej. ana@correo.com"
                autoComplete="email"
              />
            </>
          )}

          {page === 2 && (
            <>
              <p className={SECTION_NOTE}>
                {pickup
                  ? "Puede ser otra persona distinta de ti. Y si es sorpresa, se mantiene: al llamar solo decimos que hay un regalo, nunca de parte de quién ni de qué empresa."
                  : "Si es un regalo, aquí van los datos de la persona que lo recibe, no los tuyos. Y si es sorpresa, se mantiene: al llamar solo decimos que llevamos un regalo, nunca de parte de quién ni de qué empresa."}
              </p>
              <TextField
                {...common("recipient_name")}
                label="Nombre de quien recibe o recoge"
                value={details.recipient_name}
                onChange={(recipient_name) => onChange({ recipient_name })}
                placeholder={pickup ? "Ej. Juan Pérez" : "Ej. Luisa Gómez"}
                required
              />
              <TextField
                {...common("recipient_phone")}
                label="Teléfono de quien recibe o recoge"
                type="tel"
                inputMode="tel"
                value={details.recipient_phone}
                onChange={(recipient_phone) => onChange({ recipient_phone })}
                placeholder="Ej. 300 123 4567, o +1 305 555 0100 si no es de Colombia"
                autoComplete="off"
                required
              />
              <ChoiceGroup
                {...common("may_call_recipient")}
                label="¿Podemos llamar para confirmar que esté disponible?"
                value={details.may_call_recipient}
                onChange={(may_call_recipient) =>
                  onChange({ may_call_recipient: may_call_recipient as DetailsDraft["may_call_recipient"] })
                }
                options={YES_NO}
                required
              />
              {pickup && notesField}
            </>
          )}

          {page === 3 && (
            <>
              <p className={SECTION_NOTE}>
                Si no sabes qué escribir, déjalo en blanco y escríbenos por WhatsApp: te ayudamos a redactarlo.
              </p>
              <SelectField
                {...common("occasion")}
                label="¿Para qué ocasión es? (opcional)"
                value={details.occasion}
                onChange={(occasion) => onChange({ occasion: occasion as DetailsDraft["occasion"] })}
                placeholder="Elige una ocasión"
                options={OCCASIONS.map((o) => ({ value: o, label: OCCASION_LABELS[o] }))}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  {...common("card_from")}
                  label="De (opcional)"
                  value={details.card_from}
                  onChange={(card_from) => onChange({ card_from })}
                  placeholder="Ej. Mamá y papá"
                />
                <TextField
                  {...common("card_to")}
                  label="Para (opcional)"
                  value={details.card_to}
                  onChange={(card_to) => onChange({ card_to })}
                  placeholder="Ej. Luisa"
                />
              </div>
              <TextAreaField
                {...common("card_message")}
                label="Mensaje de la tarjeta (opcional)"
                value={details.card_message}
                onChange={(card_message) => onChange({ card_message })}
                limit={LIMITS.longText}
                rows={4}
                placeholder="Ej. Que este año florezcas como nunca."
              />
              {!pickup && notesField}
            </>
          )}

          {page === 4 && (
            <>
              <ChoiceGroup
                {...common("wants_invoice")}
                label="¿Deseas factura electrónica?"
                value={details.wants_invoice}
                onChange={(wants_invoice) =>
                  onChange(
                    wants_invoice === "No"
                      ? {
                          wants_invoice: "No",
                          invoice_legal_name: "",
                          invoice_tax_id: "",
                          invoice_email: "",
                        }
                      : { wants_invoice: wants_invoice as DetailsDraft["wants_invoice"] },
                  )
                }
                options={YES_NO}
                required
              />
              <Reveal show={details.wants_invoice === "Sí"} id="invoice">
                <div className="space-y-5">
                  <TextField
                    {...common("invoice_legal_name")}
                    label="Nombre completo o razón social"
                    value={details.invoice_legal_name}
                    onChange={(invoice_legal_name) => onChange({ invoice_legal_name })}
                    autoComplete="organization"
                    required
                  />
                  <TextField
                    {...common("invoice_tax_id")}
                    label="Cédula o NIT"
                    inputMode="text"
                    value={details.invoice_tax_id}
                    onChange={(invoice_tax_id) => onChange({ invoice_tax_id })}
                    placeholder="Ej. 1020304050 o 900123456-7"
                    required
                  />
                  <TextField
                    {...common("invoice_email")}
                    label="Correo para la factura"
                    type="email"
                    inputMode="email"
                    value={details.invoice_email}
                    onChange={(invoice_email) => onChange({ invoice_email })}
                    autoComplete="off"
                    required
                  />
                </div>
              </Reveal>
              <ChoiceGroup
                {...common("referral_source")}
                label="¿Por qué medio nos conociste? (opcional)"
                value={details.referral_source}
                onChange={(referral_source) =>
                  onChange({ referral_source: referral_source as DetailsDraft["referral_source"] })
                }
                options={REFERRAL_SOURCES}
                columns={3}
              />
              <div className="border-t border-ink/10 pt-4">
                <h3 className="font-display text-lg text-ink">Una última cosa</h3>
                <p className="mt-1 font-body text-xs leading-relaxed text-ink-muted">
                  Al enviar este formulario autorizas el tratamiento de los datos personales aquí registrados,
                  incluidos los de quien {pickup ? "recoge" : "recibe"} el pedido, conforme a la Ley 1581 de
                  2012. Los usamos únicamente para preparar y entregar tu pedido y facturarlo si lo pediste. No
                  los compartimos con terceros ajenos a la entrega. Puedes pedirnos consultarlos, corregirlos o
                  eliminarlos escribiéndonos por WhatsApp.
                </p>
              </div>
            </>
          )}
        </div>
      </PageTransition>

      <div role="status" aria-live="polite" className="empty:hidden">
        {submitError && <p className="mt-4 font-body text-sm text-danger">{submitError}</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={SECONDARY}
          disabled={submitting}
          aria-label={page === 1 ? "Atrás, volver a la entrega" : undefined}
          onClick={() => (page === 1 ? onBackToDelivery() : onPageChange((page - 1) as DetailsPageNumber))}
        >
          Atrás
        </button>
        <button type="submit" className={PRIMARY} disabled={submitting} aria-busy={submitting}>
          {lastPage ? (submitting ? "Confirmando tu pedido…" : "Confirmar pedido") : "Siguiente"}
        </button>
      </div>
    </form>
  );
}
