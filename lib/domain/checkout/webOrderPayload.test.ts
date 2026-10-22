import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateWebOrderPayload,
  buildOrderRequest,
  cartToOrderLines,
  orderRequestSignature,
} from "./webOrderPayload.ts";
import { emptyDetailsDraft, validateDetails, type DetailsDraft, type SaleDetails } from "./saleDetails.ts";

const ATTEMPT = "6f1c2b7e-1111-4222-8333-444455556666";
const OLD = "0a0a0a0a-2222-4333-8444-555566667777";

const CART_LINES = [
  {
    sku: "CRI-001-A",
    cantidad: 2,
    adicionales: [
      { id: "opt-1", nombre: "Tarjeta 3D", precioCop: 12000, maxCantidad: 3, cantidad: 1 },
      { id: "opt-2", nombre: "Chocolates x 9", precioCop: 30000, maxCantidad: 2, cantidad: 2 },
    ],
  },
  { sku: "COM-002-A", cantidad: 1, adicionales: [] },
];

function draft(patch: Partial<DetailsDraft> = {}): DetailsDraft {
  return {
    ...emptyDetailsDraft(),
    buyer_name: "Ana Restrepo",
    buyer_phone: "300 123 4567",
    recipient_name: "Luisa Gómez",
    recipient_phone: "3105550100",
    may_call_recipient: "No",
    wants_invoice: "No",
    occasion: "condolencias",
    card_message: "Con cariño",
    special_notes: "Portería",
    ...patch,
  };
}

function details(method: "tienda" | "domicilio", patch: Partial<DetailsDraft> = {}): SaleDetails {
  const r = validateDetails(draft(patch), method);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
}

const HOME = {
  method: "domicilio" as const,
  address: "Cl. 10 #5-20, Envigado, Antioquia, Colombia",
  distanceM: 5421,
  neighborhood: "Zona 4",
  city: "Envigado",
  unit: "Torre 2 apto 301",
  building: "Unidad Los Almendros",
  date: "2026-10-23",
};

describe("cartToOrderLines", () => {
  it("maps variant SKU, quantity and adicionales by name and quantity", () => {
    assert.deepEqual(cartToOrderLines(CART_LINES), [
      { sku: "CRI-001-A", qty: 2, options: [{ name: "Tarjeta 3D", qty: 1 }, { name: "Chocolates x 9", qty: 2 }] },
      { sku: "COM-002-A", qty: 1, options: [] },
    ]);
  });

  it("drops adicionales with zero quantity", () => {
    const [line] = cartToOrderLines([{ ...CART_LINES[0], adicionales: [{ ...CART_LINES[0].adicionales[0], cantidad: 0 }] }]);
    assert.deepEqual(line.options, []);
  });
});

describe("buildCreateWebOrderPayload: home delivery", () => {
  const payload = buildCreateWebOrderPayload({
    attemptId: ATTEMPT,
    replacesAttemptId: OLD,
    lines: cartToOrderLines(CART_LINES),
    delivery: HOME,
    details: details("domicilio"),
  });

  it("carries the attempt ids and the lines in the database shape", () => {
    assert.equal(payload.attempt_id, ATTEMPT);
    assert.equal(payload.replaces_attempt_id, OLD);
    assert.deepEqual(payload.lines[0], {
      variant_sku: "CRI-001-A",
      qty: 2,
      options: [{ name: "Tarjeta 3D", qty: 1 }, { name: "Chocolates x 9", qty: 2 }],
    });
    assert.deepEqual(payload.lines[1], { variant_sku: "COM-002-A", qty: 1, options: [] });
  });

  it("sends the delivery with the server-measured distance and the chosen date", () => {
    assert.deepEqual(payload.delivery, { method: "domicilio", address: HOME.address, distance_m: 5421 });
    assert.equal(payload.desired_delivery_date, "2026-10-23");
  });

  it("puts the occasion at the top level, not inside details", () => {
    assert.equal(payload.occasion, "condolencias");
    assert.equal("occasion" in payload.details, false);
  });

  it("fills the address fields of details from step 1", () => {
    assert.equal(payload.details.neighborhood, "Zona 4");
    assert.equal(payload.details.city, "Envigado");
    assert.equal(payload.details.delivery_unit, "Torre 2 apto 301");
    assert.equal(payload.details.building_name, "Unidad Los Almendros");
  });

  it("sends the normalized form values and Sí/No answers", () => {
    assert.equal(payload.details.buyer_phone, "573001234567");
    assert.equal(payload.details.recipient_phone, "573105550100");
    assert.equal(payload.details.may_call_recipient, "No");
    assert.equal(payload.details.wants_invoice, "No");
    assert.equal(payload.details.card_message, "Con cariño");
    assert.equal(payload.details.special_notes, "Portería");
    assert.equal(payload.details.buyer_email, null);
  });

  it("never sends a price, a total or a fee", () => {
    const json = JSON.stringify(payload);
    assert.doesNotMatch(json, /price|precio|total|fee|valor|cop/i);
  });
});

