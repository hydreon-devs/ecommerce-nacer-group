import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySku } from "@/lib/data/admin-products";
import { ActionStatus } from "../../ui/ActionStatus";
import { ProductEditor } from "./ProductEditor";

export const metadata: Metadata = { title: "Editar producto — Panel Nacer Group" };
export const dynamic = "force-dynamic";

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ foto?: string }>;
}) {
  const { sku } = await params;
  const { foto } = await searchParams;
  const product = await getProductBySku(sku);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      {foto === "error" ? (
        <ActionStatus
          message={{
            tone: "warn",
            text: "El producto se creó, pero no se pudo subir la foto. Puedes agregarla desde la variante.",
          }}
        />
      ) : null}
      <ProductEditor product={product} />
    </div>
  );
}
