import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStockItemBySku, type StockItemUsage } from "@/lib/data/stock-items";
import { ActionStatus } from "../../../ui/ActionStatus";
import { BackLink } from "../../../ui/BackLink";
import { InventoryTabs } from "../../InventoryTabs";
import { StockItemForm } from "../StockItemForm";
import { StockItemPhoto } from "./StockItemPhoto";
import { StockItemControls } from "./StockItemControls";

export const metadata: Metadata = { title: "Insumo — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export default async function InsumoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ foto?: string }>;
}) {
  const { sku } = await params;
  const { foto } = await searchParams;
  const detail = await getStockItemBySku(decodeURIComponent(sku));
  if (!detail) notFound();
  const { item, usage, movements } = detail;

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <InventoryTabs active="insumos" />
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/productos/insumos">Insumos</BackLink>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">{item.name}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-admin-ink-muted">
            <span className="font-admin-mono">{item.sku}</span>
            <span aria-hidden="true">·</span>
            <span>{item.kind === "self" ? "Espejo de variante" : "Insumo"}</span>
            {item.isActive ? null : (
              <span className="rounded-full bg-admin-warning-bg px-2 py-0.5 text-admin-warning-fg">
                Inactivo
              </span>
            )}
          </p>
        </div>
      </div>

      {foto === "error" ? (
        <ActionStatus
          message={{
            tone: "warn",
            text: "El insumo se creó, pero no se pudo subir la foto. Puedes agregarla aquí abajo.",
          }}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 md:col-span-3">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-admin-ink">Datos</h2>
            <StockItemForm item={item} />
          </section>

          <UsageSection usage={usage} />
        </div>

        <div className="flex min-w-0 flex-col gap-6 md:col-span-2">
          <StockItemPhoto itemId={item.id} name={item.name} imageUrl={item.imageUrl} />

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-admin-ink">Stock</h2>
            <StockItemControls
              item={{
                id: item.id,
                sku: item.sku,
                stockQty: item.stockQty,
                reserved: item.reserved,
                available: item.available,
                isActive: item.isActive,
                unit: item.unit,
              }}
            />
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-admin-ink">Movimientos recientes</h2>
        <div className="overflow-x-auto rounded-xl border border-transparent bg-admin-surface-raised shadow-admin-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-admin-border text-xs text-admin-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">Cambio</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium">Por</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-admin-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-admin-ink-muted">
                    {dateFmt.format(new Date(m.createdAt))}
                  </td>
                  <td className="px-3 py-2 text-right font-admin-mono">
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="px-3 py-2 text-right font-admin-mono">{m.stockAfter}</td>
                  <td className="px-3 py-2 text-admin-ink-secondary">{m.reason}</td>
                  <td className="px-3 py-2 text-xs text-admin-ink-muted">{m.createdBy ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-admin-ink-muted">
                    Sin movimientos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UsageSection({ usage }: { usage: StockItemUsage }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-admin-ink">Usado en</h2>
      {usage.products.length + usage.options.length === 0 ? (
        <p className="rounded-xl bg-admin-surface-raised p-4 text-sm text-admin-ink-muted shadow-admin-card">
          Ninguna receta lo usa todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 rounded-xl bg-admin-surface-raised p-4 text-sm text-admin-ink-secondary shadow-admin-card">
          {usage.products.map((p) => (
            <li key={`p-${p.productSku}`}>
              {p.productName}
              {p.uniformQty !== null ? ` × ${p.uniformQty}` : ""}
              {p.showVariants
                ? ` (${p.variants
                    .map((v) => `${v.label || "Única"}${p.uniformQty === null ? ` × ${v.qtyRequired}` : ""}`)
                    .join(", ")})`
                : ""}
            </li>
          ))}
          {usage.options.map((o, i) => (
            <li key={`o-${i}`}>
              Adicional «{o.name}»{o.productName ? ` de ${o.productName}` : ""} × {o.qtyRequired}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
