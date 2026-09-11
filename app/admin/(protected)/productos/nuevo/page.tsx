import type { Metadata } from "next";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "Nuevo producto — Panel Nacer Group" };

export default function NuevoProductoPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nuevo producto</h1>
        <p className="text-sm text-slate-500">
          El SKU se sugiere automáticamente y se valida contra la base al guardar (spec 002
          §3.4.2).
        </p>
      </div>
      <NewProductForm />
    </div>
  );
}
