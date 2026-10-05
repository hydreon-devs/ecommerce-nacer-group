"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BrandTotal, MethodCount, ProductQty, TrendPoint } from "@/lib/data/dashboard";
import type { FunnelCounts } from "@/lib/data/carts";
import type { FulfillmentStatus, OrderCounts } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";
import { FULFILLMENT_LABELS } from "@/lib/domain/fulfillmentStatus";
import { ORDER_STATUS_LABELS } from "@/lib/domain/orderStatus";

/**
 * Colores decididos por regla, no por gusto (plan §4.3-§4.4, validados con
 * la skill `dataviz`): un solo acento (moss, de marca) para series únicas;
 * la paleta técnica de 3 slots para identidad categórica (marca, método de
 * pago); colores de ESTADO reservados solo para la fase de cumplimiento,
 * nunca reutilizados como identidad.
 */
const ACCENT = "var(--admin-accent)";
const SERIES = ["var(--admin-series-blue)", "var(--admin-series-orange)", "var(--admin-series-aqua)"];
const STATUS = {
  entregado: "var(--admin-good)",
  en_despacho: "var(--admin-warning-fg)",
  en_construccion: "var(--admin-series-blue)",
  perdido: "var(--admin-critical-fg)",
};
const ORDER_STATUS_COLOR = {
  abierto: "var(--admin-series-blue)",
  pagado: "var(--admin-good)",
  vencido: "var(--admin-warning-fg)",
  cancelado: "var(--admin-critical-fg)",
};

const TOOLTIP_STYLE = {
  background: "var(--admin-surface-raised)",
  border: "1px solid var(--admin-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--admin-ink)",
};

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]">
      <h2 className="mb-0.5 text-[12.5px] font-semibold text-admin-ink">{title}</h2>
      <p className="mb-3 text-[11px] text-admin-ink-muted">{subtitle}</p>
      {children}
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <CardShell title="Tendencia de ventas" subtitle="Días con ventas confirmadas en el periodo">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--admin-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--admin-ink-muted)" }}
            axisLine={{ stroke: "var(--admin-border-strong)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--admin-ink-muted)" }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [formatCop(Number(value)), "Ventas"]}
          />
          <Area type="monotone" dataKey="total" stroke={ACCENT} fill={ACCENT} fillOpacity={0.18} strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
      {data.length === 0 ? (
        <p className="mt-2 text-center text-[11.5px] text-admin-ink-muted">
          Sin ventas confirmadas en el periodo.
        </p>
      ) : null}
    </CardShell>
  );
}

export function BrandChart({ data }: { data: BrandTotal[] }) {
  return (
    <CardShell title="Ventas por marca" subtitle="Periodo actual">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="brand"
            tick={{ fontSize: 11.5, fill: "var(--admin-ink-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCop(Number(v))} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((entry, i) => (
              <Cell key={entry.brand} fill={SERIES[i % SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

export function TopProductsChart({ data }: { data: ProductQty[] }) {
  return (
    <CardShell title="Productos más vendidos" subtitle="Unidades del periodo">
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 26)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11.5, fill: "var(--admin-ink-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="qty" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
      {data.length === 0 ? (
        <p className="text-center text-[11.5px] text-admin-ink-muted">Sin unidades vendidas.</p>
      ) : null}
    </CardShell>
  );
}

export function PaymentMethodsChart({ data }: { data: MethodCount[] }) {
  return (
    <CardShell title="Métodos de pago" subtitle="Pedidos pagados del periodo">
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="method"
            tick={{ fontSize: 11.5, fill: "var(--admin-ink-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((entry, i) => (
              <Cell key={entry.method} fill={SERIES[i % SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {data.length === 0 ? (
        <p className="text-center text-[11.5px] text-admin-ink-muted">Sin pagos en el periodo.</p>
      ) : null}
    </CardShell>
  );
}

export function FulfillmentChart({ counts }: { counts: OrderCounts }) {
  const data = [
    { key: "entregado", value: counts.entregados },
    { key: "en_despacho", value: counts.enDespacho },
    { key: "en_construccion", value: counts.enConstruccion },
    { key: "perdido", value: counts.perdidos },
  ];

  return (
    <CardShell title="Fase de cumplimiento" subtitle="Pedidos pagados del periodo">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="key"
            tickFormatter={(k: string) => FULFILLMENT_LABELS[k as FulfillmentStatus] ?? k}
            tick={{ fontSize: 11.5, fill: "var(--admin-ink-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={94}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(k) => FULFILLMENT_LABELS[String(k) as FulfillmentStatus] ?? String(k)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={STATUS[entry.key as keyof typeof STATUS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

/**
 * Embudo de conversión: pedidos **iniciados** en el periodo, por estado
 * final. Filtrado por `created_at`, no `confirmed_at` — es la única forma
 * de incluir los que nunca llegaron a pagarse. El número de "Pagado" aquí
 * puede diferir del KPI "Pedidos vendidos" de arriba, que cuenta por
 * `confirmed_at` — son dos preguntas distintas (lib/data/carts.ts).
 */
export function FunnelChart({ counts }: { counts: FunnelCounts }) {
  const data = [
    { key: "abierto", value: counts.abierto },
    { key: "pagado", value: counts.pagado },
    { key: "vencido", value: counts.vencido },
    { key: "cancelado", value: counts.cancelado },
  ];

  return (
    <CardShell title="Embudo de conversión" subtitle="Pedidos iniciados en el periodo, por resultado">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="key"
            tickFormatter={(k: string) => ORDER_STATUS_LABELS[k] ?? k}
            tick={{ fontSize: 11.5, fill: "var(--admin-ink-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(k) => ORDER_STATUS_LABELS[String(k)] ?? String(k)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={ORDER_STATUS_COLOR[entry.key as keyof typeof ORDER_STATUS_COLOR]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}
