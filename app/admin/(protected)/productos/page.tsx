import type { Metadata } from "next";
import Link from "next/link";
import { getProducts } from "@/lib/data/admin-products";
import { formatCop } from "@/lib/format";
import { ProductThumbnail } from "./ProductThumbnail";

export const metadata: Metadata = { title: "Productos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

const BRANDS = [
  { value: "crisalidas", label: "Crisálidas y Mariposas" },
  { value: "jagua", label: "Jagua" },
  { value: "florea", label: "Florea" },
];

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; estado?: string }>;
}) {
  const { brand, estado } = await searchParams;
  const published = estado === "publicados" ? true : estado === "despublicados" ? false : undefined;

  const products = await getProducts({ brand, published });

  const filterLink = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const next = { brand, estado, ...params };
    if (next.brand) query.set("brand", next.brand);
    if (next.estado) query.set("estado", next.estado);
    const qs = query.toString();
    return qs ? `/admin/productos?${qs}` : "/admin/productos";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">Crisálidas, Jagua y Florea</p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nuevo producto
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={filterLink({ brand: undefined })}
          className={`rounded-full px-3 py-1 ${!brand ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Todas las marcas
        </Link>
        {BRANDS.map((b) => (
          <Link
            key={b.value}
            href={filterLink({ brand: b.value })}
            className={`rounded-full px-3 py-1 ${brand === b.value ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {b.label}
          </Link>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <Link
          href={filterLink({ estado: undefined })}
          className={`rounded-full px-3 py-1 ${!estado ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Todos los estados
        </Link>
        <Link
          href={filterLink({ estado: "publicados" })}
          className={`rounded-full px-3 py-1 ${estado === "publicados" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Publicados
        </Link>
        <Link
          href={filterLink({ estado: "despublicados" })}
          className={`rounded-full px-3 py-1 ${estado === "despublicados" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Despublicados
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/admin/productos/${product.sku}`}
            className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
              <ProductThumbnail url={product.thumbnailUrl} alt={product.name} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
              <p className="text-xs text-slate-500">{product.sku}</p>
              <p className="text-xs text-slate-500">{formatCop(product.base_price)}</p>
              <p className="text-xs text-slate-500">
                {product.availableUnits} disponibles
                {!product.is_published ? " · despublicado" : ""}
              </p>
            </div>
          </Link>
        ))}
        {products.length === 0 ? (
          <p className="col-span-full py-6 text-center text-sm text-slate-400">
            Sin productos con este filtro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
