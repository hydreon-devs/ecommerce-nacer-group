import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWebOrder, type CreateWebOrderDeps } from "./createWebOrder.ts";
import type { DistanceProvider } from "./distanceProvider.ts";
import { createFakeDistanceProvider } from "./fakeDistanceProvider.ts";
import { emptyDetailsDraft } from "./saleDetails.ts";
import type { CreateWebOrderPayload } from "./webOrderPayload.ts";

const ATTEMPT = "6f1c2b7e-1111-4222-8333-444455556666";
const OLD = "0a0a0a0a-2222-4333-8444-555566667777";

const DETAILS = {
  ...emptyDetailsDraft(),
  buyer_name: "Ana Restrepo",
  buyer_phone: "300 123 4567",
  recipient_name: "Luisa Gómez",
  recipient_phone: "3105550100",
  may_call_recipient: "Sí",
  wants_invoice: "No",
  occasion: "cumpleaños",
};

const HOME = {
  method: "domicilio",
  address: "Calle 10 #5-20",
  municipality: "Envigado",
  neighborhood: "Zona 4",
  unit: "Torre 2",
  building: "Los Almendros",
  date: "2026-10-23",
};

function input(patch: Record<string, unknown> = {}) {
  return {
    attemptId: ATTEMPT,
    replacesAttemptId: null,
    lines: [{ sku: "CRI-001-A", qty: 2, options: [{ name: "Tarjeta 3D", qty: 1 }] }],
    delivery: HOME,
    details: DETAILS,
    ...patch,
  };
}

const RPC_OK = {
  ok: true,
  order_id: "7f1c2b7e-1111-4222-8333-444455556666",
  human_number: "W-0042",
  reutilizado: false,
  expires_at: "2026-10-22T20:30:00Z",
  subtotal: 180000,
  delivery_fee: 12000,
  grand_total: 192000,
  lines: [{ variant_sku: "CRI-001-A", qty: 2, unit_price: 90000, total_price: 180000, options: [] }],
};

function deps(
  rpcAnswer: unknown | ((p: CreateWebOrderPayload) => unknown) = RPC_OK,
  distance: DistanceProvider & { readonly calls?: string[] } = createFakeDistanceProvider({ ok: true, meters: 5421, resolvedAddress: "Cl. 10 #5-20, Envigado, Antioquia, Colombia" }),
) {
  const payloads: CreateWebOrderPayload[] = [];
  const d: CreateWebOrderDeps = {
    distance,
    rpc: async (p) => {
      payloads.push(p);
      if (typeof rpcAnswer === "function") return (rpcAnswer as (p: CreateWebOrderPayload) => unknown)(p);
      return rpcAnswer;
    },
  };
  return { d, payloads, distance };
}

describe("createWebOrder: success", () => {
  it("returns the server order", async () => {
    const { d } = deps();
    const r = await createWebOrder(input(), d);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.order.humanNumber, "W-0042");
      assert.equal(r.order.grandTotal, 192000);
    }
  });

  it("re-computes the distance server-side from the typed address and the municipality", async () => {
    const { d, distance, payloads } = deps();
    await createWebOrder(input(), d);
    assert.deepEqual(distance.calls, ["Calle 10 #5-20, Envigado, Antioquia, Colombia"]);
    assert.equal(payloads[0].delivery.distance_m, 5421);
    assert.equal(payloads[0].delivery.address, "Cl. 10 #5-20, Envigado, Antioquia, Colombia");
  });

  it("ignores any distance, fee or resolved address the client sends", async () => {
    const { d, payloads } = deps();
    await createWebOrder(
      input({ delivery: { ...HOME, meters: 1, distance_m: 1, feeCop: 0, resolvedAddress: "Mi casa" } }),
      d,
    );
    assert.equal(payloads[0].delivery.distance_m, 5421);
    assert.doesNotMatch(JSON.stringify(payloads[0]), /Mi casa/);
  });

  it("maps the cart lines, options by name, the occasion and the normalized details", async () => {
    const { d, payloads } = deps();
    await createWebOrder(input({ replacesAttemptId: OLD }), d);
    const p = payloads[0];
    assert.equal(p.attempt_id, ATTEMPT);
    assert.equal(p.replaces_attempt_id, OLD);
    assert.deepEqual(p.lines, [{ variant_sku: "CRI-001-A", qty: 2, options: [{ name: "Tarjeta 3D", qty: 1 }] }]);
    assert.equal(p.occasion, "cumpleaños");
    assert.equal(p.details.buyer_phone, "573001234567");
    assert.equal(p.details.city, "Envigado");
    assert.equal(p.details.neighborhood, "Zona 4");
    assert.equal(p.desired_delivery_date, "2026-10-23");
  });

  it("does not measure anything for pickup and strips the address", async () => {
    const { d, distance, payloads } = deps();
    const r = await createWebOrder(input({ delivery: { method: "tienda", date: "2026-10-22" } }), d);
    assert.equal(r.ok, true);
    assert.deepEqual(distance.calls, []);
    assert.deepEqual(payloads[0].delivery, { method: "tienda", address: null, distance_m: null });
    assert.equal("neighborhood" in payloads[0].details, false);
  });
});