describe("buildCreateWebOrderPayload: pickup", () => {
  const payload = buildCreateWebOrderPayload({
    attemptId: ATTEMPT,
    replacesAttemptId: null,
    lines: cartToOrderLines(CART_LINES),
    delivery: { method: "tienda", date: "2026-10-22" },
    details: details("tienda"),
  });

  it("strips the address, the distance and every address field", () => {
    assert.deepEqual(payload.delivery, { method: "tienda", address: null, distance_m: null });
    for (const key of ["neighborhood", "city", "delivery_unit", "building_name"]) {
      assert.equal(key in payload.details, false, key);
    }
    assert.equal(payload.replaces_attempt_id, null);
    assert.equal(payload.desired_delivery_date, "2026-10-22");
  });

  it("keeps everything else the form collected", () => {
    assert.equal(payload.details.recipient_name, "Luisa Gómez");
    assert.equal(payload.details.special_notes, "Portería");
  });
});

describe("buildCreateWebOrderPayload: optional values", () => {
  it("sends null for an optional occasion and for blank optionals", () => {
    const payload = buildCreateWebOrderPayload({
      attemptId: ATTEMPT,
      replacesAttemptId: null,
      lines: [],
      delivery: { method: "tienda", date: "2026-10-22" },
      details: details("tienda", { occasion: "", card_message: "", special_notes: "" }),
    });
    assert.equal(payload.occasion, null);
    assert.equal(payload.details.card_message, null);
    assert.equal(payload.details.special_notes, null);
  });

  it("omits blank unit and building on delivery", () => {
    const payload = buildCreateWebOrderPayload({
      attemptId: ATTEMPT,
      replacesAttemptId: null,
      lines: [],
      delivery: { ...HOME, unit: undefined, building: undefined },
      details: details("domicilio"),
    });
    assert.equal(payload.details.delivery_unit, null);
    assert.equal(payload.details.building_name, null);
  });

  it("sends the invoice data when requested", () => {
    const payload = buildCreateWebOrderPayload({
      attemptId: ATTEMPT,
      replacesAttemptId: null,
      lines: [],
      delivery: { method: "tienda", date: "2026-10-22" },
      details: details("tienda", {
        wants_invoice: "Sí", invoice_legal_name: "Flores SAS", invoice_tax_id: "900.123.456-7", invoice_email: "F@Flores.co",
      }),
    });
    assert.equal(payload.details.wants_invoice, "Sí");
    assert.equal(payload.details.invoice_tax_id, "900123456-7");
    assert.equal(payload.details.invoice_email, "f@flores.co");
  });
});

describe("order request and its signature", () => {
  const STEP = {
    method: "domicilio" as const,
    address: "Calle 10 #5-20",
    municipality: "Envigado" as const,
    neighborhood: "Zona 4",
    unit: "Torre 2",
    building: "Los Almendros",
    resolvedAddress: "Cl. 10 #5-20, Envigado",
    meters: 5421,
    feeCop: 25000,
    confirmed: true as const,
    date: "2026-10-23",
  };

  it("builds the action input from cart, delivery step and form draft, without any price", () => {
    const req = buildOrderRequest(CART_LINES, STEP, draft());
    assert.equal(req.lines.length, 2);
    assert.deepEqual(req.delivery, {
      method: "domicilio",
      address: "Calle 10 #5-20",
      municipality: "Envigado",
      neighborhood: "Zona 4",
      unit: "Torre 2",
      building: "Los Almendros",
      date: "2026-10-23",
    });
    assert.doesNotMatch(JSON.stringify(req), /meters|feeCop|resolvedAddress|price|precio/);
  });

  it("builds a pickup request with only the date", () => {
    const req = buildOrderRequest(CART_LINES, { method: "tienda", date: "2026-10-22" }, draft());
    assert.deepEqual(req.delivery, { method: "tienda", date: "2026-10-22" });
  });

  it("signs identical requests identically and changes with the cart, the delivery or the details", () => {
    const base = orderRequestSignature(buildOrderRequest(CART_LINES, STEP, draft()));
    assert.equal(orderRequestSignature(buildOrderRequest(CART_LINES, STEP, draft())), base);
    assert.notEqual(orderRequestSignature(buildOrderRequest([CART_LINES[0]], STEP, draft())), base);
    assert.notEqual(orderRequestSignature(buildOrderRequest(CART_LINES, { ...STEP, date: "2026-10-24" }, draft())), base);
    assert.notEqual(orderRequestSignature(buildOrderRequest(CART_LINES, STEP, draft({ card_message: "Otro" }))), base);
  });
});
