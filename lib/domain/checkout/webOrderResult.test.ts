import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDeliveryDate,
  formatExpiryBogota,
  mapRpcFailure,
  minutesUntil,
  parseCreateWebOrderResult,
} from "./webOrderResult.ts";

const ORDER_ID = "7f1c2b7e-1111-4222-8333-444455556666";

const SUCCESS = {
  ok: true,
  order_id: ORDER_ID,
  human_number: "W-0042",
  reutilizado: false,
  expires_at: "2026-10-22T20:30:00+00:00",
  subtotal: 190000,
  delivery_fee: 12000,
  grand_total: 202000,
  lines: [
    {
      variant_sku: "CRI-001-A",
      qty: 2,
      unit_price: 90000,
      total_price: 190000,
      options: [{ name: "Tarjeta 3D", qty: 1, unit_price: 10000 }],
    },
  ],
};

describe("parseCreateWebOrderResult: success", () => {
  it("reads the server order in integer COP", () => {
    const r = parseCreateWebOrderResult(SUCCESS);
    assert.equal(r.kind, "ok");
    if (r.kind === "ok") {
      assert.equal(r.order.orderId, ORDER_ID);
      assert.equal(r.order.humanNumber, "W-0042");
      assert.equal(r.order.reused, false);
      assert.equal(r.order.expiresAt, "2026-10-22T20:30:00+00:00");
      assert.equal(r.order.subtotal, 190000);
      assert.equal(r.order.deliveryFee, 12000);
      assert.equal(r.order.grandTotal, 202000);
      assert.deepEqual(r.order.lines[0], {
        variantSku: "CRI-001-A",
        qty: 2,
        unitPrice: 90000,
        totalPrice: 190000,
        options: [{ name: "Tarjeta 3D", qty: 1, unitPrice: 10000 }],
      });
    }
  });

  it("flags a reused order", () => {
    const r = parseCreateWebOrderResult({ ...SUCCESS, reutilizado: true });
    assert.equal(r.kind === "ok" && r.order.reused, true);
  });

  it("is malformed when a money field is missing, fractional or negative", () => {
    for (const patch of [{ grand_total: undefined }, { subtotal: 10.5 }, { delivery_fee: -1 }, { order_id: "nope" }, { expires_at: "mañana" }, { lines: "x" }]) {
      assert.equal(parseCreateWebOrderResult({ ...SUCCESS, ...patch }).kind, "malformed", JSON.stringify(patch));
    }
  });

  it("is malformed for non-objects and for ok:true without a body", () => {
    for (const raw of [null, undefined, "ok", 5, [], { ok: true }]) {
      assert.equal(parseCreateWebOrderResult(raw).kind, "malformed");
    }
  });
});

describe("parseCreateWebOrderResult: failure", () => {
  it("keeps the code, the paso and the context fields", () => {
    const r = parseCreateWebOrderResult({
      ok: false, error: "STOCK_INSUFICIENTE", paso: "productos", variant_sku: "CRI-001-A", unidades: 1,
    });
    assert.equal(r.kind, "failed");
    if (r.kind === "failed") {
      assert.equal(r.failure.error, "STOCK_INSUFICIENTE");
      assert.equal(r.failure.paso, "productos");
      assert.equal(r.failure.variantSku, "CRI-001-A");
      assert.equal(r.failure.units, 1);
    }
  });

  it("is malformed without a code or with an unknown paso", () => {
    assert.equal(parseCreateWebOrderResult({ ok: false, paso: "datos" }).kind, "malformed");
    assert.equal(parseCreateWebOrderResult({ ok: false, error: "X", paso: "otro" }).kind, "malformed");
  });
});

function failure(error: string, paso: string, extra: Record<string, unknown> = {}) {
  const r = parseCreateWebOrderResult({ ok: false, error, paso, ...extra });
  assert.equal(r.kind, "failed");
  if (r.kind !== "failed") throw new Error("unreachable");
  return r.failure;
}

