import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStockItemBySku } from "@/lib/data/stock-items";
import { BackLink } from "../../../ui/BackLink";
import { InventoryTabs } from "../../InventoryTabs";
import { StockItemForm } from "../StockItemForm";
import { StockItemControls } from "./StockItemControls";

export const metadata: Metadata = { title: "Insumo — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export default async function InsumoDetailPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const detail = await getStockItemBySku(decodeURIComponent(sku));
  if (!detail) notFound();
  const { item, usage, movements } = detail;

  return (
    <div className="animate-view-in flex max-w-3xl flex-col gap-6">
      <InventoryTabs active="insumos" />
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/productos/insumos">Insumos</BackLink>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">{item.name}</h1>
          <p className="text-xs text-admin-ink-muted">
            {item.kind === "self" ? "Espejo de variante" : "Insumo"}
            {item.isActive ? "" : " · inactivo"}
          </p>
        </div>
      </div>

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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-admin-ink">Datos</h2>
        <StockItemForm item={item} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-admin-ink">Usado en</h2>
        {usage.products.length + usage.options.length === 0 ? (
          <p className="text-sm text-admin-ink-muted">Ninguna receta lo usa todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-admin-ink-secondary">
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-admin-ink">Movimientos recientes</h2>
        <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface-raised">
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
