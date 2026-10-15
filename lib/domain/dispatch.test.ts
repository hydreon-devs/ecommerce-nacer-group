import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canMarkLost,
  classifyDelivery,
  countReadyByFilter,
  filterReady,
  isPickup,
  splitReadyByDelivery,
  parseDispatchFilter,
  validateLostReason,
} from "./dispatch.ts";

const TODAY = "2026-10-13";

describe("parseDispatchFilter", () => {
  it("accepts every position", () => {
    assert.equal(parseDispatchFilter("hoy"), "hoy");
    assert.equal(parseDispatchFilter("atrasados"), "atrasados");
    assert.equal(parseDispatchFilter("proximos"), "proximos");
    assert.equal(parseDispatchFilter("todos"), "todos");
  });

  it("falls back to hoy when missing or invalid", () => {
    assert.equal(parseDispatchFilter(undefined), "hoy");
    assert.equal(parseDispatchFilter(""), "hoy");
    assert.equal(parseDispatchFilter("ayer"), "hoy");
    assert.equal(parseDispatchFilter("TODOS"), "hoy");
  });

  it("uses the first value of a repeated param", () => {
    assert.equal(parseDispatchFilter(["todos", "hoy"]), "todos");
    assert.equal(parseDispatchFilter([]), "hoy");
  });
});

describe("classifyDelivery", () => {
  it("classifies today, upcoming and no date", () => {
    assert.deepEqual(classifyDelivery("2026-10-13", TODAY), { kind: "today" });
    assert.deepEqual(classifyDelivery("2026-10-14", TODAY), { kind: "upcoming" });
    assert.deepEqual(classifyDelivery(null, TODAY), { kind: "none" });
  });

  it("counts the days late", () => {
    assert.deepEqual(classifyDelivery("2026-10-12", TODAY), { kind: "overdue", daysLate: 1 });
    assert.deepEqual(classifyDelivery("2026-10-03", TODAY), { kind: "overdue", daysLate: 10 });
    assert.deepEqual(classifyDelivery("2026-09-30", TODAY), { kind: "overdue", daysLate: 13 });
  });

  it("treats a timestamp by its calendar day", () => {
    assert.deepEqual(classifyDelivery("2026-10-13T00:00:00+00:00", TODAY), { kind: "today" });
  });

  it("treats an unreadable date as no date", () => {
    assert.deepEqual(classifyDelivery("pronto", TODAY), { kind: "none" });
  });
});

describe("filterReady / countReadyByFilter", () => {
  const orders = [
    { id: "late", desired_delivery_date: "2026-10-10" },
    { id: "today", desired_delivery_date: "2026-10-13" },
    { id: "none", desired_delivery_date: null },
    { id: "next", desired_delivery_date: "2026-10-14" },
    { id: "far", desired_delivery_date: "2026-11-01" },
  ];
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it("hoy = today + overdue + no date", () => {
    assert.deepEqual(ids(filterReady(orders, "hoy", TODAY)), ["late", "today", "none"]);
  });

  it("atrasados = strictly before today, without undated orders", () => {
    assert.deepEqual(ids(filterReady(orders, "atrasados", TODAY)), ["late"]);
  });

  it("proximos = strictly after today", () => {
    assert.deepEqual(ids(filterReady(orders, "proximos", TODAY)), ["next", "far"]);
  });

  it("todos = everything", () => {
    assert.equal(filterReady(orders, "todos", TODAY).length, 5);
  });

  it("counts every position", () => {
    assert.deepEqual(countReadyByFilter(orders, TODAY), { hoy: 3, atrasados: 1, proximos: 2, todos: 5 });
  });
});

describe("validateLostReason", () => {
  it("trims and accepts 1 to 500 characters", () => {
    assert.deepEqual(validateLostReason("  Cliente ausente  "), { ok: true, reason: "Cliente ausente" });
    assert.deepEqual(validateLostReason("x".repeat(500)), { ok: true, reason: "x".repeat(500) });
  });

  it("rejects empty, blank, too long and non-string", () => {
    assert.equal(validateLostReason("").ok, false);
    assert.equal(validateLostReason("   \n ").ok, false);
    assert.equal(validateLostReason("x".repeat(501)).ok, false);
    assert.equal(validateLostReason(null).ok, false);
    assert.equal(validateLostReason(42).ok, false);
  });

  it("measures the length after trimming", () => {
    assert.equal(validateLostReason(` ${"x".repeat(500)} `).ok, true);
  });
});

describe("canMarkLost", () => {
  it("only a paid order in en_despacho", () => {
    assert.equal(canMarkLost({ status: "pagado", fulfillment_status: "en_despacho" }), true);
  });

  it("rejects any other phase or payment status", () => {
    for (const phase of ["en_construccion", "preparado", "entregado", "perdido", null]) {
      assert.equal(canMarkLost({ status: "pagado", fulfillment_status: phase }), false);
    }
    assert.equal(canMarkLost({ status: "pendiente", fulfillment_status: "en_despacho" }), false);
  });
});

describe("isPickup / splitReadyByDelivery", () => {
  const o = (id: string, delivery_method: string | null) => ({ id, delivery_method });

  it("treats only tienda (trimmed, any case) as pickup", () => {
    assert.equal(isPickup({ delivery_method: "tienda" }), true);
    assert.equal(isPickup({ delivery_method: " Tienda " }), true);
    assert.equal(isPickup({ delivery_method: "domicilio" }), false);
    assert.equal(isPickup({ delivery_method: null }), false);
  });

  it("sends domicilio, null and unknown methods to delivery, keeping order", () => {
    const { delivery, pickup } = splitReadyByDelivery([
      o("a", "domicilio"),
      o("b", "tienda"),
      o("c", null),
      o("d", "TIENDA"),
      o("e", "otro"),
    ]);
    assert.deepEqual(delivery.map((x) => x.id), ["a", "c", "e"]);
    assert.deepEqual(pickup.map((x) => x.id), ["b", "d"]);
  });
});
