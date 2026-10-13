import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderTableRow } from "@/lib/data/orders";
import { DASH } from "../pedidos/orderView.ts";
import { buildDispatchCard } from "./dispatchView.ts";

function makeOrder(overrides: Partial<OrderTableRow> = {}): OrderTableRow {
  return {
    id: "ord-1",
    human_number: "TEST0007",
    chat_id: "573001112233",
    status: "pagado",
    payment_status: "aprobado",
    fulfillment_status: "preparado",
    grand_total: 185000,
    delivery_method: "domicilio",
    advisor_name: null,
    supplier_name: null,
    created_at: "2026-10-01T15:00:00.000Z",
    confirmed_at: "2026-10-02T03:30:00.000Z",
    delivery_distance_km: 4,
    delivery_fee: 12000,
    payment_source: "mercadopago",
    occasion: null,
    desired_delivery_date: "2026-10-20",
    productSummary: "Mariposa azul ×1",
    totalQty: 1,
    productCost: 173000,
    saleDetails: {
      submitted_at: "2026-10-02T03:00:00.000Z",
      buyer_name: "Ana Pérez",
      buyer_email: null,
      delivery_address_exact: "Cra 5 # 6-7",
      delivery_unit: "Apto 301",
      neighborhood: "Laureles",
      city: "Medellín",
      building_name: null,
      recipient_name: "Luisa Gómez",
      recipient_phone: "3001234567",
      may_call_recipient: true,
      card_from: null,
      card_to: null,
      card_message: null,
      special_notes: null,
      wants_invoice: null,
      invoice_legal_name: null,
      invoice_tax_id: null,
      invoice_email: null,
      referral_source: null,
    },
    ...overrides,
  };
}

describe("buildDispatchCard", () => {
  it("collects what dispatch needs and the delivery step", () => {
    const card = buildDispatchCard(makeOrder());
    assert.equal(card.humanNumber, "TEST0007");
    assert.equal(card.deliveryMethod, "Domicilio");
    assert.equal(card.desiredDate, "20/10/2026");
    assert.equal(card.recipient, "Luisa Gómez");
    assert.equal(card.recipientPhone, "3001234567");
    assert.equal(card.address, "Cra 5 # 6-7, Apto 301, Laureles, Medellín");
    assert.equal(card.productSummary, "Mariposa azul ×1");
    assert.deepEqual(card.step, { label: "Enviar a despacho", to: "en_despacho" });
  });

  it("labels pickup orders and offers the direct delivery step", () => {
    const card = buildDispatchCard(makeOrder({ delivery_method: "tienda" }));
    assert.equal(card.deliveryMethod, "Recoge en tienda");
    assert.equal(card.step?.label, "Marcar entregado");
  });

  it("uses the dash when the customer has not filled the form or there is no date", () => {
    const card = buildDispatchCard(makeOrder({ saleDetails: null, desired_delivery_date: null }));
    assert.equal(card.recipient, DASH);
    assert.equal(card.recipientPhone, DASH);
    assert.equal(card.address, DASH);
    assert.equal(card.desiredDate, DASH);
  });

  it("ignores a draft sale_details row without submitted_at", () => {
    const base = makeOrder();
    const card = buildDispatchCard(
      makeOrder({ saleDetails: { ...base.saleDetails!, submitted_at: null } }),
    );
    assert.equal(card.recipient, DASH);
  });
});
