import type { Metadata } from "next";
import { getPaymentMethods, getSalesSummary, getSalesTrend, getTopProducts } from "@/lib/data/dashboard";
import { getFunnelCounts } from "@/lib/data/carts";
import { getEarliestOrderYear, getOrderCounts } from "@/lib/data/orders";
import {
  bogotaYearMonth,
  parsePeriodParams,
  periodLabel,
  periodRange,
  trendGranularity,
} from "@/lib/domain/period";
import { PaymentMethodsChart, TopProductsChart, TrendChart } from "../pedidos/DashboardCharts";
import { KpiTiles } from "../pedidos/KpiTiles";
import { RefreshButton } from "../RefreshButton";
import { PeriodFilter } from "./PeriodFilter";

export const metadata: Metadata = { title: "Estadísticas — Panel Nacer Group" };
export const dynamic = "force-dynamic";

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const selected = parsePeriodParams(await searchParams, now);
  const period = periodRange(selected);
  const granularity = trendGranularity(selected);
  const [summary, trend, topProducts, paymentMethods, counts, funnel, earliestYear] =
    await Promise.all([
      getSalesSummary(period),
      getSalesTrend(period, granularity),
      getTopProducts(period),
      getPaymentMethods(period),
      getOrderCounts(period),
      getFunnelCounts(period),
      getEarliestOrderYear(),
    ]);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Estadísticas</h1>
          <p className="text-sm text-admin-ink-muted">{periodLabel(selected)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodFilter
            selected={selected}
            current={bogotaYearMonth(now)}
            minYear={selected.kind === "all" ? earliestYear : Math.min(earliestYear, selected.year)}
          />
          <RefreshButton />
        </div>
      </div>

      <KpiTiles summary={summary} counts={counts} openCarts={funnel.abierto} />

      {/* DOM: tendencia, productos, pagos (orden de lectura y de móvil). En lg la tendencia
          ocupa 2/3 a la derecha y abarca las dos filas de la columna izquierda. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TrendChart
          data={trend}
          granularity={granularity}
          className="lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />
        <TopProductsChart data={topProducts} className="lg:col-start-1 lg:row-start-1" />
        <PaymentMethodsChart data={paymentMethods} className="lg:col-start-1 lg:row-start-2" />
      </div>
    </div>
  );
}
