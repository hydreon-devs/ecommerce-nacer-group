import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ORDER_STATES,
  ORDER_STATE_LABELS,
  ORDER_STATE_PILL_CLASS,
  deriveOrderState,
  estadoSpec,
  orderDate,
  parseEstadoParam,
} from "./orderState.ts";

const base = { status: "abierto", payment_status: null, fulfillment_status: null };

describe("deriveOrderState", () => {
  it("maps closed orders directly", () => {
    assert.equal(deriveOrderState({ ...base, status: "cancelado" }), "cancelado");
    assert.equal(deriveOrderState({ ...base, status: "vencido" }), "vencido");
  });

  it("separates an open order with a bank-transfer proof from a plain open one", () => {
    assert.equal(
      deriveOrderState({ ...base, payment_status: "comprobante_recibido" }),
      "pendiente_aprobacion",
    );
    assert.equal(deriveOrderState({ ...base, payment_status: "pendiente" }), "abierto");
    assert.equal(deriveOrderState(base), "abierto");
  });

  it("ignores the fulfilment value while the order is not paid", () => {
    assert.equal(deriveOrderState({ ...base, fulfillment_status: "entregado" }), "abierto");
  });

  it("uses the fulfilment phase for paid orders, null meaning en_construccion", () => {
    const paid = { status: "pagado", payment_status: "aprobado" };
    for (const phase of ["en_construccion", "preparado", "en_despacho", "entregado", "perdido"] as const) {
      assert.equal(deriveOrderState({ ...paid, fulfillment_status: phase }), phase);
    }
    assert.equal(deriveOrderState({ ...paid, fulfillment_status: null }), "en_construccion");
  });
});

describe("labels and pills", () => {
  it("has a Spanish label and a pill class for every state", () => {
    for (const state of ORDER_STATES) {
      assert.ok(ORDER_STATE_LABELS[state], state);
      assert.ok(ORDER_STATE_PILL_CLASS[state], state);
    }
    assert.equal(ORDER_STATE_LABELS.pendiente_aprobacion, "Pendiente por aprobar");
    assert.equal(ORDER_STATE_LABELS.preparado, "Preparado");
    assert.equal(ORDER_STATE_LABELS.en_construccion, "En construcción");
  });
});

describe("parseEstadoParam", () => {
  it("accepts a known value, first of an array", () => {
    assert.equal(parseEstadoParam("pendiente_aprobacion"), "pendiente_aprobacion");
    assert.equal(parseEstadoParam(["preparado", "x"]), "preparado");
  });

  it("returns null for missing or invalid values", () => {
    assert.equal(parseEstadoParam(undefined), null);
    assert.equal(parseEstadoParam(""), null);
    assert.equal(parseEstadoParam("pagado"), null);
    assert.equal(parseEstadoParam("status.eq.pagado,x"), null);
  });
});

describe("estadoSpec", () => {
  it("pushes closed and open states down to columns", () => {
    assert.deepEqual(estadoSpec("cancelado"), { status: "cancelado" });
    assert.deepEqual(estadoSpec("pendiente_aprobacion"), {
      status: "abierto",
      payment: { eq: "comprobante_recibido" },
    });
    assert.deepEqual(estadoSpec("abierto"), {
      status: "abierto",
      payment: { notEq: "comprobante_recibido" },
    });
  });

  it("filters paid orders by phase, counting null as en_construccion", () => {
    assert.deepEqual(estadoSpec("en_construccion"), {
      status: "pagado",
      fulfillment: { eq: "en_construccion", withNull: true },
    });
    assert.deepEqual(estadoSpec("entregado"), {
      status: "pagado",
      fulfillment: { eq: "entregado", withNull: false },
    });
  });
});

describe("orderDate", () => {
  it("prefers confirmed_at and falls back to created_at", () => {
    assert.equal(orderDate({ confirmed_at: "2026-10-02T03:30:00Z", created_at: "2026-10-01T10:00:00Z" }), "2026-10-02T03:30:00Z");
    assert.equal(orderDate({ confirmed_at: null, created_at: "2026-10-01T10:00:00Z" }), "2026-10-01T10:00:00Z");
  });
});