describe("mapRpcFailure: intento", () => {
  it("INTENTO_CERRADO starts a new attempt", () => {
    const route = mapRpcFailure(failure("INTENTO_CERRADO", "intento", { estado: "vencido" }), "domicilio");
    assert.deepEqual({ kind: route.kind, reason: route.kind === "intento" ? route.reason : null }, { kind: "intento", reason: "closed" });
  });

  it("INTENTO_INVALIDO also starts a new attempt", () => {
    const route = mapRpcFailure(failure("INTENTO_INVALIDO", "intento"), "tienda");
    assert.equal(route.kind, "intento");
    assert.equal(route.kind === "intento" && route.reason, "invalid");
  });
});

describe("mapRpcFailure: productos", () => {
  it("routes every product error back to the availability issues", () => {
    for (const code of ["PEDIDO_SIN_LINEAS", "LINEA_INVALIDA", "VARIANTE_NO_DISPONIBLE", "STOCK_INSUFICIENTE", "OPCION_NO_EXISTE", "OPCION_EXCEDE_MAXIMO"]) {
      const route = mapRpcFailure(failure(code, "productos", { variant_sku: "CRI-001-A", opcion: "Tarjeta 3D", unidades: 2 }), "domicilio");
      assert.equal(route.kind, "productos", code);
      assert.ok(route.kind === "productos" && route.message.length > 0, code);
    }
  });

  it("flags the variant the database named", () => {
    const route = mapRpcFailure(failure("VARIANTE_NO_DISPONIBLE", "productos", { variant_sku: "CRI-009-B" }), "tienda");
    assert.equal(route.kind === "productos" && route.variantSku, "CRI-009-B");
  });

  it("says how many units are left on STOCK_INSUFICIENTE", () => {
    const one = mapRpcFailure(failure("STOCK_INSUFICIENTE", "productos", { variant_sku: "X", unidades: 1 }), "tienda");
    const many = mapRpcFailure(failure("STOCK_INSUFICIENTE", "productos", { variant_sku: "X", unidades: 3 }), "tienda");
    assert.match(one.kind === "productos" ? one.message : "", /1 unidad\b/);
    assert.match(many.kind === "productos" ? many.message : "", /3 unidades/);
  });

  it("names the option on OPCION_NO_EXISTE and OPCION_EXCEDE_MAXIMO", () => {
    for (const code of ["OPCION_NO_EXISTE", "OPCION_EXCEDE_MAXIMO"]) {
      const route = mapRpcFailure(failure(code, "productos", { variant_sku: "X", opcion: "Tarjeta 3D" }), "tienda");
      assert.match(route.kind === "productos" ? route.message : "", /Tarjeta 3D/, code);
    }
  });
});

describe("mapRpcFailure: entrega", () => {
  it("sends delivery errors to step 1 with the offending field", () => {
    const cases: [string, string][] = [
      ["METODO_INVALIDO", "method"],
      ["DIRECCION_REQUERIDA", "address"],
      ["DISTANCIA_INVALIDA", "address"],
      ["FUERA_DE_COBERTURA", "address"],
      ["FECHA_INVALIDA", "date"],
      ["FECHA_SIN_ENTREGA", "date"],
    ];
    for (const [code, field] of cases) {
      const route = mapRpcFailure(failure(code, "entrega", { proxima_fecha_valida: "2026-10-27" }), "domicilio");
      assert.equal(route.kind, "entrega", code);
      if (route.kind === "entrega") {
        assert.ok(route.fieldErrors[field], code);
        assert.ok(route.message.length > 0);
      }
    }
  });

  it("suggests the next valid delivery date", () => {
    const route = mapRpcFailure(failure("FECHA_SIN_ENTREGA", "entrega", { proxima_fecha_valida: "2026-10-27" }), "tienda");
    assert.equal(route.kind === "entrega" && route.suggestedDate, "2026-10-27");
    assert.match(route.kind === "entrega" ? route.message : "", /martes 27 de octubre/);
  });

  it("falls back to a generic message for an unknown code in this paso", () => {
    const route = mapRpcFailure(failure("ALGO_NUEVO", "entrega"), "domicilio");
    assert.equal(route.kind, "entrega");
  });
});

