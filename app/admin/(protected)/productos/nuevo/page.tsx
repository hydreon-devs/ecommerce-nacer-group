import type { Metadata } from "next";
import { BackLink } from "../../ui/BackLink";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "Nuevo producto — Panel Nacer Group" };

export default function NuevoProductoPage() {
  return (
    <div className="animate-view-in flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/productos">Productos</BackLink>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Nuevo producto</h1>
          <p className="text-sm text-admin-ink-muted">
            El SKU se sugiere automáticamente y se valida contra la base al guardar.
          </p>
        </div>
      </div>
      <NewProductForm />
    </div>
  );
}
