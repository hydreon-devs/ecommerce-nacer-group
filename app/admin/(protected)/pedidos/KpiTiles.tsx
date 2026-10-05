import { formatCop } from "@/lib/format";
import type { SalesSummary } from "@/lib/data/dashboard";

export function KpiTiles({ summary }: { summary: SalesSummary }) {
  const tiles = [
    { label: "Ventas del periodo", value: formatCop(summary.totalVentas) },
    { label: "Pedidos vendidos", value: String(summary.pedidosVendidos) },
    {
      label: "Ticket promedio",
      value: summary.pedidosVendidos > 0 ? formatCop(summary.ticketPromedio) : "—",
    },
    { label: "Pendientes de despacho", value: String(summary.pendientesDespacho) },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          style={{ animationDelay: `${20 + i * 50}ms` }}
          className="animate-kpi-in rounded-xl border border-admin-border bg-admin-surface-raised p-4 opacity-0 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]"
        >
          <p className="mb-1.5 text-[11.5px] uppercase tracking-wide text-admin-ink-muted">
            {tile.label}
          </p>
          <p className="font-admin-mono text-2xl font-bold tracking-tight text-admin-ink">
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
