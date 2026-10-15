import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/data/orders";
import {
  BuyerSection,
  CardSection,
  DeliverySection,
  InvoiceSection,
  PaymentSection,
  ProductsSection,
} from "./OrderDetailSections";
import { DASH } from "../orderView";
import { buildOrderDetailView, type StatusIndicator } from "./orderDetail";
import { BackLink } from "../../ui/BackLink";

export const metadata: Metadata = { title: "Detalle de pedido — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function Indicator({ item }: { item: StatusIndicator }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-xs text-admin-ink-muted">{item.label}</dt>
      <dd>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.pillClass}`}
        >
          {item.value}
        </span>
      </dd>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const view = buildOrderDetailView(order);

  return (
    <div className="animate-view-in flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <BackLink href="/admin/pedidos">Pedidos</BackLink>
        <div>
          <h1 className="font-admin-mono text-xl font-bold tracking-tight text-admin-ink">
            Pedido {view.humanNumber}
          </h1>
          <p className="text-sm text-admin-ink-muted">{view.dateLine}</p>
        </div>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {view.strip.map((key) => {
            switch (key) {
              case "state":
                return (
                  <div key={key} className="flex items-center gap-2">
                    <dt className="text-xs text-admin-ink-muted">Estado</dt>
                    <dd>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${view.state.pillClass}`}
                      >
                        {view.state.value}
                      </span>
                    </dd>
                  </div>
                );
              case "invoice":
                return <Indicator key={key} item={view.invoiceStatus} />;
              case "seller":
                return (
                  <div key={key} className="flex min-w-0 items-baseline gap-2">
                    <dt className="text-xs text-admin-ink-muted">{view.seller.label}</dt>
                    <dd
                      className={`min-w-0 break-words text-sm ${
                        view.seller.value === DASH
                          ? "text-admin-ink-muted"
                          : "text-admin-ink-secondary"
                      }`}
                    >
                      {view.seller.value}
                    </dd>
                  </div>
                );
            }
          })}
        </dl>
      </header>

      {view.lostReason ? (
        <p className="rounded-lg bg-admin-critical-bg px-3 py-2 text-sm text-admin-critical-fg">
          <span className="font-semibold">Motivo de la pérdida:</span>{" "}
          <span className="whitespace-pre-wrap break-words">{view.lostReason}</span>
        </p>
      ) : null}

      {view.lostResolution ? (
        <p className="rounded-lg bg-admin-surface-sunken px-3 py-2 text-sm text-admin-ink-secondary">
          <span className="font-semibold text-admin-ink">Resolución:</span> {view.lostResolution.label} ·{" "}
          {view.lostResolution.date}
          {view.lostResolution.note ? (
            <>
              {" "}
              <span className="whitespace-pre-wrap break-words">{view.lostResolution.note}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {view.waitingForCustomer ? (
        <p className="rounded-lg bg-admin-warning-bg px-3 py-2 text-sm text-admin-warning-fg">
          El pedido está pagado, pero el cliente todavía no llena el formulario posventa. Faltan
          el destinatario, la dirección y la tarjeta.
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <ProductsSection view={view} />
          <CardSection view={view} />
          <DeliverySection view={view} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <PaymentSection view={view} />
          <BuyerSection view={view} />
          <InvoiceSection view={view} />
        </div>
      </div>
    </div>
  );
}
