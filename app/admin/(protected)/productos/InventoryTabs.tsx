import Link from "next/link";
import { focusRingClass } from "../ui/formClasses";

/** Pestañas "Productos | Insumos" del panel de inventario (no hay entrada propia en la navegación lateral). */
export function InventoryTabs({ active }: { active: "productos" | "insumos" }) {
  const tab = (isActive: boolean) =>
    `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200 ${focusRingClass} ${
      isActive
        ? "bg-admin-accent text-admin-accent-ink"
        : "text-admin-ink-secondary hover:bg-admin-surface-sunken"
    }`;
  return (
    <nav aria-label="Inventario" className="flex gap-1 rounded-xl bg-admin-surface-raised p-1 ring-1 ring-admin-border w-fit">
      <Link href="/admin/productos" aria-current={active === "productos" ? "page" : undefined} className={tab(active === "productos")}>
        Productos
      </Link>
      <Link href="/admin/productos/insumos" aria-current={active === "insumos" ? "page" : undefined} className={tab(active === "insumos")}>
        Insumos
      </Link>
    </nav>
  );
}
