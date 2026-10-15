import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderTableRow } from "@/lib/data/orders";
import { DASH, buildOrderView, capRows, formatDate } from "./orderView.ts";

function makeOrder(overrides: Partial<OrderTableRow> = {}): OrderTableRow {
  return {
    id: "ord-1",
    human_number: "TEST0007",
    chat_id: "573001112233",
    status: "paid",
    payment_status: "approved",
    fulfillment_status: "en_construccion",
    grand_total: 185000,
    delivery_method: "Domicilio",
    advisor_name: "Agente virtual",
    supplier_name: null,
    created_at: "2026-10-01T15:00:00.000Z",
    confirmed_at: "2026-10-02T03:30:00.000Z",
    delivery_distance_km: 4,
    delivery_fee: 12000,
    payment_source: "PSE",
    occasion: "Cumpleaños",
    desired_delivery_date: "2026-10-20",
    productSummary: "Mariposa azul ×1, Chocolates x 9 ×2",
    totalQty: 3,
    productCost: 173000,
    saleDetails: {
      submitted_at: "2026-10-02T03:00:00.000Z",
      buyer_name: "Ana Pérez",
      buyer_email: "ana@example.com",
      delivery_address_exact: "Calle 1 # 2-3",
      delivery_unit: "Apto 401",
      neighborhood: "Laureles",
      city: "Medellín",
      building_name: null,
      recipient_name: "Luis",
      recipient_phone: "3009998877",
      may_call_recipient: true,
      card_from: "Ana",
      card_to: "Luis",
      card_message: "Feliz cumpleaños, te quiero mucho.",
      special_notes: "Entregar antes del mediodía",
      wants_invoice: true,
      invoice_legal_name: null,
      invoice_tax_id: null,
      invoice_email: null,
      referral_source: "Instagram",
    },
    ...overrides,
  };
}

function allFields(order: OrderTableRow) {
  return buildOrderView(order).groups.flatMap((g) => g.fields);
}

function valueOf(order: OrderTableRow, key: string) {
  return allFields(order).find((f) => f.key === key)?.value;
}

describe("formatDate", () => {
  it("returns the dash for null and empty values", () => {
    assert.equal(formatDate(null), DASH);
    assert.equal(formatDate(""), DASH);
  });

  it("formats date-only values as written, without a timezone shift", () => {
    assert.equal(formatDate("2026-10-20"), "20/10/2026");
  });

  it("formats timestamps in America/Bogota, not UTC", () => {
    // 03:30Z on Oct 2 is still Oct 1 at 22:30 in Bogotá (UTC-5).
    assert.equal(formatDate("2026-10-02T03:30:00.000Z"), "1/10/2026");
  });

  it("shows an unparseable value as stored instead of 'Invalid Date'", () => {
    assert.equal(formatDate("pronto"), "pronto");
  });
});

describe("buildOrderView row", () => {
  it("carries the order number, buyer, seller, creation date and amount", () => {
    const { row } = buildOrderView(makeOrder());
    assert.equal(row.humanNumber, "TEST0007");
    assert.equal(row.buyerLabel, "Ana Pérez");
    assert.equal(row.seller, "Agente virtual");
    assert.equal(row.createdDate, "1/10/2026");
    assert.match(row.amount, /185\.000/);
  });

  it("shows the creation date even when the order was confirmed on another day", () => {
    const row = buildOrderView(makeOrder({ confirmed_at: "2026-10-05T15:00:00.000Z" })).row;
    assert.equal(row.createdDate, "1/10/2026");
  });

  it("shows the dash for a null or blank seller", () => {
    assert.equal(buildOrderView(makeOrder({ advisor_name: null })).row.seller, DASH);
    assert.equal(buildOrderView(makeOrder({ advisor_name: "   " })).row.seller, DASH);
  });

  it("says whether the buyer asked for an invoice, or the dash while unanswered", () => {
    assert.equal(buildOrderView(makeOrder()).row.invoice, "Sí");

    const no = makeOrder();
    no.saleDetails = { ...no.saleDetails!, wants_invoice: false };
    assert.equal(buildOrderView(no).row.invoice, "No");

    const unsubmitted = makeOrder();
    unsubmitted.saleDetails = { ...unsubmitted.saleDetails!, wants_invoice: false, submitted_at: null };
    assert.equal(buildOrderView(unsubmitted).row.invoice, DASH);
    assert.equal(buildOrderView(makeOrder({ saleDetails: null })).row.invoice, DASH);
  });

  it("derives the single Estado", () => {
    assert.equal(buildOrderView(makeOrder({ status: "pagado" })).row.state, "en_construccion");
    const proof = buildOrderView(
      makeOrder({ status: "abierto", payment_status: "comprobante_recibido", fulfillment_status: null }),
    ).row;
    assert.equal(proof.state, "pendiente_aprobacion");
  });

  // El estado solo avanza por proceso (Producción y Despachos): la fila no lleva
  // nada con qué editarlo.
  it("carries nothing to edit the status from the row", () => {
    const row = buildOrderView(makeOrder({ status: "pagado" })).row;
    assert.ok(!("editable" in row) && !("fulfillmentStatus" in row));
  });

  it("falls back to chat_id when there is no buyer name", () => {
    const noSale = buildOrderView(makeOrder({ saleDetails: null })).row;
    assert.equal(noSale.buyerLabel, "573001112233");
    const blank = makeOrder();
    blank.saleDetails = { ...blank.saleDetails!, buyer_name: "" };
    assert.equal(buildOrderView(blank).row.buyerLabel, "573001112233");
  });
});

