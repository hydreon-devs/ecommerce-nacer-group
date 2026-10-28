import type { Metadata } from "next";
import { getStockItems } from "@/lib/data/stock-items";
import { BackLink } from "../../../ui/BackLink";
import { InventoryTabs } from "../../InventoryTabs";
import { StockItemForm } from "../StockItemForm";

export const metadata: Metadata = { title: "Nuevo insumo — Panel Nacer Group" };

export const dynamic = "force-dynamic";

export default async function NuevoInsumoPage() {
  const baseOptions = (await getStockItems())
    .filter((i) => i.origin === "workshop" && i.isActive)
    .map((i) => ({ id: i.id, sku: i.sku, name: i.name }));
  return (
    <div className="animate-view-in flex flex-col gap-6">
      <InventoryTabs active="insumos" />
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/productos/insumos">Insumos</BackLink>
        <h1 className="text-xl font-bold tracking-tight text-admin-ink">Nuevo insumo</h1>
      </div>
      <StockItemForm baseOptions={baseOptions} />
    </div>
  );
}
