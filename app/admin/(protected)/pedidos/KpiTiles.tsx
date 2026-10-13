import Link from "next/link";
import { formatCop } from "@/lib/format";
import type { SalesSummary } from "@/lib/data/dashboard";
import type { OrderCounts } from "@/lib/data/orders";

const CELL = "min-w-0 bg-admin-surface-raised p-4 lg:p-5";
const LINK_CELL = `${CELL} transition-colors duration-150 hover:bg-admin-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-admin-accent`;
const VALUE = "font-admin-mono text-xl font-semibold tracking-tight text-admin-ink tabular-nums lg:text-2xl";

/** Cue estático de que la celda es un enlace: no depende de hover (en táctil no existe). */
function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-admin-ink-muted"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function LinkLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <p className="text-xs text-admin-ink-muted">{children}</p>
      <ChevronRight />
    </div>
  );
}

/**
 * Una sola superficie con las cuatro métricas separadas por líneas finas
 * (gap-px sobre fondo de borde). Tres celdas son enlaces y llevan un
 * chevron fijo: "Pedidos vendidos" a pedidos, "Carritos abiertos" a
 * carritos y "En construcción" a producción (pagados del periodo que la
 * artesana aún no marca como preparados). Solo "Ventas del periodo" es estática.
 */
export function KpiTiles({
  summary,
  counts,
  openCarts,
}: {
  summary: SalesSummary;
  counts: OrderCounts;
  openCarts: number;
}) {
  return (
    <section
      aria-label="Indicadores del periodo"
      className="overflow-hidden rounded-xl border border-transparent bg-admin-surface-raised shadow-admin-card"
    >
      <div className="grid grid-cols-2 gap-px bg-admin-border lg:grid-cols-4">
        <div className={CELL}>
          <p className="mb-1 text-xs text-admin-ink-muted">Ventas del periodo</p>
          <p className={`break-words ${VALUE}`}>{formatCop(summary.totalVentas)}</p>
        </div>
        <Link href="/admin/pedidos" className={LINK_CELL}>
          <LinkLabel>Pedidos vendidos</LinkLabel>
          <p className={VALUE}>{summary.pedidosVendidos}</p>
        </Link>
        <Link href="/admin/carritos" className={LINK_CELL}>
          <LinkLabel>Carritos abiertos</LinkLabel>
          <p className={VALUE}>{openCarts}</p>
          <p className="mt-1 text-xs text-admin-ink-muted">intentos de compra en curso</p>
        </Link>
        <Link href="/admin/produccion" className={LINK_CELL}>
          <LinkLabel>En construcción</LinkLabel>
          <p className={VALUE}>{counts.enConstruccion}</p>
        </Link>
      </div>
    </section>
  );
}
