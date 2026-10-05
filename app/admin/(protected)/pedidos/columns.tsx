import type { ReactNode } from "react";
import Link from "next/link";
import type { OrderTableRow } from "@/lib/data/orders";
import { formatCop } from "@/lib/format";
import { FulfillmentStatusSelect } from "./FulfillmentStatusSelect";
import { StaffFieldsInput } from "./StaffFieldsInput";

export interface Column {
  header: string;
  cell: (order: OrderTableRow) => ReactNode;
  mono?: boolean;
}

const DASH = <span className="text-admin-ink-muted">—</span>;

function text(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return DASH;
  return value;
}

function formatDate(iso: string | null) {
  if (!iso) return DASH;
  return new Date(iso).toLocaleDateString("es-CO");
}

/**
 * Todas las columnas del Excel operativo que ya son derivables de Supabase
 * (spec 003 §5) — el usuario pidió el set completo en la tabla, no un
 * subconjunto "denso". Config-driven para no repetir 30 `<td>` a mano.
 */
export const ORDER_COLUMNS: Column[] = [
  {
    header: "N° pedido",
    mono: true,
    cell: (o) => <span className="font-semibold text-admin-ink">{o.human_number}</span>,
  },
  { header: "Fecha", mono: true, cell: (o) => formatDate(o.confirmed_at) },
  {
    header: "Asesor / Proveedor",
    cell: (o) => (
      <StaffFieldsInput orderId={o.id} advisorName={o.advisor_name} supplierName={o.supplier_name} />
    ),
  },
  { header: "Producto(s)", cell: (o) => <span className="whitespace-nowrap">{o.productSummary}</span> },
  { header: "Cant.", mono: true, cell: (o) => o.totalQty },
  { header: "Costo producto", mono: true, cell: (o) => formatCop(o.productCost) },
  { header: "KM", mono: true, cell: (o) => text(o.delivery_distance_km) },
  { header: "Costo domicilio", mono: true, cell: (o) => formatCop(o.delivery_fee) },
  { header: "Tipo de envío", cell: (o) => text(o.delivery_method) },
  { header: "Valor a pagar", mono: true, cell: (o) => formatCop(o.grand_total) },
  { header: "Tipo de pago", cell: (o) => text(o.payment_source) },
  { header: "Comprador", cell: (o) => text(o.saleDetails?.buyer_name) },
  { header: "Celular comprador", mono: true, cell: (o) => text(o.chat_id) },
  { header: "Correo", cell: (o) => text(o.saleDetails?.buyer_email) },
  { header: "Quien recibe", cell: (o) => text(o.saleDetails?.recipient_name) },
  { header: "Tel. destinatario", mono: true, cell: (o) => text(o.saleDetails?.recipient_phone) },
  { header: "Ciudad", cell: (o) => text(o.saleDetails?.city) },
  { header: "Barrio", cell: (o) => text(o.saleDetails?.neighborhood) },
  { header: "Dirección", cell: (o) => text(o.saleDetails?.delivery_address_exact) },
  { header: "Unidad / Apto", cell: (o) => text(o.saleDetails?.delivery_unit) },
  { header: "Fecha de entrega", mono: true, cell: (o) => formatDate(o.desired_delivery_date) },
  { header: "Ocasión", cell: (o) => text(o.occasion) },
  { header: "De:", cell: (o) => text(o.saleDetails?.card_from) },
  { header: "Para:", cell: (o) => text(o.saleDetails?.card_to) },
  { header: "Mensaje", cell: (o) => <span className="line-clamp-2 max-w-[220px]">{text(o.saleDetails?.card_message)}</span> },
  { header: "Observación especial", cell: (o) => <span className="line-clamp-2 max-w-[220px]">{text(o.saleDetails?.special_notes)}</span> },
  { header: "Canal de origen", cell: (o) => text(o.saleDetails?.referral_source) },
  {
    header: "Factura electrónica",
    cell: (o) => (o.saleDetails?.wants_invoice ? "Sí" : o.saleDetails?.submitted_at ? "No" : DASH),
  },
  {
    header: "Cumplimiento",
    cell: (o) => <FulfillmentStatusSelect orderId={o.id} value={o.fulfillment_status} />,
  },
  {
    header: "",
    cell: (o) => (
      <Link href={`/admin/pedidos/${o.id}`} className="text-xs font-medium text-admin-accent hover:underline">
        Ver
      </Link>
    ),
  },
];