describe("buildOrderView groups", () => {
  it("returns only the six summary fields, in three groups", () => {
    const groups = buildOrderView(makeOrder()).groups;
    assert.deepEqual(
      groups.map((g) => [g.title, g.fields.map((f) => f.label)]),
      [
        ["Entrega", ["Tipo de envío", "Fecha de entrega"]],
        ["Comprador", ["Comprador", "Celular comprador"]],
        ["Pago", ["Valor a pagar", "Tipo de pago"]],
      ],
    );
  });

  it("turns null and empty fields into the dash", () => {
    const order = makeOrder({ delivery_method: null, desired_delivery_date: null, payment_source: "", saleDetails: null });
    assert.equal(valueOf(order, "deliveryMethod"), DASH);
    assert.equal(valueOf(order, "deliveryDate"), DASH);
    assert.equal(valueOf(order, "paymentSource"), DASH);
    assert.equal(valueOf(order, "buyer"), DASH);
  });

  it("formats money as COP and the delivery date as es-CO", () => {
    const order = makeOrder();
    assert.match(valueOf(order, "total")!, /185\.000/);
    assert.equal(valueOf(order, "deliveryDate"), "20/10/2026");
    assert.equal(valueOf(order, "paymentSource"), "PSE");
  });

  // El resto (tarjeta, mensaje, dirección, destinatario, productos, proveedor)
  // se consulta en el detalle del pedido, no en la lista.
  it("leaves the card, address, recipient, products and supplier out of the list", () => {
    const json = JSON.stringify(buildOrderView(makeOrder({ supplier_name: "Taller Sol" })));
    for (const hidden of ["Feliz cumpleaños", "Calle 1 # 2-3", "Luis", "Mariposa azul", "Taller Sol"]) {
      assert.ok(!json.includes(hidden), `still exposed: ${hidden}`);
    }
  });

  it("links to the detail page", () => {
    assert.equal(buildOrderView(makeOrder()).openHref, "/admin/pedidos/ord-1");
  });
});

describe("panel orders", () => {
  function panelOrder() {
    const order = makeOrder({ chat_id: "panel:0f0e-uuid", deliveryZone: 2 });
    order.saleDetails = { ...order.saleDetails!, buyer_phone: "3009998877" };
    return order;
  }

  it("shows the buyer phone from sale_details instead of the synthetic chat id", () => {
    assert.equal(valueOf(panelOrder(), "buyerPhone"), "3009998877");
    assert.equal(buildOrderView(panelOrder()).row.buyerLabel, "Ana Pérez");
  });

  it("never shows the synthetic id when the panel order has no sale details", () => {
    const order = makeOrder({ chat_id: "panel:0f0e-uuid", saleDetails: null });
    assert.equal(valueOf(order, "buyerPhone"), DASH);
    assert.equal(buildOrderView(order).row.buyerLabel, DASH);
  });

  it("leaves assistant orders unchanged", () => {
    assert.equal(valueOf(makeOrder(), "buyerPhone"), "573001112233");
  });
});

describe("capRows", () => {
  it("keeps everything when the count is at or under the cap", () => {
    assert.deepEqual(capRows([1, 2, 3], 3), { shown: [1, 2, 3], hasMore: false });
    assert.deepEqual(capRows([], 3), { shown: [], hasMore: false });
  });

  it("trims the probe row and flags that there are more", () => {
    assert.deepEqual(capRows([1, 2, 3, 4], 3), { shown: [1, 2, 3], hasMore: true });
  });
});
