import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderDetail, SaleDetails } from "@/lib/data/orders";
import { formatCop } from "../../../../../lib/format.ts";
import { DASH } from "../orderView.ts";
import { buildOrderDetailView } from "./orderDetail.ts";

function makeSale(overrides: Partial<SaleDetails> = {}): SaleDetails {
  return {
    submitted_at: "2026-10-02T03:00:00.000Z",
    buyer_name: "Ana Pérez",
    buyer_email: "ana@example.com",
    delivery_address_exact: "Calle 1 # 2-3",
    delivery_unit: "Apto 401",
    neighborhood: "Laureles",
    city: "Medellín",
    building_name: "Edificio Sol",
    recipient_name: "Luis",
    recipient_phone: "300 999 8877",
    may_call_recipient: true,
    card_from: "Ana",
    card_to: "Luis",
    card_message: "Feliz cumpleaños.\nTe quiero mucho.",
    special_notes: "Entregar antes del mediodía",
    wants_invoice: true,
    invoice_legal_name: "Ana SAS",
    invoice_tax_id: "900123456-7",
    invoice_email: "facturas@example.com",
    referral_source: "Instagram",
    ...overrides,
  };
}

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "ord-1",
    human_number: "TEST0007",
    chat_id: "573001112233",
    status: "pagado",
    payment_status: "aprobado",
    fulfillment_status: "en_construccion",
    grand_total: 185000,
    total_price: 173000,
    delivery_fee: 12000,
    delivery_method: "domicilio",
    delivery_distance_km: 4,
    delivery_address: "Cra 5 # 6-7",
    payment_source: "mercadopago",
    payment_ref: "MP-123",
    paid_amount: 185000,
    occasion: "Cumpleaños",
    desired_delivery_date: "2026-10-20",
    advisor_name: null,
    supplier_name: null,
    created_at: "2026-10-01T15:00:00.000Z",
    confirmed_at: "2026-10-02T03:30:00.000Z",
    lines: [
      { variantSku: "MAR-001", productName: "Mariposa azul", qty: 1, unitPrice: 100000, totalPrice: 100000 },
      { variantSku: "MAR-001", productName: "Mariposa azul", qty: 1, unitPrice: 73000, totalPrice: 73000 },
    ],
    saleDetails: makeSale(),
    ...overrides,
  };
}

describe("panel orders", () => {
  function panelOrder() {
    return makeOrder({
      chat_id: "panel:0f0e-uuid",
      deliveryZone: 3,
      saleDetails: makeSale({ buyer_phone: "3009998877" }),
    });
  }

  it("shows the buyer phone instead of the synthetic WhatsApp id", () => {
    const view = buildOrderDetailView(panelOrder());
    const phone = view.buyer.find((f) => f.label === "Celular");
    assert.equal(phone?.value, "3009998877");
    assert.equal(phone?.href, "tel:3009998877");
    assert.ok(!JSON.stringify(view.buyer).includes("panel:"));
    assert.ok(!view.buyer.some((f) => f.label === "WhatsApp"));
  });

  it("shows the zone instead of the kilometres", () => {
    const { delivery } = buildOrderDetailView(panelOrder());
    assert.equal(delivery.distance, "Zona 3");
    assert.equal(delivery.distanceLabel, "Zona");
  });

  it("keeps the WhatsApp link and kilometres for assistant orders", () => {
    const view = buildOrderDetailView(makeOrder());
    assert.equal(view.buyer.find((f) => f.label === "WhatsApp")?.href, "https://wa.me/573001112233");
    assert.equal(view.delivery.distance, "4 km");
  });
});

