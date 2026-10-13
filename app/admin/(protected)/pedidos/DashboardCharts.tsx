"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MethodCount, ProductQty, TrendPoint } from "@/lib/data/dashboard";
import { formatCop } from "@/lib/format";
import type { TrendGranularity } from "@/lib/domain/period";

/**
 * Un solo acento (moss, de marca) para la serie única de la tendencia. Las
 * listas de productos y métodos de pago usan el mismo acento solo en sus
 * barras; el texto siempre va en tokens de tinta.
 */
const ACCENT = "var(--admin-accent)";

const TOOLTIP_STYLE = {
  background: "var(--admin-surface-raised)",
  border: "1px solid transparent",
  boxShadow: "var(--admin-shadow-card)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--admin-ink)",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * `getSalesTrend` ya entrega el día o mes en hora de Bogotá (`bucketTrend`):
 * se formatea por partes, sin `new Date(...)`, que lo interpretaría como UTC
 * y correría el día. Por mes lleva el año ("oct 2026"): con todo el tiempo
 * la serie cruza años y "oct" solo sería ambiguo.
 */
function formatTrendLabel(key: string, granularity: TrendGranularity): string {
  const [year, month, day] = key.split("-");
  const label = MONTHS[Number(month) - 1];
  if (!label) return key;
  return granularity === "day" ? `${Number(day)} ${label}` : `${label} ${year}`;
}

/**
 * `flex-col` + el `h-full` implícito del grid: la tarjeta se estira a la
 * altura de su celda y el contenido (`flex-1`) reparte el resto.
 */
function CardShell({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-transparent bg-admin-surface-raised p-5 shadow-admin-card ${className}`}
    >
      <h2 className="text-sm font-semibold text-admin-ink">{title}</h2>
      <p className="mb-4 text-xs text-admin-ink-muted">{subtitle}</p>
      {children}
    </section>
  );
}

export function TrendChart({
  data,
  granularity,
  className,
}: {
  data: TrendPoint[];
  granularity: TrendGranularity;
  className?: string;
}) {
  const total = data.reduce((sum, p) => sum + p.total, 0);
  const unit = granularity === "day" ? "día" : "mes";
  const units = granularity === "day" ? "días" : "meses";
  const formatLabel = (key: string) => formatTrendLabel(key, granularity);

  return (
    <CardShell
      className={className}
      title="Tendencia de ventas"
      subtitle={`${granularity === "day" ? "Días" : "Meses"} con ventas confirmadas en el periodo`}
    >
      {data.length === 0 ? (
        <p className="flex min-h-40 flex-1 items-center justify-center text-center text-sm text-admin-ink-muted">
          Sin ventas confirmadas en el periodo.
        </p>
      ) : (
        <figure
          className="flex min-h-0 flex-1 flex-col"
          aria-label={`Ventas por ${unit}: ${data.length} ${units} con ventas, ${formatCop(total)} en total`}
        >
          {/* El contenedor ocupa el alto sobrante de la tarjeta (mínimo 240px, el alto de antes);
              el gráfico va en un hijo absoluto porque ResponsiveContainer necesita un padre con alto resuelto. */}
          <div aria-hidden="true" className="relative min-h-60 flex-1">
            <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--admin-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--admin-ink-muted)" }}
                  axisLine={{ stroke: "var(--admin-border-strong)" }}
                  tickLine={false}
                  tickFormatter={formatLabel}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--admin-ink-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  isAnimationActive={false}
                  labelFormatter={(label) => formatLabel(String(label))}
                  formatter={(value) => [formatCop(Number(value)), "Ventas"]}
                />
                {/* 'auto' ya se desactiva con prefers-reduced-motion (recharts usePrefersReducedMotion) */}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>
          <figcaption className="sr-only">
            <table>
              <caption>Ventas confirmadas por {unit}</caption>
              <thead>
                <tr>
                  <th scope="col">{granularity === "day" ? "Fecha" : "Mes"}</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.date}>
                    <th scope="row">{formatLabel(p.date)}</th>
                    <td>{formatCop(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figcaption>
        </figure>
      )}
    </CardShell>
  );
}

export function TopProductsChart({ data, className }: { data: ProductQty[]; className?: string }) {
  const max = Math.max(1, ...data.map((p) => p.qty));

  return (
    <CardShell className={className} title="Productos más vendidos" subtitle="Unidades del periodo">
      {data.length === 0 ? (
        <p className="flex min-h-24 flex-1 items-center justify-center text-center text-sm text-admin-ink-muted">Sin unidades vendidas.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {data.map((p) => (
            <li key={p.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-admin-ink-secondary" title={p.name}>
                  {p.name}
                </span>
                <span className="font-admin-mono tabular-nums text-admin-ink">{p.qty}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-admin-surface-sunken" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-admin-accent"
                  style={{ width: `${(p.qty / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardShell>
  );
}

export function PaymentMethodsChart({ data, className }: { data: MethodCount[]; className?: string }) {
  const total = data.reduce((sum, m) => sum + m.count, 0);

  return (
    <CardShell className={className} title="Métodos de pago" subtitle="Pedidos pagados del periodo">
      {data.length === 0 ? (
        <p className="flex min-h-24 flex-1 items-center justify-center text-center text-sm text-admin-ink-muted">Sin pagos en el periodo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((m) => (
            <li key={m.method} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-admin-ink-secondary" title={m.method}>
                {m.method}
              </span>
              <span className="flex shrink-0 items-baseline gap-3 font-admin-mono tabular-nums">
                <span className="text-admin-ink">{m.count}</span>
                <span className="w-10 text-right text-admin-ink-muted">
                  {Math.round((m.count / total) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
