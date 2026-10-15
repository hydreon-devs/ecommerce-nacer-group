import type { Metadata } from "next";
import Link from "next/link";
import { getRecentMovementsByItem, getStockItemUsage, getStockItems } from "@/lib/data/stock-items";
import { classifyStock, STOCK_LEVEL_LABEL } from "@/lib/domain/stockLevel";
import { chipClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formClasses";
import { InventoryTabs } from "../InventoryTabs";
import { InsumoDetailsDialog } from "./InsumoDetailsDialog";

export const metadata: Metadata = { title: "Insumos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Insumos</h1>
          <p className="text-sm text-admin-ink-muted">
            Existencias físicas compartidas por las recetas de productos y adicionales
          </p>
        </div>
        <Link
          href="/admin/productos/insumos/nuevo"
          className={`inline-flex items-center ${primaryButtonClass}`}
        >
          Nuevo insumo
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={link({ estado: undefined })}
          aria-current={(!estado) ? "true" : undefined}
          className={chipClass(!estado)}
        >
          Todos
        </Link>
        <Link
          href={link({ estado: "activos" })}
          aria-current={(estado === "activos") ? "true" : undefined}
          className={chipClass(estado === "activos")}
        >
          Activos
        </Link>
        <Link
          href={link({ estado: "inactivos" })}
          aria-current={(estado === "inactivos") ? "true" : undefined}
          className={chipClass(estado === "inactivos")}
        >
          Inactivos
        </Link>
        <span aria-hidden="true" className="mx-1 self-center text-admin-border-strong">|</span>
        <Link
          href={link({ demo: undefined })}
          aria-current={(!demo) ? "true" : undefined}
          className={chipClass(!demo)}
        >
          Todos (reales y DEMO)
        </Link>
        <Link
          href={link({ demo: "ocultar" })}
          aria-current={(demo === "ocultar") ? "true" : undefined}
          className={chipClass(demo === "ocultar")}
        >
          Solo reales
        </Link>
        <Link
          href={link({ demo: "solo" })}
          aria-current={(demo === "solo") ? "true" : undefined}
          className={chipClass(demo === "solo")}
        >
          Solo DEMO
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface-raised">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Insumos con existencias, reservas y disponibilidad</caption>
          <thead className="border-b border-admin-border text-xs text-admin-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Nombre</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Stock</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Reservado</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Disponible</th>
              <th scope="col" className="px-3 py-2 font-medium">Estado</th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const u = usage.get(item.id);
              const level = classifyStock(item.available);
              return (
                <tr key={item.id} className="border-b border-admin-border last:border-0">
                  <td className="px-3 py-2 text-admin-ink">{item.name}</td>
                  <td className="px-3 py-2 text-right font-admin-mono">{item.stockQty}</td>
                  <td className="px-3 py-2 text-right font-admin-mono">{item.reserved}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <span className="font-admin-mono font-medium">{item.available}</span>
                      {level !== "ok" ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            level === "out"
                              ? "bg-admin-critical-bg text-admin-critical-fg"
                              : "bg-admin-warning-bg text-admin-warning-fg"
                          }`}
                        >
                          {STOCK_LEVEL_LABEL[level]}
                        </span>
                      ) : null}
                    </span>
                  </td>
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
                  <p>Sin insumos con este filtro.</p>
                  {estado || demo ? (
                    <Link
                      href="/admin/productos/insumos"
                      className={`mt-3 inline-flex items-center ${secondaryButtonClass}`}
                    >
                      Limpiar filtros
                    </Link>
                  ) : null}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
