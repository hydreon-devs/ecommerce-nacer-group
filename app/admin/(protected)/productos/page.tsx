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

function chipClass(active: boolean) {
  return `rounded-full px-3 py-1 text-sm transition-colors duration-200 ${
    active
      ? "bg-admin-accent text-admin-accent-ink"
      : "bg-admin-surface-raised text-admin-ink-secondary ring-1 ring-admin-border hover:bg-admin-surface-sunken"
  }`;
}

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
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Productos</h1>
          <p className="text-sm text-admin-ink-muted">Crisálidas, Jagua y Florea</p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90"
        >
          Nuevo producto
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={filterLink({ brand: undefined })} className={chipClass(!brand)}>
          Todas las marcas
        </Link>
        {BRANDS.map((b) => (
          <Link key={b.value} href={filterLink({ brand: b.value })} className={chipClass(brand === b.value)}>
            {b.label}
          </Link>
        ))}
        <span className="mx-1 text-admin-border-strong">|</span>
        <Link href={filterLink({ estado: undefined })} className={chipClass(!estado)}>
          Todos los estados
        </Link>
        <Link href={filterLink({ estado: "publicados" })} className={chipClass(estado === "publicados")}>
          Publicados
        </Link>
        <Link
          href={filterLink({ estado: "despublicados" })}
          className={chipClass(estado === "despublicados")}
        >
          Despublicados
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/admin/productos/${product.sku}`}
            className="flex gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-3 shadow-[0_1px_2px_rgba(11,17,32,0.04)] transition-colors duration-200 hover:border-admin-border-strong"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
              <ProductThumbnail url={product.thumbnailUrl} alt={product.name} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-admin-ink">{product.name}</p>
              <p className="font-admin-mono text-xs text-admin-ink-muted">{product.sku}</p>
              <p className="font-admin-mono text-xs text-admin-ink-secondary">
                {formatCop(product.base_price)}
              </p>
              <p className="text-xs text-admin-ink-muted">
                {product.availableUnits} disponibles
                {!product.is_published ? " · despublicado" : ""}
              </p>
            </div>
          </Link>
        ))}
        {products.length === 0 ? (
          <p className="col-span-full py-6 text-center text-sm text-admin-ink-muted">
            Sin productos con este filtro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
