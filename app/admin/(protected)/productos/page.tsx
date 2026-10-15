import type { Metadata } from "next";
import Link from "next/link";
import { getProducts } from "@/lib/data/admin-products";
import { formatCop } from "@/lib/format";
import { InventoryTabs } from "./InventoryTabs";
import { classifyStock, STOCK_LEVEL_LABEL } from "@/lib/domain/stockLevel";
import { chipClass, focusRingClass as FOCUS_RING, secondaryButtonClass } from "../ui/formClasses";
import { ProductThumbnail } from "./ProductThumbnail";
import { PublishBadge } from "./PublishBadge";
import { PRODUCT_TYPES, groupProductsByType, isProductType } from "./productTypes";
import type { ProductListItem } from "@/lib/data/admin-products";

export const metadata: Metadata = { title: "Productos — Panel Nacer Group" };
export const dynamic = "force-dynamic";

function ProductCard({ product }: { product: ProductListItem }) {
  const level = classifyStock(product.availableUnits);
  return (
    <Link
      href={`/admin/productos/${product.sku}`}
      className={`flex gap-3 rounded-xl border border-transparent bg-admin-surface-raised p-3 shadow-admin-card transition-colors duration-200 hover:border-admin-border-strong ${FOCUS_RING}`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
        <ProductThumbnail url={product.thumbnailUrl} alt={product.name} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-admin-ink">{product.name}</p>
          <PublishBadge published={product.is_published} />
        </div>
        <p className="font-admin-mono text-xs text-admin-ink-secondary">
          {formatCop(product.base_price)}
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-admin-ink-muted">
          <span>{product.availableUnits} disponibles</span>
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
        </p>
      </div>
    </Link>
  );
}

function CardGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; estado?: string }>;
}) {
  const { brand: rawBrand, estado } = await searchParams;
  const brand = isProductType(rawBrand) ? rawBrand : undefined;
  const published = estado === "publicados" ? true : estado === "despublicados" ? false : undefined;

  const products = await getProducts({ brand, published });
  const groups = groupProductsByType(products).filter((g) => !brand || g.type.value === brand);

  const filterLink = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const next = { brand, estado, ...params };
    if (next.brand) query.set("brand", next.brand);
    if (next.estado) query.set("estado", next.estado);
    const qs = query.toString();
    return qs ? `/admin/productos?${qs}` : "/admin/productos";
  };

  const current = (active: boolean) => (active ? ("page" as const) : undefined);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <InventoryTabs active="productos" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Productos</h1>
          <p className="text-sm text-admin-ink-muted">Crisálidas y Mariposas, y Complementos</p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className={`inline-flex min-h-11 items-center rounded-lg bg-admin-accent px-3 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 ${FOCUS_RING}`}
        >
          Nuevo producto
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={filterLink({ brand: undefined })}
            aria-current={current(!brand)}
            className={chipClass(!brand)}
          >
            Todos
          </Link>
          {PRODUCT_TYPES.map((t) => (
            <Link
              key={t.value}
              href={filterLink({ brand: t.value })}
              aria-current={current(brand === t.value)}
              className={chipClass(brand === t.value)}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={filterLink({ estado: undefined })}
            aria-current={current(!estado)}
            className={chipClass(!estado)}
          >
            Todos los estados
          </Link>
          <Link
            href={filterLink({ estado: "publicados" })}
            aria-current={current(estado === "publicados")}
            className={chipClass(estado === "publicados")}
          >
            Publicados
          </Link>
          <Link
            href={filterLink({ estado: "despublicados" })}
            aria-current={current(estado === "despublicados")}
            className={chipClass(estado === "despublicados")}
          >
            No publicados
          </Link>
        </div>
      </div>

      {products.length === 0 && (brand || estado) ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-admin-ink-muted">No hay productos con estos filtros.</p>
          <Link href="/admin/productos" className={`inline-flex items-center ${secondaryButtonClass}`}>
            Limpiar filtros
          </Link>
        </div>
      ) : null}

      {(products.length === 0 && (brand || estado) ? [] : groups).map((group) => (
        <section key={group.type.value} className="flex flex-col gap-4">
          <h2 className="flex items-baseline gap-2 border-b border-admin-border pb-2 text-base font-semibold text-admin-ink">
            {group.type.label}
            <span className="font-admin-mono text-xs font-normal text-admin-ink-muted">
              {group.count}
            </span>
          </h2>
          {group.count === 0 ? (
            <p className="py-4 text-sm text-admin-ink-muted">
              Sin productos de {group.type.label} con este filtro.
            </p>
          ) : group.collections.length > 0 ? (
            group.collections.map((collection) => (
              <div key={collection.name} className="flex flex-col gap-2">
                <h3 className="flex items-baseline gap-2 text-sm font-medium text-admin-ink-secondary">
                  {collection.name}
                  <span className="font-admin-mono text-xs text-admin-ink-muted">
                    {collection.items.length}
                  </span>
                </h3>
                <CardGrid products={collection.items} />
              </div>
            ))
          ) : (
            <CardGrid products={group.items} />
          )}
        </section>
      ))}
    </div>
  );
}
