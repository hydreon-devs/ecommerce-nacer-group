import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LostOrderRow } from "@/lib/data/orders";
import { DASH } from "../pedidos/orderView.ts";
import { buildLostCard } from "./lostView.ts";

const NOW = new Date("2026-10-13T15:00:00.000Z");

function makeOrder(overrides: Partial<LostOrderRow> = {}): LostOrderRow {
  return {
    id: "ord-1",
    human_number: "TEST0009",
    chat_id: "573001112233",
    status: "pagado",
    payment_status: "aprobado",
    fulfillment_status: "perdido",
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
    desired_delivery_date: "2026-10-10",
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
      recipient_name: "Luis Gómez",
      recipient_phone: "3009998877",
      may_call_recipient: true,
      card_from: null,
      card_to: null,
      card_message: null,
      special_notes: null,
      wants_invoice: false,
      invoice_legal_name: null,
      invoice_tax_id: null,
      invoice_email: null,
      referral_source: null,
    },
    lost_reason: "Se rompió en el camino",
    lost_at: "2026-10-08T15:00:00.000Z",
    lost_resolution: null,
    lost_resolution_note: null,
    lost_resolved_at: null,
    ...overrides,
  };
}

describe("buildLostCard", () => {
  it("builds a pending card", () => {
    const card = buildLostCard(makeOrder(), NOW);
    assert.equal(card.humanNumber, "TEST0009");
    assert.equal(card.href, "/admin/pedidos/ord-1");
    assert.equal(card.lostOn, "8/10/2026 · hace 5 días");
    assert.equal(card.reason, "Se rompió en el camino");
    assert.deepEqual(card.lines, [{ name: "Mariposa azul", sku: "MAR-AZ-01", qty: 1 }]);
    assert.match(card.total, /185\.000/);
    assert.equal(card.buyerName, "Ana Pérez");
    assert.equal(card.buyerPhone, "573001112233");
    assert.equal(card.recipient, "Luis Gómez");
    assert.equal(card.recipientPhone, "3009998877");
    assert.equal(card.address, "Cra 5 # 6-7, Apto 301, Laureles, Medellín");
    assert.equal(card.resolution, null);
  });

  it("falls back when reason and date are missing", () => {
    const card = buildLostCard(makeOrder({ lost_reason: null, lost_at: null }), NOW);
    assert.equal(card.reason, "Sin motivo registrado");
    assert.equal(card.lostOn, "Fecha no registrada");
    assert.equal(buildLostCard(makeOrder({ lost_reason: "  " }), NOW).reason, "Sin motivo registrado");
  });

  it("uses singular and today wording", () => {
    assert.match(buildLostCard(makeOrder({ lost_at: "2026-10-12T15:00:00.000Z" }), NOW).lostOn, /hace 1 día$/);
    assert.match(buildLostCard(makeOrder({ lost_at: "2026-10-13T12:00:00.000Z" }), NOW).lostOn, /hoy$/);
  });

  it("shows dashes for a draft sale form and uses the panel phone for panel orders", () => {
    const draft = makeOrder({
      saleDetails: { ...makeOrder().saleDetails!, submitted_at: null },
    });
    const card = buildLostCard(draft, NOW);
    assert.equal(card.recipient, DASH);
    assert.equal(card.address, DASH);

    const panel = makeOrder({
      chat_id: "panel:abc",
      saleDetails: { ...makeOrder().saleDetails!, buyer_phone: "3001234567" },
    });
    assert.equal(buildLostCard(panel, NOW).buyerPhone, "3001234567");
  });

  it("builds the resolution of a resolved card", () => {
    const card = buildLostCard(
      makeOrder({
        lost_resolution: "reembolsado",
        lost_resolution_note: "Devuelto por Nequi",
        lost_resolved_at: "2026-10-12T15:00:00.000Z",
      }),
      NOW,
    );
    assert.deepEqual(card.resolution, {
      label: "Reembolsado",
      note: "Devuelto por Nequi",
      date: "12/10/2026",
    });
  });

  it("has no note when none was saved", () => {
    const card = buildLostCard(
      makeOrder({ lost_resolution: "repuesto", lost_resolved_at: "2026-10-12T15:00:00.000Z" }),
      NOW,
    );
    assert.equal(card.resolution?.note, null);
  });
});
