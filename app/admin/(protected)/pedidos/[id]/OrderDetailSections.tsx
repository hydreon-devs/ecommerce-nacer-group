import type { ReactNode } from "react";
import { DASH } from "../orderView";
import type { DetailField, OrderDetailView } from "./orderDetail";

/**
 * Presentational blocks of the order detail page, fed by `buildOrderDetailView`.
 * No data access and no formatting rules here.
 */

const CARD_CLASS =
  "rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]";

const LINK_CLASS =
  "break-words text-admin-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent";

const EMPTY_CLASS = "text-sm text-admin-ink-muted";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${CARD_CLASS} min-w-0`}>
      <h2 id={id} className="mb-3 text-sm font-semibold text-admin-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Value({ field }: { field: DetailField }) {
  const external = field.href?.startsWith("https://");
  return (
    <>
      {field.href ? (
        <a
          href={field.href}
          className={LINK_CLASS}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {field.value}
        </a>
      ) : (
        field.value
      )}
      {field.note ? (
        <span className="mt-0.5 block text-xs font-medium text-admin-warning-fg">{field.note}</span>
      ) : null}
    </>
  );
}

/** One datum per line: muted label above its value. */
function FieldList({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {fields.map((field, index) => (
        <div key={`${index}:${field.label}`}>
          <dt className="text-xs text-admin-ink-muted">{field.label}</dt>
          <dd
            className={`whitespace-pre-wrap break-words ${
              field.value === DASH ? "text-admin-ink-muted" : "text-admin-ink-secondary"
            } ${field.mono ? "font-admin-mono" : ""}`}
          >
            <Value field={field} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function plain(label: string, value: string, mono = false): DetailField {
  return { label, value, mono };
}

export function ProductsSection({ view }: { view: OrderDetailView }) {
  return (
    <Section id="productos" title="Productos">
      {view.lines.length === 0 ? (
        <p className={EMPTY_CLASS}>Este pedido no tiene productos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-admin-border">
          {view.lines.map((line) => (
            <li
              key={line.key}
              className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-admin-ink">{line.name}</p>
                <p className="break-words font-admin-mono text-xs text-admin-ink-muted">
                  {line.sku}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-admin-mono text-sm text-admin-ink">{line.total}</p>
                <p className="font-admin-mono text-xs text-admin-ink-muted">
                  {line.qty} × {line.unitPrice}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function CardSection({ view }: { view: OrderDetailView }) {
  const { card } = view;
  const people: DetailField[] = [];
  if (card.from) people.push(plain("De", card.from));
  if (card.to) people.push(plain("Para", card.to));

  return (
    <Section id="tarjeta" title="Tarjeta y mensaje">
      {card.hasContent ? (
        <div className="flex flex-col gap-3">
          {people.length > 0 ? <FieldList fields={people} /> : null}
          {card.message ? (
            <div>
              <h3 className="mb-1 text-xs text-admin-ink-muted">Mensaje</h3>
              <p className="whitespace-pre-wrap break-words rounded-lg bg-admin-surface-sunken px-3 py-2 text-sm text-admin-ink">
                {card.message}
              </p>
            </div>
          ) : null}
          {card.notes ? (
            <div>
              <h3 className="mb-1 text-xs text-admin-ink-muted">Observación especial</h3>
              <p className="whitespace-pre-wrap break-words text-sm text-admin-ink-secondary">
                {card.notes}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={EMPTY_CLASS}>
          {view.submitted
            ? "El cliente no pidió tarjeta ni dejó observaciones."
            : "Se llena cuando el cliente envíe el formulario posventa."}
        </p>
      )}
    </Section>
  );
}

export function DeliverySection({ view }: { view: OrderDetailView }) {
  const { delivery } = view;
  const fields: DetailField[] = [
    plain("Fecha de entrega", delivery.date, true),
    plain("Tipo de envío", delivery.method),
    plain("Ocasión", delivery.occasion),
    ...delivery.recipient,
    ...delivery.addressLines,
    plain(delivery.distanceLabel, delivery.distance, true),
  ];

  return (
    <Section id="entrega" title="Entrega y destinatario">
      <FieldList fields={fields} />
      {view.submitted ? null : (
        <p className={`${EMPTY_CLASS} mt-3`}>
          El destinatario y el detalle de la dirección llegan con el formulario posventa.
        </p>
      )}
    </Section>
  );
}

export function PaymentSection({ view }: { view: OrderDetailView }) {
  const { payment } = view;
  const rows: [string, string][] = [
    ["Subtotal productos", payment.subtotal],
    ["Domicilio", payment.deliveryFee],
  ];

  return (
    <Section id="pago" title="Resumen de pago">
      <dl className="flex flex-col gap-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-admin-ink-muted">{label}</dt>
            <dd className="font-admin-mono text-admin-ink-secondary">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-admin-border pt-2 font-semibold">
          <dt className="text-admin-ink">Total</dt>
          <dd className="font-admin-mono text-admin-ink">{payment.total}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <FieldList
          fields={[
            plain("Método de pago", payment.method),
            plain("Referencia de pago", payment.reference, true),
            plain("Monto pagado", payment.paidAmount, true),
          ]}
        />
      </div>
    </Section>
  );
}

export function BuyerSection({ view }: { view: OrderDetailView }) {
  return (
    <Section id="comprador" title="Comprador">
      <FieldList fields={view.buyer} />
      {view.submitted ? null : (
        <p className={`${EMPTY_CLASS} mt-3`}>
          Nombre, correo y canal de origen llegan con el formulario posventa.
        </p>
      )}
    </Section>
  );
}

export function InvoiceSection({ view }: { view: OrderDetailView }) {
  const { invoice } = view;
  return (
    <Section id="facturacion" title="Facturación">
      {invoice.state === "requested" ? (
        <FieldList fields={invoice.fields} />
      ) : (
        <p className={EMPTY_CLASS}>
          {invoice.state === "none"
            ? "El cliente no pidió factura."
            : "Se sabrá cuando el cliente envíe el formulario posventa."}
        </p>
      )}
    </Section>
  );
}
