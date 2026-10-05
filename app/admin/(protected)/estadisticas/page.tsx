import type { Metadata } from "next";
import Link from "next/link";
import { getFunnelCounts } from "@/lib/data/carts";
import {
  getPaymentMethods,
  getSalesByBrand,
  getSalesSummary,
  getSalesTrend,
  getTopProducts,
} from "@/lib/data/dashboard";
import { currentMonthPeriodBogota, getOrderCounts } from "@/lib/data/orders";
import {
  BrandChart,
  FulfillmentChart,
  FunnelChart,
  PaymentMethodsChart,
  TopProductsChart,
  TrendChart,
} from "../pedidos/DashboardCharts";
import { KpiTiles } from "../pedidos/KpiTiles";
import { RefreshButton } from "../RefreshButton";

export const metadata: Metadata = { title: "Estadísticas — Panel Nacer Group" };
export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  const period = currentMonthPeriodBogota();
  const [summary, trend, byBrand, topProducts, paymentMethods, counts, funnel] =
    await Promise.all([
      getSalesSummary(period),
      getSalesTrend(period),
      getSalesByBrand(period),
      getTopProducts(period),
      getPaymentMethods(period),
      getOrderCounts(period),
      getFunnelCounts(period),
    ]);

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Estadísticas</h1>
          <p className="text-sm text-admin-ink-muted">Mes en curso, hora de Bogotá</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
            Ver pedidos
          </Link>
        </div>
      </div>

      <KpiTiles summary={summary} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <TrendChart data={trend} />
        <BrandChart data={byBrand} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TopProductsChart data={topProducts} />
        <PaymentMethodsChart data={paymentMethods} />
        <FulfillmentChart counts={counts} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FunnelChart counts={funnel} />
      </div>
    </div>
  );
}
