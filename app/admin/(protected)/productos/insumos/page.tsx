import type { Metadata } from "next";
import Link from "next/link";
import { getRecentMovementsByItem, getStockItemUsage, getStockItems } from "@/lib/data/stock-items";
import { InventoryTabs } from "../InventoryTabs";
import { InsumoDetailsDialog } from "./InsumoDetailsDialog";

export const metadata: Metadata = { title: "Insumos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function chipClass(active: boolean) {
  return `rounded-full px-3 py-1 text-sm transition-colors duration-200 ${
    active
      ? "bg-admin-accent text-admin-accent-ink"
      : "bg-admin-surface-raised text-admin-ink-secondary ring-1 ring-admin-border hover:bg-admin-surface-sunken"
  }`;
}

export default async function InsumosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; demo?: string }>;
}) {
  const { estado, demo } = await searchParams;
  const [allItems, usage, movements] = await Promise.all([
    getStockItems(),
    getStockItemUsage(),
    getRecentMovementsByItem(3),
  ]);

  const items = allItems.filter((i) => {
    if (estado === "activos" && !i.isActive) return false;
    if (estado === "inactivos" && i.isActive) return false;
    if (demo === "solo" && !i.isDemo) return false;
    if (demo === "ocultar" && i.isDemo) return false;
    return true;
  });

  const link = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { estado, demo, ...params };
    if (next.estado) q.set("estado", next.estado);
    if (next.demo) q.set("demo", next.demo);
    const qs = q.toString();
    return qs ? `/admin/productos/insumos?${qs}` : "/admin/productos/insumos";
  };

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <InventoryTabs active="insumos" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Insumos</h1>
          <p className="text-sm text-admin-ink-muted">
            Existencias físicas compartidas por las recetas de productos y adicionales
          </p>
        </div>
        <Link
          href="/admin/productos/insumos/nuevo"
          className="rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90"
        >
          Nuevo insumo
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={link({ estado: undefined })} className={chipClass(!estado)}>
          Todos
        </Link>
        <Link href={link({ estado: "activos" })} className={chipClass(estado === "activos")}>
          Activos
        </Link>
        <Link href={link({ estado: "inactivos" })} className={chipClass(estado === "inactivos")}>
          Inactivos
        </Link>
        <span className="mx-1 text-admin-border-strong">|</span>
        <Link href={link({ demo: undefined })} className={chipClass(!demo)}>
          Con y sin DEMO
        </Link>
        <Link href={link({ demo: "ocultar" })} className={chipClass(demo === "ocultar")}>
          Ocultar DEMO
        </Link>
        <Link href={link({ demo: "solo" })} className={chipClass(demo === "solo")}>
          Solo DEMO
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-admin-border text-xs text-admin-ink-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 text-right font-medium">Stock</th>
              <th className="px-3 py-2 text-right font-medium">Reservado</th>
              <th className="px-3 py-2 text-right font-medium">Disponible</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const u = usage.get(item.id);
              return (
                <tr key={item.id} className="border-b border-admin-border last:border-0">
                  <td className="px-3 py-2 text-admin-ink">{item.name}</td>
                  <td className="px-3 py-2 text-right font-admin-mono">{item.stockQty}</td>
                  <td className="px-3 py-2 text-right font-admin-mono">{item.reserved}</td>
                  <td className="px-3 py-2 text-right font-admin-mono font-medium">{item.available}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        item.isActive
                          ? "bg-admin-surface-sunken text-admin-ink-secondary"
                          : "bg-admin-warning-bg text-admin-warning-fg"
                      }`}
                    >
                      {item.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-right">
                    <InsumoDetailsDialog
                      data={{
                        sku: item.sku,
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        kind: item.kind,
                        stockQty: item.stockQty,
                        reserved: item.reserved,
                        available: item.available,
                        isActive: item.isActive,
                        products: u?.products ?? [],
                        options: u?.options ?? [],
                        movements: (movements.get(item.id) ?? []).map((m) => ({
                          id: m.id,
                          delta: m.delta,
                          stockAfter: m.stockAfter,
                          reason: m.reason,
                          createdAt: m.createdAt,
                        })),
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-admin-ink-muted">
                  Sin insumos con este filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
