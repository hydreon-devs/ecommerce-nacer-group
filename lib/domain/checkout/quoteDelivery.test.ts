import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFakeDistanceProvider } from "./fakeDistanceProvider.ts";
import {
  buildDestination,
  parseQuoteDeliveryRpc,
  quoteDelivery,
  quoteErrorMessage,
  type FeeFunction,
} from "./quoteDelivery.ts";

const found = createFakeDistanceProvider({
  ok: true,
  meters: 5421,
  resolvedAddress: "Cra. 43A #1-50, Medellín, Antioquia, Colombia",
});

function feeOf(feeCop: number): FeeFunction & { calls: number[] } {
  const calls: number[] = [];
  const fn = async (meters: number) => {
    calls.push(meters);
    return { ok: true as const, feeCop };
  };
  return Object.assign(fn, { calls });
}

describe("buildDestination", () => {
  it("joins address, municipality, department and country", () => {
    assert.equal(
      buildDestination("  Calle 10 #5-20 ", "Envigado"),
      "Calle 10 #5-20, Envigado, Antioquia, Colombia",
    );
  });
});

describe("quoteDelivery", () => {
  it("measures, then takes the fee from the injected fee function", async () => {
    const provider = createFakeDistanceProvider({
      ok: true,
      meters: 5421,
      resolvedAddress: "Resuelta",
    });
    const fee = feeOf(25_000);
    const result = await quoteDelivery(
      { address: "Calle 10 #5-20", municipality: "Medellín" },
      { distance: provider, fee },
    );
    assert.deepEqual(result, { ok: true, resolvedAddress: "Resuelta", meters: 5421, feeCop: 25_000 });
    assert.deepEqual(provider.calls, ["Calle 10 #5-20, Medellín, Antioquia, Colombia"]);
    assert.deepEqual(fee.calls, [5421]);
  });

  it("rejects blank or too-short addresses without calling anything", async () => {
    const provider = createFakeDistanceProvider({ ok: true, meters: 1, resolvedAddress: "x" });
    const fee = feeOf(18_000);
    for (const address of ["", "   ", "ab"]) {
      const result = await quoteDelivery({ address, municipality: "Medellín" }, { distance: provider, fee });
      assert.deepEqual(result, { ok: false, error: "invalid_input" });
    }
    assert.equal(provider.calls.length, 0);
    assert.equal(fee.calls.length, 0);
  });

  it("rejects a municipality outside the metropolitan area", async () => {
    const fee = feeOf(18_000);
    const result = await quoteDelivery(
      { address: "Calle 10 #5-20", municipality: "Bogotá" },
      { distance: found, fee },
    );
    assert.deepEqual(result, { ok: false, error: "invalid_input" });
    assert.equal(fee.calls.length, 0);
  });

  it("passes provider errors through and never asks for a fee", async () => {
    for (const kind of ["not_configured", "address_not_found", "provider_error"] as const) {
      const provider = createFakeDistanceProvider({ ok: false, error: { kind } });
      const fee = feeOf(18_000);
      const result = await quoteDelivery(
        { address: "Calle 10 #5-20", municipality: "Bello" },
        { distance: provider, fee },
      );
      assert.deepEqual(result, { ok: false, error: kind });
      assert.equal(fee.calls.length, 0);
    }
  });

  it("surfaces out of coverage and fee outages as their own errors", async () => {
    const run = (fee: FeeFunction) =>
      quoteDelivery({ address: "Calle 10 #5-20", municipality: "Bello" }, { distance: found, fee });
    assert.deepEqual(await run(async () => ({ ok: false, error: "out_of_coverage" })), {
      ok: false,
      error: "out_of_coverage",
    });
    assert.deepEqual(await run(async () => ({ ok: false, error: "unavailable" })), {
      ok: false,
      error: "fee_unavailable",
    });
  });

  it("turns a throwing dependency into a typed error instead of crashing", async () => {
    const boom = { measure: async () => { throw new Error("network"); } };
    const result = await quoteDelivery(
      { address: "Calle 10 #5-20", municipality: "Bello" },
      { distance: boom, fee: feeOf(1) },
    );
    assert.deepEqual(result, { ok: false, error: "provider_error" });
    const feeBoom = await quoteDelivery(
      { address: "Calle 10 #5-20", municipality: "Bello" },
      { distance: found, fee: async () => { throw new Error("db"); } },
    );
    assert.deepEqual(feeBoom, { ok: false, error: "fee_unavailable" });
  });
});

describe("parseQuoteDeliveryRpc", () => {
  it("reads costo_domicilio as integer COP", () => {
    assert.deepEqual(parseQuoteDeliveryRpc({ ok: true, distancia_km: 5.4, costo_domicilio: 18000 }), {
      ok: true,
      feeCop: 18_000,
    });
    assert.deepEqual(parseQuoteDeliveryRpc({ ok: true, costo_domicilio: "25000" }), {
      ok: true,
      feeCop: 25_000,
    });
  });

  it("maps FUERA_DE_COBERTURA and other failures", () => {
    assert.deepEqual(parseQuoteDeliveryRpc({ ok: false, error: "FUERA_DE_COBERTURA" }), {
      ok: false,
      error: "out_of_coverage",
    });
    assert.deepEqual(parseQuoteDeliveryRpc({ ok: false, error: "DISTANCIA_INVALIDA" }), {
      ok: false,
      error: "unavailable",
    });
  });

  it("never invents a fee from a malformed payload", () => {
    for (const payload of [null, undefined, "x", {}, { ok: true }, { ok: true, costo_domicilio: -5 }, { ok: true, costo_domicilio: "abc" }]) {
      assert.deepEqual(parseQuoteDeliveryRpc(payload), { ok: false, error: "unavailable" });
    }
  });
});

describe("quoteErrorMessage", () => {
  it("has a friendly Spanish message for every error kind", () => {
    for (const kind of [
      "invalid_input",
      "not_configured",
      "address_not_found",
      "provider_error",
      "out_of_coverage",
      "fee_unavailable",
      "rate_limited",
    ] as const) {
      assert.ok(quoteErrorMessage(kind).length > 10);
    }
  });
});
