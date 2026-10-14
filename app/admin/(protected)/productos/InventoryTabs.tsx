import Link from "next/link";

/** Pestañas "Productos | Insumos" del panel de inventario (no hay entrada propia en la navegación lateral). */
export function InventoryTabs({ active }: { active: "productos" | "insumos" }) {
  const tab = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "bg-admin-accent text-admin-accent-ink"
        : "text-admin-ink-secondary hover:bg-admin-surface-sunken"
    }`;
  return (
    <nav aria-label="Inventario" className="flex gap-1 rounded-xl bg-admin-surface-raised p-1 ring-1 ring-admin-border w-fit">
      <Link href="/admin/productos" className={tab(active === "productos")}>
        Productos
      </Link>
      <Link href="/admin/productos/insumos" className={tab(active === "insumos")}>
        Insumos
      </Link>
    </nav>
  );
}
