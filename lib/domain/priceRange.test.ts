import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterByPrice, PRICE_STEP, priceBounds } from "./priceRange.ts";

const p = (sku: string, precioDesdeCop: number) => ({ sku, precioDesdeCop });

describe("priceBounds", () => {
  it("returns null when there are no products", () => {
    assert.equal(priceBounds([]), null);
  });
  it("floors the min and ceils the max to the slider step", () => {
    assert.deepEqual(priceBounds([p("A", 60500), p("B", 139900), p("C", 91200)]), {
      min: 60000,
      max: 140000,
    });
  });
  it("keeps exact multiples of the step untouched", () => {
    assert.deepEqual(priceBounds([p("A", 2 * PRICE_STEP), p("B", 5 * PRICE_STEP)]), {
      min: 2 * PRICE_STEP,
      max: 5 * PRICE_STEP,
    });
  });
  it("still gives a usable range when every product costs the same", () => {
    assert.deepEqual(priceBounds([p("A", 65500)]), { min: 65000, max: 66000 });
  });
});

describe("filterByPrice", () => {
  const ps = [p("A", 60500), p("B", 91200), p("C", 139900)];
  it("keeps products whose 'desde' price is inside the range, bounds inclusive", () => {
    assert.deepEqual(
      filterByPrice(ps, { min: 60500, max: 91200 }).map((x) => x.sku),
      ["A", "B"],
    );
  });
  it("returns every product when there is no range", () => {
    assert.equal(filterByPrice(ps, null).length, 3);
  });
});