describe("createWebOrder: validation before any cost", () => {
  it("rejects invalid details with the sub-page and the messages, without calling Google or the database", async () => {
    const { d, distance, payloads } = deps();
    const r = await createWebOrder(
      input({ details: { ...DETAILS, buyer_phone: "12", recipient_name: "" } }),
      d,
    );
    assert.equal(r.ok, false);
    if (!r.ok && r.route.kind === "datos") {
      assert.equal(r.route.page, 1);
      assert.deepEqual(Object.keys(r.route.fieldErrors).sort(), ["buyer_phone", "recipient_name"]);
    } else {
      assert.fail("expected a datos route");
    }
    assert.deepEqual(distance.calls, []);
    assert.deepEqual(payloads, []);
  });

  it("checks the invoice rule on the server too", async () => {
    const { d } = deps();
    const r = await createWebOrder(input({ details: { ...DETAILS, wants_invoice: "Sí" } }), d);
    assert.equal(!r.ok && r.route.kind === "datos" && r.route.page, 4);
  });

  it("rejects a malformed delivery with an entrega route", async () => {
    const { d, payloads } = deps();
    for (const delivery of [
      { ...HOME, address: "x" },
      { ...HOME, municipality: "Bogotá" },
      { ...HOME, neighborhood: "" },
      { ...HOME, date: "mañana" },
      { method: "dron", date: "2026-10-23" },
    ]) {
      const r = await createWebOrder(input({ delivery }), d);
      assert.equal(!r.ok && r.route.kind, "entrega", JSON.stringify(delivery));
    }
    assert.deepEqual(payloads, []);
  });

  it("rejects malformed lines with a productos route", async () => {
    const { d } = deps();
    for (const lines of [[], "x", [{ sku: "", qty: 1, options: [] }], [{ sku: "A", qty: 0, options: [] }], [{ sku: "A", qty: 1.5, options: [] }], [{ sku: "A", qty: 1, options: [{ name: "", qty: 1 }] }]]) {
      const r = await createWebOrder(input({ lines }), d);
      assert.equal(!r.ok && r.route.kind, "productos", JSON.stringify(lines));
    }
  });

  it("rejects bad attempt ids with an intento route", async () => {
    const { d } = deps();
    assert.equal(!(await createWebOrder(input({ attemptId: "nope" }), d)).ok, true);
    const r = await createWebOrder(input({ replacesAttemptId: "nope" }), d);
    assert.equal(!r.ok && r.route.kind, "intento");
    const same = await createWebOrder(input({ replacesAttemptId: ATTEMPT }), d);
    assert.equal(!same.ok && same.route.kind, "intento");
  });

  it("rejects non-object input", async () => {
    const { d } = deps();
    for (const raw of [null, undefined, "x", 5, []]) {
      const r = await createWebOrder(raw, d);
      assert.equal(r.ok, false);
    }
  });
});

describe("createWebOrder: distance failures", () => {
  it("routes provider failures to step 1 with the customer-facing message", async () => {
    for (const kind of ["not_configured", "address_not_found", "provider_error"] as const) {
      const { d, payloads } = deps(RPC_OK, createFakeDistanceProvider({ ok: false, error: { kind } }));
      const r = await createWebOrder(input(), d);
      assert.equal(!r.ok && r.route.kind, "entrega", kind);
      assert.deepEqual(payloads, []);
    }
  });

  it("treats a throwing provider like a provider error", async () => {
    const { d } = deps(RPC_OK, { measure: async () => { throw new Error("boom"); } });
    const r = await createWebOrder(input(), d);
    assert.equal(!r.ok && r.route.kind, "entrega");
  });
});

describe("createWebOrder: database answers", () => {
  it("maps a failure to its route", async () => {
    const { d } = deps({ ok: false, error: "STOCK_INSUFICIENTE", paso: "productos", variant_sku: "CRI-001-A", unidades: 1 });
    const r = await createWebOrder(input(), d);
    assert.equal(!r.ok && r.route.kind, "productos");
    assert.equal(!r.ok && r.route.kind === "productos" && r.route.variantSku, "CRI-001-A");
  });

  it("maps DATOS_INVALIDOS using the delivery method", async () => {
    const { d } = deps({ ok: false, error: "DATOS_INVALIDOS", paso: "datos", campos: ["special_notes"] });
    const r = await createWebOrder(input({ delivery: { method: "tienda", date: "2026-10-22" } }), d);
    assert.equal(!r.ok && r.route.kind === "datos" && r.route.page, 2);
  });

  it("maps INTENTO_CERRADO to a new attempt", async () => {
    const { d } = deps({ ok: false, error: "INTENTO_CERRADO", paso: "intento", estado: "vencido" });
    const r = await createWebOrder(input(), d);
    assert.equal(!r.ok && r.route.kind, "intento");
  });

  it("asks to retry when the RPC throws or answers something unreadable", async () => {
    const failing: CreateWebOrderDeps = { distance: deps().distance, rpc: async () => { throw new Error("db down"); } };
    const r1 = await createWebOrder(input(), failing);
    assert.equal(!r1.ok && r1.route.kind, "retry");
    const { d } = deps({ weird: true });
    const r2 = await createWebOrder(input(), d);
    assert.equal(!r2.ok && r2.route.kind, "retry");
  });
});