describe("mapRpcFailure: datos", () => {
  it("points DATOS_INVALIDOS at the sub-page of the first bad field with a message per field", () => {
    const route = mapRpcFailure(failure("DATOS_INVALIDOS", "datos", { campos: ["recipient_phone", "buyer_email"] }), "domicilio");
    assert.equal(route.kind, "datos");
    if (route.kind === "datos") {
      assert.equal(route.page, 1); // buyer_email is on page 1, the earliest page
      assert.deepEqual(Object.keys(route.fieldErrors).sort(), ["buyer_email", "recipient_phone"]);
      assert.match(route.fieldErrors.buyer_email, /correo/i);
    }
  });

  it("maps each field to its page", () => {
    const page = (field: string, method: "tienda" | "domicilio" = "domicilio") => {
      const route = mapRpcFailure(failure("DATOS_INVALIDOS", "datos", { campos: [field] }), method);
      return route.kind === "datos" ? route.page : route.kind;
    };
    assert.equal(page("buyer_name"), 1);
    assert.equal(page("buyer_phone"), 1);
    assert.equal(page("recipient_name"), 2);
    assert.equal(page("may_call_recipient"), 2);
    assert.equal(page("card_message"), 3);
    assert.equal(page("card_from"), 3);
    assert.equal(page("wants_invoice"), 4);
    assert.equal(page("invoice_tax_id"), 4);
    assert.equal(page("referral_source"), 4);
  });

  it("puts special_notes on the page the method asks it on", () => {
    const page = (method: "tienda" | "domicilio") => {
      const route = mapRpcFailure(failure("DATOS_INVALIDOS", "datos", { campos: ["special_notes"] }), method);
      return route.kind === "datos" ? route.page : route.kind;
    };
    assert.equal(page("tienda"), 2);
    assert.equal(page("domicilio"), 3);
  });

  it("sends address-related fields back to step 1", () => {
    const route = mapRpcFailure(failure("DATOS_INVALIDOS", "datos", { campos: ["buyer_name", "neighborhood", "city"] }), "domicilio");
    assert.equal(route.kind, "entrega");
    if (route.kind === "entrega") {
      assert.ok(route.fieldErrors.neighborhood);
      assert.ok(route.fieldErrors.municipality);
    }
  });

  it("routes OCASION_INVALIDA to the card page", () => {
    const route = mapRpcFailure(failure("OCASION_INVALIDA", "datos", { recibido: "x", validas: [] }), "domicilio");
    assert.equal(route.kind === "datos" && route.page, 3);
    assert.ok(route.kind === "datos" && route.fieldErrors.occasion);
  });

  it("still routes to the first page when the database lists no fields", () => {
    const route = mapRpcFailure(failure("DATOS_INVALIDOS", "datos", { campos: [], restriccion: "x" }), "tienda");
    assert.equal(route.kind === "datos" && route.page, 1);
  });
});

describe("expiry formatting in Bogotá", () => {
  it("shows HH:MM in America/Bogota (UTC-5)", () => {
    assert.equal(formatExpiryBogota("2026-10-22T20:30:00+00:00"), "15:30");
    assert.equal(formatExpiryBogota("2026-10-22T20:30:00.000Z"), "15:30");
  });

  it("pads the hour and handles the day boundary", () => {
    assert.equal(formatExpiryBogota("2026-10-23T05:05:00Z"), "00:05");
    assert.equal(formatExpiryBogota("2026-10-23T12:07:00Z"), "07:07");
  });

  it("converts from any offset", () => {
    assert.equal(formatExpiryBogota("2026-10-22T15:30:00-05:00"), "15:30");
  });

  it("returns an empty string for an unreadable date", () => {
    assert.equal(formatExpiryBogota("pronto"), "");
  });
});

describe("minutesUntil", () => {
  const exp = "2026-10-22T20:30:00Z";
  it("rounds up to whole minutes remaining and never goes below zero", () => {
    assert.equal(minutesUntil(exp, new Date("2026-10-22T19:30:00Z")), 60);
    assert.equal(minutesUntil(exp, new Date("2026-10-22T20:29:30Z")), 1);
    assert.equal(minutesUntil(exp, new Date("2026-10-22T20:30:00Z")), 0);
    assert.equal(minutesUntil(exp, new Date("2026-10-22T21:00:00Z")), 0);
  });
});

describe("formatDeliveryDate", () => {
  it("writes a calendar day in Spanish without shifting it", () => {
    assert.equal(formatDeliveryDate("2026-10-23"), "viernes 23 de octubre");
    assert.equal(formatDeliveryDate("2026-12-01"), "martes 1 de diciembre");
  });
});
