import type { Metadata } from "next";
import Link from "next/link";
import { getRecentMovementsByItem, getStockItemUsage, getStockItems } from "@/lib/data/stock-items";
import { classifyStock, STOCK_LEVEL_LABEL } from "@/lib/domain/stockLevel";
import { chipClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formClasses";
import { InventoryTabs } from "../InventoryTabs";
import { ProductThumbnail } from "../ProductThumbnail";
import { InsumoDetailsDialog } from "./InsumoDetailsDialog";

export const metadata: Metadata = { title: "Insumos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

export default async function InsumosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const [allItems, usage, movements] = await Promise.all([
    getStockItems(),
    getStockItemUsage(),
    getRecentMovementsByItem(3),
  ]);

  const items = allItems.filter((i) => {
    if (estado === "activos" && !i.isActive) return false;
    if (estado === "inactivos" && i.isActive) return false;
    return true;
  });

  const link = (params: { estado?: string }) =>
    params.estado ? `/admin/productos/insumos?estado=${params.estado}` : "/admin/productos/insumos";

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <InventoryTabs active="insumos" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Insumos</h1>
          <p className="text-sm text-admin-ink-muted">
            Existencias físicas que productos y adicionales usan como componentes
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
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-admin-ink-muted">Sin insumos con este filtro.</p>
          {estado ? (
            <Link
              href="/admin/productos/insumos"
              className={`inline-flex items-center ${secondaryButtonClass}`}
            >
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const u = usage.get(item.id);
            const level = classifyStock(item.available);
            return (
              <InsumoDetailsDialog
                key={item.id}
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
              >
                <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
                  <ProductThumbnail url={item.imageUrl} alt={item.name} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium text-admin-ink">{item.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        item.isActive
                          ? "bg-admin-surface-sunken text-admin-ink-secondary"
                          : "bg-admin-warning-bg text-admin-warning-fg"
                      }`}
                    >
                      {item.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-admin-ink-muted">
                    <span className="text-sm font-medium text-admin-ink">
                      {item.available} disponibles
                    </span>
                    {item.origin ? (
                      <span className="rounded-full bg-admin-surface-sunken px-2 py-0.5 text-admin-ink-secondary">
                        {item.origin === "workshop" ? "Taller" : "Comprado"}
                      </span>
                    ) : null}
                    {level !== "ok" ? (
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          level === "out"
                            ? "bg-admin-critical-bg text-admin-critical-fg"
                            : "bg-admin-warning-bg text-admin-warning-fg"
                        }`}
                      >
                        {STOCK_LEVEL_LABEL[level]}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-admin-mono text-xs text-admin-ink-secondary">
                    Stock {item.stockQty} · Reservado {item.reserved}
                  </span>
                </span>
              </InsumoDetailsDialog>
            );
          })}
        </div>
      )}
    </div>
  );
}
