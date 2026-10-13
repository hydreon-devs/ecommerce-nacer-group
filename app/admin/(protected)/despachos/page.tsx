import type { Metadata } from "next";
import { getDispatchOrders } from "@/lib/data/orders";
import { sortByDesiredDate } from "@/lib/domain/fulfillmentFlow";
import { AdvanceOrderButton } from "../AdvanceOrderButton";
import { RefreshButton } from "../RefreshButton";
import { DASH } from "../pedidos/orderView";
import { buildDispatchCard, type DispatchCard } from "./dispatchView";

export const metadata: Metadata = { title: "Despachos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function DispatchSection({
  title,
  cards,
  empty,
}: {
  title: string;
  cards: DispatchCard[];
  empty: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-admin-ink">
        {title} <span className="font-admin-mono text-admin-ink-muted">({cards.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-admin-mono text-sm font-semibold text-admin-ink">
                {card.humanNumber}
              </span>
              <span className="rounded-full bg-admin-surface-sunken px-2.5 py-1 text-[11px] font-semibold text-admin-ink-secondary">
                {card.deliveryMethod}
              </span>
            </div>

            <p className="text-sm font-medium text-admin-ink">{card.productSummary}</p>

            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
              <dt className="text-admin-ink-muted">Entrega:</dt>
              <dd className="font-admin-mono">{card.desiredDate}</dd>
              <dt className="text-admin-ink-muted">Recibe:</dt>
              <dd>{card.recipient}</dd>
              <dt className="text-admin-ink-muted">Teléfono:</dt>
              <dd className="font-admin-mono">{card.recipientPhone}</dd>
              <dt className="text-admin-ink-muted">Dirección:</dt>
              <dd className={card.address === DASH ? "text-admin-ink-muted" : ""}>{card.address}</dd>
            </dl>

            {card.step ? (
              <div className="mt-auto">
                <AdvanceOrderButton orderId={card.id} label={card.step.label} />
              </div>
            ) : null}
          </div>
        ))}
        {cards.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-admin-ink-muted">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

export default async function DespachosPage() {
  const { ready, inDispatch } = await getDispatchOrders();
  const toCards = (orders: typeof ready) => sortByDesiredDate(orders).map(buildDispatchCard);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Despachos</h1>
          <p className="text-sm text-admin-ink-muted">
            Pedidos preparados para entregar, por fecha de entrega más próxima.
          </p>
        </div>
        <RefreshButton />
      </div>

      <DispatchSection
        title="Listos para despacho"
        cards={toCards(ready)}
        empty="No hay pedidos preparados esperando despacho."
      />
      <DispatchSection
        title="En despacho"
        cards={toCards(inDispatch)}
        empty="No hay pedidos en camino."
      />
    </div>
  );
}
