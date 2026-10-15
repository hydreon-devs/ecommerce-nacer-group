import type { Metadata } from "next";
import Link from "next/link";
import { countUnresolvedLostOrders, getDispatchOrders } from "@/lib/data/orders";
import {
  countReadyByFilter,
  filterReady,
  parseDispatchFilter,
  splitReadyByDelivery,
  type DispatchFilter,
} from "@/lib/domain/dispatch";
import { sortByDesiredDate } from "@/lib/domain/fulfillmentFlow";
import { bogotaToday } from "@/lib/domain/productionDay";
import { AdvanceOrderButton } from "../AdvanceOrderButton";
import { RefreshButton } from "../RefreshButton";
import { AddressLink, PhoneLink } from "../ui/ContactLinks";
import { LostButton } from "./LostButton";
import { ReadyFilter } from "./ReadyFilter";
import { buildDispatchCard, type DateTone, type DispatchCard } from "./dispatchView";

export const metadata: Metadata = { title: "Despachos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const DATE_TONE_CLASS: Record<DateTone, string> = {
  today: "bg-admin-accent-wash text-admin-accent",
  overdue: "bg-admin-critical-bg text-admin-critical-fg",
  upcoming: "bg-admin-surface-sunken text-admin-ink-secondary",
  none: "bg-admin-surface-sunken text-admin-ink-muted",
};

const READY_EMPTY: Record<DispatchFilter, string> = {
  hoy: "No hay pedidos para despachar hoy.",
  proximos: "No hay pedidos listos con fecha posterior a hoy.",
  todos: "No hay pedidos preparados esperando despacho.",
};

function DispatchCardView({ card, inDispatch }: { card: DispatchCard; inDispatch: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-admin-mono text-sm font-semibold text-admin-ink">N° de pedido: {card.humanNumber}</span>
        <span className="rounded-full bg-admin-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-admin-ink-secondary">
          {card.deliveryMethod}
        </span>
      </div>

      <span
        className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${DATE_TONE_CLASS[card.dateBadge.tone]}`}
      >
        {card.dateBadge.text}
      </span>

      {card.lines.length > 0 ? (
        <ul className="flex flex-col divide-y divide-admin-border border-y border-admin-border text-sm">
          {card.lines.map((line, i) => (
            <li key={`${line.sku}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-admin-ink">{line.name}</span>
              </span>
              <span className="font-admin-mono text-admin-ink-secondary">
                <span className="sr-only">Cantidad: </span>×{line.qty}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-admin-ink-muted">Sin líneas de producto.</p>
      )}

      {card.gift ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
          <dt className="text-admin-ink-muted">De:</dt>
          <dd className="break-words">{card.gift.from}</dd>
          <dt className="text-admin-ink-muted">Para:</dt>
          <dd className="break-words">{card.gift.to}</dd>
        </dl>
      ) : null}

      {card.specialNote ? (
        <p className="whitespace-pre-wrap break-words rounded-lg bg-admin-warning-bg px-2.5 py-1.5 text-xs text-admin-warning-fg">
          <span className="font-semibold">Observación especial:</span> {card.specialNote}
        </p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
        <dt className="text-admin-ink-muted">Recibe:</dt>
        <dd>{card.recipient}</dd>
        <dt className="text-admin-ink-muted">Teléfono de quien recibe:</dt>
        <dd>
          <PhoneLink phone={card.recipientPhone} who={card.recipient} />
        </dd>
        <dt className="text-admin-ink-muted">Dirección:</dt>
        <dd>
          <AddressLink address={card.address} />
        </dd>
      </dl>

      {card.step ? (
        <div className="mt-auto flex flex-wrap gap-2">
          <AdvanceOrderButton
            orderId={card.id}
            label={inDispatch ? "Entregado" : card.step.label}
            confirm={
              inDispatch
                ? {
                    title: `¿Marcar el pedido ${card.humanNumber} como entregado?`,
                    description: "No se puede deshacer.",
                  }
                : undefined
            }
          />
          {inDispatch && card.canMarkLost ? (
            <LostButton orderId={card.id} humanNumber={card.humanNumber} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DispatchSection({
  title,
  cards,
  empty,
  inDispatch,
  controls,
  level = 2,
}: {
  title: string;
  cards: DispatchCard[];
  empty: string;
  inDispatch: boolean;
  controls?: React.ReactNode;
  /** Nivel del encabezado: 3 para los grupos dentro de "Listos para despacho". */
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading className={`font-semibold text-admin-ink ${level === 2 ? "text-sm" : "text-[13px]"}`}>
          {title} <span className="font-admin-mono text-admin-ink-muted">({cards.length})</span>
        </Heading>
        {controls}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <DispatchCardView key={card.id} card={card} inDispatch={inDispatch} />
        ))}
        {cards.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-admin-ink-muted">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * "Listos para despacho": domicilio y recogida en tienda por separado. Si el
 * filtro no deja ningún pedido, un solo mensaje en lugar de dos grupos vacíos.
 */
function ReadySection({
  delivery,
  pickup,
  empty,
  controls,
}: {
  delivery: DispatchCard[];
  pickup: DispatchCard[];
  empty: string;
  controls: React.ReactNode;
}) {
  const title = "Listos para despacho";
  if (delivery.length === 0 && pickup.length === 0) {
    return <DispatchSection title={title} cards={[]} empty={empty} inDispatch={false} controls={controls} />;
  }
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-admin-ink">
          {title}{" "}
          <span className="font-admin-mono text-admin-ink-muted">({delivery.length + pickup.length})</span>
        </h2>
        {controls}
      </div>
      <DispatchSection
        title="Para domicilio"
        cards={delivery}
        empty="No hay pedidos listos para domicilio con este filtro."
        inDispatch={false}
        level={3}
      />
      <DispatchSection
        title="Recogen en tienda"
        cards={pickup}
        empty="No hay pedidos listos para recoger en tienda con este filtro."
        inDispatch={false}
        level={3}
      />
    </section>
  );
}

export default async function DespachosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const today = bogotaToday(new Date());
  const filter = parseDispatchFilter(params.listos);

  const [{ ready, inDispatch }, unresolvedLost] = await Promise.all([
    getDispatchOrders(),
    countUnresolvedLostOrders(),
  ]);
  const toCards = (orders: typeof ready) =>
    sortByDesiredDate(orders).map((order) => buildDispatchCard(order, today));

  const { delivery, pickup } = splitReadyByDelivery(filterReady(ready, filter, today));

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Despachos</h1>
          <p className="text-sm text-admin-ink-muted">
            Lo que sale hoy y lo que va en camino, por fecha de entrega más próxima.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin/perdidos"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
          >
            Pedidos perdidos
            {unresolvedLost !== null ? (
              <span
                className={`rounded-full px-2 py-0.5 font-admin-mono text-xs ${
                  unresolvedLost > 0
                    ? "bg-admin-warning-bg font-semibold text-admin-warning-fg"
                    : "bg-admin-surface-sunken text-admin-ink"
                }`}
              >
                <span className="sr-only">Por resolver: </span>
                {unresolvedLost}
              </span>
            ) : null}
          </Link>
          <RefreshButton />
        </div>
      </div>

      <ReadySection
        delivery={toCards(delivery)}
        pickup={toCards(pickup)}
        empty={READY_EMPTY[filter]}
        controls={<ReadyFilter filter={filter} counts={countReadyByFilter(ready, today)} />}
      />
      <DispatchSection
        title="En despacho"
        cards={toCards(inDispatch)}
        empty="No hay pedidos en camino."
        inDispatch
      />
    </div>
  );
}
