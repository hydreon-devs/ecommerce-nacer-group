import type { Metadata } from "next";
import { InventoryTabs } from "../../InventoryTabs";
import { StockItemForm } from "../StockItemForm";

export const metadata: Metadata = { title: "Nuevo insumo — Panel Nacer Group" };

export default function NuevoInsumoPage() {
  return (
    <div className="animate-view-in flex max-w-xl flex-col gap-6">
      <InventoryTabs active="insumos" />
      <h1 className="text-xl font-bold tracking-tight text-admin-ink">Nuevo insumo</h1>
      <StockItemForm />
    </div>
  );
}