describe("status indicators", () => {
  it("shows the single derived Estado", () => {
    assert.equal(buildOrderDetailView(makeOrder({ status: "pagado" })).state.value, "En construcción");
    assert.equal(
      buildOrderDetailView(makeOrder({ status: "pagado", fulfillment_status: "preparado" })).state.value,
      "Preparado",
    );
    assert.equal(
      buildOrderDetailView(makeOrder({ status: "abierto", payment_status: "comprobante_recibido" })).state
        .value,
      "Pendiente por aprobar",
    );
    assert.equal(buildOrderDetailView(makeOrder({ status: "cancelado" })).state.value, "Cancelado");
  });

  it("captions the date as confirmed or, without confirmation, as created", () => {
    assert.equal(buildOrderDetailView(makeOrder()).dateLine, "Confirmado el 1/10/2026");
    assert.equal(
      buildOrderDetailView(makeOrder({ status: "abierto", confirmed_at: null })).dateLine,
      "Creado el 1/10/2026",
    );
  });

  it("shows no paid amount for an order that is not paid", () => {
    const { payment } = buildOrderDetailView(makeOrder({ status: "abierto", paid_amount: 0 }));
    assert.equal(payment.paidAmount, DASH);
  });

  // El estado solo avanza por proceso (Producción y Despachos): el detalle no
  // lleva nada con qué editarlo.
  it("carries nothing to edit the status from the detail", () => {
    const view = buildOrderDetailView(makeOrder({ status: "pagado" }));
    assert.ok(!("editable" in view) && !("fulfillmentStatus" in view));
  });

  it("keeps a visible label on every indicator", () => {
    const view = buildOrderDetailView(makeOrder());
    assert.deepEqual([view.state.label, view.invoiceStatus.label], ["Estado", "Factura"]);
  });

  it("derives Factura in three ways", () => {
    const requested = buildOrderDetailView(makeOrder());
    assert.equal(requested.invoiceStatus.value, "Solicitada");
    const notRequested = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ wants_invoice: false }) }),
    );
    assert.equal(notRequested.invoiceStatus.value, "No solicitada");
    const notSubmitted = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ submitted_at: null, wants_invoice: null }) }),
    );
    assert.equal(notSubmitted.invoiceStatus.value, DASH);
    assert.equal(buildOrderDetailView(makeOrder({ saleDetails: null })).invoiceStatus.value, DASH);
  });
});

describe("not-submitted state", () => {
  it("flags a paid order with no submitted form as waiting for the customer", () => {
    const view = buildOrderDetailView(makeOrder({ saleDetails: null }));
    assert.equal(view.submitted, false);
    assert.equal(view.waitingForCustomer, true);
  });

  it("does not warn when the order is not paid or the form is in", () => {
    assert.equal(buildOrderDetailView(makeOrder()).waitingForCustomer, false);
    assert.equal(
      buildOrderDetailView(makeOrder({ status: "abierto", saleDetails: null })).waitingForCustomer,
      false,
    );
  });

  it("falls back to the order-level address and drops form-only data", () => {
    const view = buildOrderDetailView(makeOrder({ saleDetails: null }));
    assert.deepEqual(view.delivery.addressLines, [{ label: "Dirección", value: "Cra 5 # 6-7" }]);
    assert.equal(view.delivery.recipient.length, 0);
    assert.equal(view.card.hasContent, false);
    assert.equal(view.invoice.state, "pending");
  });

  it("gives no address lines when there is neither form nor order address", () => {
    const view = buildOrderDetailView(makeOrder({ saleDetails: null, delivery_address: null }));
    assert.deepEqual(view.delivery.addressLines, []);
  });
});

