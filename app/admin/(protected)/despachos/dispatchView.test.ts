import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderTableRow } from "@/lib/data/orders";
import { DASH } from "../pedidos/orderView.ts";
import { buildDispatchCard } from "./dispatchView.ts";

const TODAY = "2026-10-13";

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
    lines: [{ name: "Mariposa azul", sku: "MAR-AZ-01", qty: 1 }],
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
    const card = buildDispatchCard(makeOrder(), TODAY);
    assert.equal(card.humanNumber, "TEST0007");
    assert.equal(card.deliveryMethod, "Domicilio");
    assert.deepEqual(card.dateBadge, { text: "20/10/2026", tone: "upcoming" });
    assert.equal(card.recipient, "Luisa Gómez");
    assert.equal(card.recipientPhone, "3001234567");
    assert.equal(card.address, "Cra 5 # 6-7, Apto 301, Laureles, Medellín");
    assert.deepEqual(card.lines, [{ name: "Mariposa azul", sku: "MAR-AZ-01", qty: 1 }]);
    assert.deepEqual(card.step, { label: "Enviar a despacho", to: "en_despacho" });
  });

  it("labels pickup orders and offers the direct delivery step", () => {
    const card = buildDispatchCard(makeOrder({ delivery_method: "tienda" }), TODAY);
    assert.equal(card.deliveryMethod, "Recoge en tienda");
    assert.equal(card.step?.label, "Marcar entregado");
  });

  it("uses the dash when the customer has not filled the form or there is no date", () => {
    const card = buildDispatchCard(makeOrder({ saleDetails: null, desired_delivery_date: null }), TODAY);
    assert.equal(card.recipient, DASH);
    assert.equal(card.recipientPhone, DASH);
    assert.equal(card.address, DASH);
    assert.deepEqual(card.dateBadge, { text: "Sin fecha", tone: "none" });
  });

  it("ignores a draft sale_details row without submitted_at", () => {
    const base = makeOrder();
    const card = buildDispatchCard(
      makeOrder({ saleDetails: { ...base.saleDetails!, submitted_at: null } }),
      TODAY,
    );
    assert.equal(card.recipient, DASH);
  });
});

describe("buildDispatchCard date badge", () => {
  const badge = (date: string | null) =>
    buildDispatchCard(makeOrder({ desired_delivery_date: date }), TODAY).dateBadge;

  it("says Hoy for today", () => {
    assert.deepEqual(badge("2026-10-13"), { text: "Hoy", tone: "today" });
  });

  it("says how many days late, in singular and plural", () => {
    assert.deepEqual(badge("2026-10-12"), { text: "Atrasado · 1 día", tone: "overdue" });
    assert.deepEqual(badge("2026-10-10"), { text: "Atrasado · 3 días", tone: "overdue" });
  });
});

describe("buildDispatchCard lines, gift card and note", () => {
  it("lists one line per product with SKU and quantity, and never a price", () => {
    const card = buildDispatchCard(
      makeOrder({
        lines: [
          { name: "Mariposa azul", sku: "MAR-AZ-01", qty: 2 },
          { name: "Cofre", sku: "COF-01", qty: 1 },
        ],
      }),
      TODAY,
    );
    assert.equal(card.lines.length, 2);
    assert.deepEqual(card.lines[0], { name: "Mariposa azul", sku: "MAR-AZ-01", qty: 2 });
    assert.deepEqual(Object.keys(card.lines[0]).sort(), ["name", "qty", "sku"]);
  });

  it("has no lines when the order carries none", () => {
    assert.deepEqual(buildDispatchCard(makeOrder({ lines: undefined }), TODAY).lines, []);
  });

  it("shows De/Para only when the customer asked for a card", () => {
    const base = makeOrder();
    assert.equal(buildDispatchCard(base, TODAY).gift, null);
    const card = buildDispatchCard(
      makeOrder({
        saleDetails: { ...base.saleDetails!, card_from: " Ana ", card_to: "Luisa" },
      }),
      TODAY,
    );
    assert.deepEqual(card.gift, { from: "Ana", to: "Luisa" });
  });

  it("fills the missing side of the card with a dash", () => {
    const base = makeOrder();
    const card = buildDispatchCard(
      makeOrder({ saleDetails: { ...base.saleDetails!, card_from: "Ana", card_to: "  " } }),
      TODAY,
    );
    assert.deepEqual(card.gift, { from: "Ana", to: DASH });
  });

  it("shows the special note only when it exists", () => {
    const base = makeOrder();
    assert.equal(buildDispatchCard(base, TODAY).specialNote, null);
    const card = buildDispatchCard(
      makeOrder({ saleDetails: { ...base.saleDetails!, special_notes: " Portería 24h " } }),
      TODAY,
    );
    assert.equal(card.specialNote, "Portería 24h");
  });

  it("ignores gift card and note of a draft sale_details", () => {
    const base = makeOrder();
    const card = buildDispatchCard(
      makeOrder({
        saleDetails: {
          ...base.saleDetails!,
          submitted_at: null,
          card_from: "Ana",
          card_to: "Luisa",
          special_notes: "x",
        },
      }),
      TODAY,
    );
    assert.equal(card.gift, null);
    assert.equal(card.specialNote, null);
  });

  it("offers Perdido only for a paid order in dispatch", () => {
    assert.equal(buildDispatchCard(makeOrder(), TODAY).canMarkLost, false);
    assert.equal(
      buildDispatchCard(makeOrder({ fulfillment_status: "en_despacho" }), TODAY).canMarkLost,
      true,
    );
  });
});
