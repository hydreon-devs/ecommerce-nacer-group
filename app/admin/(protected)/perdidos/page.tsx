import type { Metadata } from "next";
import Link from "next/link";
import { getLostOrders } from "@/lib/data/orders";
import { splitLostOrders } from "@/lib/domain/lostFollowUp";
import { RefreshButton } from "../RefreshButton";
import { ResolveButton } from "./ResolveButton";
import { buildLostCard, type LostCard } from "./lostView";
import { BackLink } from "../ui/BackLink";
import { AddressLink, PhoneLink } from "../ui/ContactLinks";

export const metadata: Metadata = { title: "Pedidos perdidos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function LostCardView({ card, pending }: { card: LostCard; pending: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={card.href}
          className="inline-flex min-h-11 items-center font-admin-mono text-sm font-semibold text-admin-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        >
          {card.humanNumber}
        </Link>
        <span className="font-admin-mono text-sm text-admin-ink-secondary">{card.total}</span>
      </div>

      <p className="text-xs text-admin-ink-muted">
        Perdido el <span className="text-admin-ink-secondary">{card.lostOn}</span>
      </p>

      <p className="whitespace-pre-wrap break-words rounded-lg bg-admin-critical-bg px-2.5 py-1.5 text-sm text-admin-critical-fg">
        <span className="font-semibold">Motivo:</span> {card.reason}
      </p>

      {card.lines.length > 0 ? (
        <ul className="flex flex-col divide-y divide-admin-border border-y border-admin-border text-sm">
          {card.lines.map((line, i) => (
            <li key={`${line.sku}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 font-medium text-admin-ink">{line.name}</span>
              <span className="font-admin-mono text-admin-ink-secondary">
                <span className="sr-only">Cantidad: </span>×{line.qty}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-admin-ink-muted">Sin líneas de producto.</p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-admin-ink-secondary">
        <dt className="text-admin-ink-muted">Comprador:</dt>
        <dd className="break-words">{card.buyerName}</dd>
        <dt className="text-admin-ink-muted">Teléfono de quien compra:</dt>
        <dd>
          <PhoneLink phone={card.buyerPhone} who={card.buyerName} />
        </dd>
        <dt className="text-admin-ink-muted">Recibe:</dt>
        <dd className="break-words">{card.recipient}</dd>
        <dt className="text-admin-ink-muted">Teléfono de quien recibe:</dt>
        <dd>
          <PhoneLink phone={card.recipientPhone} who={card.recipient} />
        </dd>
        <dt className="text-admin-ink-muted">Dirección:</dt>
        <dd>
          <AddressLink address={card.address} />
        </dd>
      </dl>

      {card.resolution ? (
        <div className="rounded-lg bg-admin-surface-sunken px-2.5 py-2 text-sm text-admin-ink-secondary">
          <p>
            <span className="font-semibold text-admin-ink">{card.resolution.label}</span> ·{" "}
            {card.resolution.date}
          </p>
          {card.resolution.note ? (
            <p className="mt-1 whitespace-pre-wrap break-words">{card.resolution.note}</p>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <div className="mt-auto flex flex-wrap gap-2">
          <ResolveButton orderId={card.id} humanNumber={card.humanNumber} />
        </div>
      ) : null}
    </div>
  );
}

function LostSection({
  title,
  cards,
  empty,
  pending,
}: {
  title: string;
  cards: LostCard[];
  empty: string;
  pending: boolean;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-admin-ink">
        {title} <span className="font-admin-mono text-admin-ink-muted">({cards.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <LostCardView key={card.id} card={card} pending={pending} />
        ))}
        {cards.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-admin-ink-muted">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

export default async function PerdidosPage() {
  const now = new Date();
  const loaded = await getLostOrders();
  // La consulta ya ordena; se vuelve a aplicar la regla del dominio como única fuente del orden.
  const { pending, resolved } = splitLostOrders([...loaded.pending, ...loaded.resolved]);
  const toCards = (orders: typeof pending) => orders.map((order) => buildLostCard(order, now));

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <BackLink href="/admin/despachos">Despachos</BackLink>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-admin-ink">Pedidos perdidos</h1>
            <p className="text-sm text-admin-ink-muted">
              Seguimiento de los pedidos pagados que se perdieron y cómo se resolvió cada uno.
            </p>
          </div>
          <RefreshButton />
        </div>
      </header>

      <LostSection
        title="Por resolver"
        cards={toCards(pending)}
        empty="No hay pedidos perdidos por resolver."
        pending
      />
      <LostSection
        title="Resueltos"
        cards={toCards(resolved)}
        empty="Todavía no hay pedidos perdidos resueltos."
        pending={false}
      />
    </div>
  );
}