describe("card block", () => {
  it("shows message only, without sender or recipient", () => {
    const view = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ card_from: null, card_to: "", special_notes: null }) }),
    );
    assert.equal(view.card.from, null);
    assert.equal(view.card.to, null);
    assert.equal(view.card.message, "Feliz cumpleaños.\nTe quiero mucho.");
    assert.equal(view.card.notes, null);
    assert.equal(view.card.hasContent, true);
  });

  it("shows sender only", () => {
    const view = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ card_to: null, card_message: null }) }),
    );
    assert.equal(view.card.from, "Ana");
    assert.equal(view.card.to, null);
    assert.equal(view.card.message, null);
  });

  it("shows everything, notes included", () => {
    const { card } = buildOrderDetailView(makeOrder());
    assert.deepEqual(
      [card.from, card.to, card.notes],
      ["Ana", "Luis", "Entregar antes del mediodía"],
    );
  });

  it("is empty when the form is in but no card data was given", () => {
    const view = buildOrderDetailView(
      makeOrder({
        saleDetails: makeSale({ card_from: null, card_to: null, card_message: null, special_notes: null }),
      }),
    );
    assert.equal(view.card.hasContent, false);
  });
});

describe("recipient phone link", () => {
  const phone = (may: boolean | null) =>
    buildOrderDetailView(makeOrder({ saleDetails: makeSale({ may_call_recipient: may }) })).delivery
      .recipient.find((f) => f.label === "Teléfono");

  it("links with tel: only when calling is allowed", () => {
    const field = phone(true);
    assert.equal(field?.href, "tel:3009998877");
    assert.equal(field?.value, "300 999 8877");
    assert.equal(field?.note, undefined);
  });

  it("is plain text with a do-not-call note when calling is not allowed", () => {
    const field = phone(false);
    assert.equal(field?.href, undefined);
    assert.equal(field?.value, "300 999 8877");
    assert.match(field?.note ?? "", /no llamar/i);
  });

  it("is plain text without a note when the answer is unknown", () => {
    const field = phone(null);
    assert.equal(field?.href, undefined);
    assert.equal(field?.note, undefined);
  });
});

describe("buyer contact links", () => {
  const buyer = (o: Partial<OrderDetail>) => buildOrderDetailView(makeOrder(o)).buyer;

  it("links email with mailto:", () => {
    assert.equal(buyer({}).find((f) => f.label === "Correo")?.href, "mailto:ana@example.com");
  });

  it("links WhatsApp only for an all-digit chat_id", () => {
    const wa = (chat: string) => buyer({ chat_id: chat }).find((f) => f.label === "WhatsApp");
    assert.equal(wa("573001112233")?.href, "https://wa.me/573001112233");
    assert.equal(wa("web-abc123")?.href, undefined);
    assert.equal(wa("+57 300")?.href, undefined);
    assert.equal(wa("web-abc123")?.value, "web-abc123");
  });
});

describe("address lines", () => {
  it("lists one datum per line in order and omits missing parts", () => {
    const view = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ delivery_unit: null, building_name: "" }) }),
    );
    assert.deepEqual(view.delivery.addressLines, [
      { label: "Dirección", value: "Calle 1 # 2-3" },
      { label: "Barrio", value: "Laureles" },
      { label: "Ciudad", value: "Medellín" },
    ]);
  });

  it("includes unit and building when present", () => {
    const labels = buildOrderDetailView(makeOrder()).delivery.addressLines.map((l) => l.label);
    assert.deepEqual(labels, ["Dirección", "Unidad / Apto", "Edificio", "Barrio", "Ciudad"]);
  });
});

describe("delivery", () => {
  it("renders the date-only delivery date without a day shift", () => {
    assert.equal(buildOrderDetailView(makeOrder()).delivery.date, "20/10/2026");
    assert.equal(buildOrderDetailView(makeOrder({ desired_delivery_date: null })).delivery.date, DASH);
  });

  it("formats the confirmation date in Bogotá time", () => {
    assert.equal(buildOrderDetailView(makeOrder()).confirmedAt, "1/10/2026");
  });

  it("shows distance in km or the dash", () => {
    assert.equal(buildOrderDetailView(makeOrder()).delivery.distance, "4 km");
    assert.equal(buildOrderDetailView(makeOrder({ delivery_distance_km: null })).delivery.distance, DASH);
  });
});

