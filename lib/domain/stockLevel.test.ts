import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOW_STOCK_THRESHOLD, classifyStock } from "./stockLevel.ts";

describe("classifyStock", () => {
  it("flags zero and negatives as out", () => {
    assert.equal(classifyStock(0), "out");
    assert.equal(classifyStock(-1), "out");
  });
  it("flags fewer than 5 units as low", () => {
    assert.equal(LOW_STOCK_THRESHOLD, 5);
    assert.equal(classifyStock(1), "low");
    assert.equal(classifyStock(4), "low");
  });
  it("treats 5 or more units as ok", () => {
    assert.equal(classifyStock(5), "ok");
    assert.equal(classifyStock(12), "ok");
  });
});
