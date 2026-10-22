import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDistanceMatrix } from "./distanceMatrix.ts";

function ok(overrides: Record<string, unknown> = {}) {
  return {
    status: "OK",
    origin_addresses: ["Cl. 35cc #89-51, Medellín, Antioquia, Colombia"],
    destination_addresses: ["Cra. 43A #1-50, El Poblado, Medellín, Antioquia, Colombia"],
    rows: [
      {
        elements: [
          {
            status: "OK",
            distance: { text: "5,4 km", value: 5421 },
            duration: { text: "18 min", value: 1080 },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function withElement(element: unknown) {
  return ok({ rows: [{ elements: [element] }] });
}

describe("parseDistanceMatrix", () => {
  it("returns meters and Google's resolved address on OK", () => {
    assert.deepEqual(parseDistanceMatrix(ok()), {
      ok: true,
      meters: 5421,
      resolvedAddress: "Cra. 43A #1-50, El Poblado, Medellín, Antioquia, Colombia",
    });
  });

  for (const status of ["REQUEST_DENIED", "OVER_QUERY_LIMIT", "INVALID_REQUEST", "UNKNOWN_ERROR"]) {
    it(`top-level ${status} is a provider error, not an address problem`, () => {
      const result = parseDistanceMatrix({ status, error_message: "key rejected" });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.kind, "provider_error");
        assert.match(result.error.detail ?? "", new RegExp(status));
      }
    });
  }

  for (const status of ["ZERO_RESULTS", "NOT_FOUND"]) {
    it(`element ${status} means the address cannot be located`, () => {
      const result = parseDistanceMatrix(withElement({ status }));
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.kind, "address_not_found");
    });
  }

  it("other element statuses are provider errors", () => {
    const result = parseDistanceMatrix(withElement({ status: "MAX_ROUTE_LENGTH_EXCEEDED" }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "provider_error");
  });

  it("does not throw on missing or malformed shapes", () => {
    const shapes: unknown[] = [
      null,
      undefined,
      "OK",
      42,
      [],
      {},
      { status: "OK" },
      { status: "OK", rows: [] },
      { status: "OK", rows: [{}] },
      { status: "OK", rows: [{ elements: [] }] },
      { status: "OK", rows: [{ elements: [null] }] },
      { status: "OK", rows: "nope" },
      withElement({ status: "OK" }),
      withElement({ status: "OK", distance: {} }),
      withElement({ status: "OK", distance: { value: "5421" } }),
      ok({ destination_addresses: [] }),
      ok({ destination_addresses: [""] }),
      ok({ destination_addresses: [7] }),
    ];
    for (const shape of shapes) {
      const result = parseDistanceMatrix(shape);
      assert.equal(result.ok, false, JSON.stringify(shape));
      if (!result.ok) assert.equal(result.error.kind, "provider_error");
    }
  });

  it("rounds non-integer meters to a whole number", () => {
    const result = parseDistanceMatrix(
      withElement({ status: "OK", distance: { value: 5420.6 } }),
    );
    assert.equal(result.ok && result.meters, 5421);
  });

  it("rejects negative or non-finite meters", () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = parseDistanceMatrix(withElement({ status: "OK", distance: { value } }));
      assert.equal(result.ok, false);
    }
  });

  it("accepts zero meters (address at the workshop)", () => {
    const result = parseDistanceMatrix(withElement({ status: "OK", distance: { value: 0 } }));
    assert.equal(result.ok && result.meters, 0);
  });
});