describe("payment summary", () => {
  it("keeps stored amounts as integer COP without recomputing the total", () => {
    const { payment } = buildOrderDetailView(makeOrder({ grand_total: 999000 }));
    assert.equal(payment.subtotal, formatCop(173000));
    assert.equal(payment.deliveryFee, formatCop(12000));
    assert.equal(payment.total, formatCop(999000));
  });

  it("shows a paid amount that differs from the total as stored", () => {
    const { payment } = buildOrderDetailView(makeOrder({ paid_amount: 100 }));
    assert.equal(payment.paidAmount, formatCop(100));
  });

  it("uses the dash for missing method, reference and paid amount", () => {
    const { payment } = buildOrderDetailView(
      makeOrder({ payment_source: null, payment_ref: null, paid_amount: null }),
    );
    assert.deepEqual([payment.method, payment.reference, payment.paidAmount], [DASH, DASH, DASH]);
  });
});

describe("products and invoice", () => {
  it("gives every line a distinct key even when SKUs repeat", () => {
    const keys = buildOrderDetailView(makeOrder()).lines.map((l) => l.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("shows invoice data one datum per line when requested", () => {
    const { invoice } = buildOrderDetailView(makeOrder());
    assert.equal(invoice.state, "requested");
    assert.deepEqual(
      invoice.fields.map((f) => f.label),
      ["Razón social", "NIT / documento", "Correo de facturación"],
    );
  });

  it("reports not requested when the form came in without an invoice", () => {
    const { invoice } = buildOrderDetailView(
      makeOrder({ saleDetails: makeSale({ wants_invoice: false }) }),
    );
    assert.equal(invoice.state, "none");
  });
});

describe("draft sale_details row (submitted_at null)", () => {
  const draft = () =>
    buildOrderDetailView(makeOrder({ saleDetails: makeSale({ submitted_at: null }) }));

  it("treats every form-dependent datum as absent", () => {
    const view = draft();
    assert.equal(view.submitted, false);
    assert.equal(view.card.hasContent, false);
    assert.deepEqual(
      [view.card.from, view.card.to, view.card.message, view.card.notes],
      [null, null, null, null],
    );
    assert.deepEqual(view.delivery.recipient, []);
    assert.equal(view.invoice.state, "pending");
    assert.deepEqual(view.invoice.fields, []);
    assert.equal(view.invoiceStatus.value, DASH);
    const byLabel = (label: string) => view.buyer.find((f) => f.label === label);
    assert.equal(byLabel("Nombre")?.value, DASH);
    assert.equal(byLabel("Correo")?.value, DASH);
    assert.equal(byLabel("Correo")?.href, undefined);
    assert.equal(byLabel("Canal de origen")?.value, DASH);
  });

  it("keeps chat_id visible and uses the order-level address as the only address", () => {
    const view = draft();
    assert.equal(view.buyer.find((f) => f.label === "WhatsApp")?.value, "573001112233");
    assert.deepEqual(view.delivery.addressLines, [{ label: "Dirección", value: "Cra 5 # 6-7" }]);
  });

  it("still warns when the order is paid", () => {
    assert.equal(draft().waitingForCustomer, true);
    const open = buildOrderDetailView(
      makeOrder({ status: "abierto", saleDetails: makeSale({ submitted_at: null }) }),
    );
    assert.equal(open.waitingForCustomer, false);
  });
});

describe("single address source", () => {
  it("never lists the order-level address once the form is submitted", () => {
    const lines = buildOrderDetailView(makeOrder()).delivery.addressLines;
    assert.equal(lines.filter((l) => l.label === "Dirección").length, 1);
    assert.equal(lines.find((l) => l.label === "Dirección")?.value, "Calle 1 # 2-3");
  });
});

describe("email link", () => {
  const email = (value: string) =>
    buildOrderDetailView(makeOrder({ saleDetails: makeSale({ buyer_email: value }) })).buyer.find(
      (f) => f.label === "Correo",
    );

  it("trims surrounding spaces before linking", () => {
    assert.equal(email("  ana@example.com ")?.href, "mailto:ana@example.com");
    assert.equal(email("  ana@example.com ")?.value, "ana@example.com");
  });

  it("shows text without a link when it has a query string or is not a plain address", () => {
    assert.equal(email("ana@example.com?cc=x@y.com")?.href, undefined);
    assert.equal(email("ana@example.com&bcc=x")?.href, undefined);
    assert.equal(email("ana @example.com")?.href, undefined);
    assert.equal(email("a@b@c.com")?.href, undefined);
    assert.equal(email("ana@example.com?cc=x@y.com")?.value, "ana@example.com?cc=x@y.com");
  });
});

describe("tel link edge cases", () => {
  const phone = (value: string) =>
    buildOrderDetailView(makeOrder({ saleDetails: makeSale({ recipient_phone: value }) })).delivery
      .recipient.find((f) => f.label === "Teléfono");

  it("keeps + only as the first character", () => {
    assert.equal(phone("+57 300 999 8877")?.href, "tel:+573009998877");
    assert.equal(phone("300+9998877")?.href, "tel:3009998877");
  });

  it("produces no link when there are no digits", () => {
    assert.equal(phone("+")?.href, undefined);
    assert.equal(phone("sin número")?.href, undefined);
  });
});

describe("empty and blank values", () => {
  it("gives no WhatsApp link for an empty or blank chat_id", () => {
    for (const chat of ["", "   "]) {
      const wa = buildOrderDetailView(makeOrder({ chat_id: chat })).buyer.find(
        (f) => f.label === "WhatsApp",
      );
      assert.equal(wa?.href, undefined);
      assert.equal(wa?.value, DASH);
    }
  });

  it("returns no lines for an empty lines array", () => {
    assert.deepEqual(buildOrderDetailView(makeOrder({ lines: [] })).lines, []);
  });

  it("counts a card with only special notes as content", () => {
    const { card } = buildOrderDetailView(
      makeOrder({
        saleDetails: makeSale({ card_from: null, card_to: null, card_message: null }),
      }),
    );
    assert.equal(card.hasContent, true);
    assert.equal(card.notes, "Entregar antes del mediodía");
  });
});

describe("header strip", () => {
  it("lists Estado, Factura and Vendedor in that order", () => {
    assert.deepEqual(buildOrderDetailView(makeOrder()).strip, [
      "state",
      "invoice",
      "seller",
    ]);
  });

  it("shows the seller as a plain label and value, with the dash for null or blank", () => {
    assert.deepEqual(buildOrderDetailView(makeOrder({ advisor_name: "Agente virtual" })).seller, {
      label: "Vendedor",
      value: "Agente virtual",
    });
    for (const name of [null, "  "]) {
      assert.deepEqual(buildOrderDetailView(makeOrder({ advisor_name: name })).seller, {
        label: "Vendedor",
        value: DASH,
      });
    }
  });

  it("has no payment indicator and no payment_status-derived value, whatever it holds", () => {
    for (const stored of ["aprobado", "pendiente", "algo-raro", null, "  "]) {
      const view = buildOrderDetailView(makeOrder({ payment_status: stored, status: "abierto" }));
      assert.ok(!("paymentStatus" in view));
      assert.equal(view.state.value, "Abierto");
      const json = JSON.stringify(view);
      for (const word of ["Aprobado", "Pendiente", "algo-raro", "Reembolsado", "Rechazado"]) {
        assert.ok(!json.includes(word), `leaked: ${word}`);
      }
    }
  });

  it("carries no internal-management or supplier data", () => {
    const view = buildOrderDetailView(makeOrder({ supplier_name: "Taller Sol" }));
    assert.ok(!("internal" in view));
    assert.ok(!("supplierName" in view));
    assert.ok(!JSON.stringify(view).includes("Taller Sol"));
  });
});
