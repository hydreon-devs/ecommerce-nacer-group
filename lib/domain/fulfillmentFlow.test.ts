import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextStep,
  sortByDesiredDate,
} from "./fulfillmentFlow.ts";
import { isFulfillmentStatus } from "./fulfillmentStatus.ts";

const paid = { status: "pagado", delivery_method: "domicilio" };

describe("nextStep", () => {
  it("offers Marcar preparado from en_construccion, also when null", () => {
    const expected = { label: "Marcar preparado", to: "preparado" };
    assert.deepEqual(nextStep({ ...paid, fulfillment_status: "en_construccion" }), expected);
    assert.deepEqual(nextStep({ ...paid, fulfillment_status: null }), expected);
  });

  it("sends delivery orders to despacho and pickup orders straight to entregado", () => {
    assert.deepEqual(nextStep({ ...paid, fulfillment_status: "preparado" }), {
      label: "Enviar a despacho",
      to: "en_despacho",
    });
    assert.deepEqual(nextStep({ ...paid, delivery_method: "tienda", fulfillment_status: "preparado" }), {
      label: "Marcar entregado",
      to: "entregado",
    });
    assert.deepEqual(nextStep({ ...paid, delivery_method: null, fulfillment_status: "preparado" }), {
      label: "Enviar a despacho",
      to: "en_despacho",
    });
  });

  it("closes en_despacho with Marcar entregado", () => {
    assert.deepEqual(nextStep({ ...paid, fulfillment_status: "en_despacho" }), {
      label: "Marcar entregado",
      to: "entregado",
    });
  });

  it("offers nothing for final phases or unpaid orders", () => {
    assert.equal(nextStep({ ...paid, fulfillment_status: "entregado" }), null);
    assert.equal(nextStep({ ...paid, fulfillment_status: "perdido" }), null);
    assert.equal(nextStep({ status: "abierto", delivery_method: null, fulfillment_status: null }), null);
  });
});

describe("isFulfillmentStatus", () => {
  it("accepts exactly the five values", () => {
    for (const v of ["en_construccion", "preparado", "en_despacho", "entregado", "perdido"]) {
      assert.equal(isFulfillmentStatus(v), true);
    }
    for (const v of ["", "pagado", null, undefined, 3, "toString"]) {
      assert.equal(isFulfillmentStatus(v), false);
    }
  });
});

describe("sortByDesiredDate", () => {
  it("orders soonest first, undated last, stable otherwise, without mutating", () => {
    const rows = [
      { id: "a", desired_delivery_date: null },
      { id: "b", desired_delivery_date: "2026-10-20" },
      { id: "c", desired_delivery_date: "2026-10-15" },
      { id: "d", desired_delivery_date: null },
      { id: "e", desired_delivery_date: "2026-10-15" },
    ];
    const sorted = sortByDesiredDate(rows);
    assert.deepEqual(sorted.map((r) => r.id), ["c", "e", "b", "a", "d"]);
    assert.equal(rows[0].id, "a");
  });
});
