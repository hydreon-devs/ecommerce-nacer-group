import type { Metadata } from "next";
import { getDeliveryZones, getSaleCatalog } from "@/lib/data/panel-sale";
import { NewOrderForm } from "./NewOrderForm";
import { BackLink } from "../../ui/BackLink";

export const metadata: Metadata = { title: "Nuevo pedido — Panel Nacer Group" };
// El stock disponible cambia con cada venta: se lee en vivo en cada request.
export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const [catalog, zones] = await Promise.all([getSaleCatalog(), getDeliveryZones()]);

  return (
    <div className="animate-view-in flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/pedidos">Pedidos</BackLink>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Nuevo pedido</h1>
          <p className="text-sm text-admin-ink-muted">
            Registra una venta ya cobrada por fuera de la tienda y del asistente. Nace pagada y en
            construcción, a nombre de tu usuario.
          </p>
        </div>
      </div>
      <NewOrderForm catalog={catalog} zones={zones} />
    </div>
  );
}
