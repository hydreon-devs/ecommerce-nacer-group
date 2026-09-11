import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySku } from "@/lib/data/admin-products";
import { ProductEditor } from "./ProductEditor";

export const metadata: Metadata = { title: "Editar producto — Panel Nacer Group" };
export const dynamic = "force-dynamic";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const product = await getProductBySku(sku);
  if (!product) notFound();

  return <ProductEditor product={product} />;
}
