import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";
import { StaffFieldsInput } from "../StaffFieldsInput";

export const metadata: Metadata = { title: "Detalle de pedido — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const CARD_CLASS =
  "rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const waitingForCustomer = order.status === "pagado" && !order.saleDetails?.submitted_at;

  return (
    <div className="animate-view-in flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-admin-mono text-xl font-bold tracking-tight text-admin-ink">
          Pedido {order.human_number}
        </h1>
        <p className="text-sm text-admin-ink-muted">Chat: {order.chat_id}</p>
      </div>

      <section className={CARD_CLASS}>
        <h2 className="mb-2 text-sm font-semibold text-admin-ink">Gestión interna</h2>
        <p className="mb-2 text-xs text-admin-ink-muted">
          Texto libre — la artesana los registra hoy a mano (sin catálogo de asesores/
          proveedores todavía).
        </p>
        <StaffFieldsInput
          orderId={order.id}
          advisorName={order.advisor_name}
          supplierName={order.supplier_name}
        />
      </section>

      {waitingForCustomer ? (
        <p className="rounded-lg bg-admin-warning-bg px-3 py-2 text-sm text-admin-warning-fg">
          Esperando datos del cliente — el formulario posventa todavía no se ha llenado. No
          confundir con la fase de cumplimiento: son ejes distintos.
        </p>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="mb-2 text-sm font-semibold text-admin-ink">Entrega y ocasión</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm text-admin-ink-secondary">
          <dt className="text-admin-ink-muted">Tipo de envío</dt>
          <dd>{order.delivery_method ?? "—"}</dd>
          <dt className="text-admin-ink-muted">KM / costo domicilio</dt>
          <dd className="font-admin-mono">
            {order.delivery_distance_km ?? "—"} km — {formatCop(order.delivery_fee)}
          </dd>
          <dt className="text-admin-ink-muted">Fecha de entrega</dt>
          <dd>
            {order.desired_delivery_date
              ? new Date(order.desired_delivery_date).toLocaleDateString("es-CO")
              : "—"}
          </dd>
          <dt className="text-admin-ink-muted">Ocasión</dt>
          <dd>{order.occasion ?? "—"}</dd>
        </dl>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-2 text-sm font-semibold text-admin-ink">Líneas</h2>
        <ul className="flex flex-col gap-1 text-sm text-admin-ink-secondary">
          {order.lines.map((line) => (
            <li key={line.variantSku} className="flex justify-between gap-4">
              <span>
                {line.productName} ({line.variantSku}) × {line.qty}
              </span>
              <span className="shrink-0 font-admin-mono text-admin-ink">
                {formatCop(line.totalPrice)}
              </span>
            </li>
          ))}
          {order.lines.length === 0 ? (
            <li className="text-admin-ink-muted">Sin líneas consumidas.</li>
          ) : null}
        </ul>
        <div className="mt-3 flex justify-between border-t border-admin-border pt-2 text-sm font-semibold text-admin-ink">
          <span>Total (con envío)</span>
          <span className="font-admin-mono">{formatCop(order.grand_total)}</span>
        </div>
      </section>

      {order.saleDetails?.submitted_at ? (
        <section className={CARD_CLASS}>
          <h2 className="mb-2 text-sm font-semibold text-admin-ink">
            Datos de entrega y facturación (solo lectura)
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-admin-ink-secondary">
            <dt className="text-admin-ink-muted">Comprador</dt>
            <dd>
              {order.saleDetails.buyer_name} — {order.saleDetails.buyer_email}
            </dd>

            <dt className="text-admin-ink-muted">Destinatario</dt>
            <dd>
              {order.saleDetails.recipient_name} — {order.saleDetails.recipient_phone}
              {order.saleDetails.may_call_recipient ? " (se puede llamar)" : ""}
            </dd>

            <dt className="text-admin-ink-muted">Dirección</dt>
            <dd>
              {[
                order.saleDetails.delivery_address_exact,
                order.saleDetails.delivery_unit,
                order.saleDetails.neighborhood,
                order.saleDetails.city,
                order.saleDetails.building_name,
              ]
                .filter(Boolean)
                .join(", ")}
            </dd>

            {order.saleDetails.card_from || order.saleDetails.card_message ? (
              <>
                <dt className="text-admin-ink-muted">Tarjeta</dt>
                <dd>
                  De {order.saleDetails.card_from} para {order.saleDetails.card_to}
                  {order.saleDetails.card_message ? `: "${order.saleDetails.card_message}"` : ""}
                </dd>
              </>
            ) : null}

            {order.saleDetails.special_notes ? (
              <>
                <dt className="text-admin-ink-muted">Notas</dt>
                <dd>{order.saleDetails.special_notes}</dd>
              </>
            ) : null}

            {order.saleDetails.wants_invoice ? (
              <>
                <dt className="text-admin-ink-muted">Facturación</dt>
                <dd>
                  {order.saleDetails.invoice_legal_name} — {order.saleDetails.invoice_tax_id} —{" "}
                  {order.saleDetails.invoice_email}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
