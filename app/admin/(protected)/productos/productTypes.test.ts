import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NO_COLLECTION_LABEL,
  PRODUCT_TYPES,
  groupProductsByType,
  productTypeLabel,
} from "./productTypes.ts";

const item = (name: string, brand: string, category: string | null) => ({ name, brand, category });

describe("productTypeLabel", () => {
  it("shows type label and collection for crisalidas", () => {
    assert.equal(
      productTypeLabel("crisalidas", "Instantes de Vida"),
      "Crisálidas y Mariposas · Instantes de Vida",
    );
  });
  it("shows only the label for complementos or no collection", () => {
    assert.equal(productTypeLabel("complementos", null), "Complementos");
    assert.equal(productTypeLabel("crisalidas", null), "Crisálidas y Mariposas");
  });
  it("falls back to the raw slug for unknown brands", () => {
    assert.equal(productTypeLabel("otra", null), "otra");
  });
});

describe("groupProductsByType", () => {
  it("returns both types in order, even when empty", () => {
    const groups = groupProductsByType([]);
    assert.deepEqual(groups.map((g) => g.type.value), PRODUCT_TYPES.map((t) => t.value));
    assert.equal(groups[0].count, 0);
    assert.equal(groups[1].count, 0);
  });

  it("groups crisalidas by canonical collection order, unknown last", () => {
    const [cri] = groupProductsByType([
      item("a", "crisalidas", "Grandes Transformaciones"),
      item("b", "crisalidas", "Pequeños Milagros"),
      item("c", "crisalidas", null),
      item("d", "crisalidas", "Inventada"),
      item("e", "crisalidas", "Pequeños Milagros"),
    ]);
    assert.equal(cri.count, 5);
    assert.deepEqual(
      cri.collections.map((c) => [c.name, c.items.length]),
      [
        ["Pequeños Milagros", 2],
        ["Grandes Transformaciones", 1],
        [NO_COLLECTION_LABEL, 2],
      ],
    );
  });

  it("puts complementos in a flat list and ignores other brands", () => {
    const [, com] = groupProductsByType([
      item("x", "complementos", null),
      item("y", "florea", null),
    ]);
    assert.equal(com.count, 1);
    assert.equal(com.collections.length, 0);
    assert.equal(com.items[0].name, "x");
  });
});
