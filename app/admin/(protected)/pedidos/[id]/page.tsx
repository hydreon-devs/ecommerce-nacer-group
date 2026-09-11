import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";

export const metadata: Metadata = { title: "Detalle de pedido — Panel Nacer Group" };
export const dynamic = "force-dynamic";

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
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pedido {order.id.slice(0, 8)}</h1>
        <p className="text-sm text-slate-500">Chat: {order.chat_id}</p>
      </div>

      {waitingForCustomer ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esperando datos del cliente — el formulario posventa todavía no se ha llenado. No
          confundir con la fase de cumplimiento: son ejes distintos (plan §4.1).
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Líneas</h2>
        <ul className="flex flex-col gap-1 text-sm text-slate-700">
          {order.lines.map((line) => (
            <li key={line.variantSku} className="flex justify-between gap-4">
              <span>
                {line.productName} ({line.variantSku}) × {line.qty}
              </span>
              <span className="shrink-0">{formatCop(line.totalPrice)}</span>
            </li>
          ))}
          {order.lines.length === 0 ? (
            <li className="text-slate-400">Sin líneas consumidas.</li>
          ) : null}
        </ul>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-900">
          <span>Total (con envío)</span>
          <span>{formatCop(order.grand_total)}</span>
        </div>
      </section>

      {order.saleDetails?.submitted_at ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Datos de entrega y facturación (solo lectura)
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-slate-700">
            <dt className="text-slate-500">Comprador</dt>
            <dd>
              {order.saleDetails.buyer_name} — {order.saleDetails.buyer_email}
            </dd>

            <dt className="text-slate-500">Destinatario</dt>
            <dd>
              {order.saleDetails.recipient_name} — {order.saleDetails.recipient_phone}
              {order.saleDetails.may_call_recipient ? " (se puede llamar)" : ""}
            </dd>

            <dt className="text-slate-500">Dirección</dt>
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
                <dt className="text-slate-500">Tarjeta</dt>
                <dd>
                  De {order.saleDetails.card_from} para {order.saleDetails.card_to}
                  {order.saleDetails.card_message ? `: "${order.saleDetails.card_message}"` : ""}
                </dd>
              </>
            ) : null}

            {order.saleDetails.special_notes ? (
              <>
                <dt className="text-slate-500">Notas</dt>
                <dd>{order.saleDetails.special_notes}</dd>
              </>
            ) : null}

            {order.saleDetails.wants_invoice ? (
              <>
                <dt className="text-slate-500">Facturación</dt>
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
