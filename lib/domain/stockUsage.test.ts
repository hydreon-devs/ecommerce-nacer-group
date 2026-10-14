import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attributesLabel, groupUsageByProduct, type VariantUsageRow } from "./stockUsage.ts";

const row = (o: Partial<VariantUsageRow>): VariantUsageRow => ({
  productSku: "P1",
  productName: "Caja",
  variantSku: "P1-A",
  attributes: null,
  qtyRequired: 1,
  imageUrl: null,
  ...o,
});

describe("attributesLabel", () => {
  it("une los valores y tolera null/vacío", () => {
    assert.equal(attributesLabel({ color: "Rojo", talla: "M" }), "Rojo · M");
    assert.equal(attributesLabel(null), "");
    assert.equal(attributesLabel({}), "");
  });
});

describe("groupUsageByProduct", () => {
  it("agrupa variantes por producto y ordena por nombre", () => {
    const g = groupUsageByProduct([
      row({ productSku: "Z", productName: "Zeta", variantSku: "Z-1" }),
      row({ variantSku: "P1-B", attributes: { t: "B" } }),
      row({ variantSku: "P1-A", attributes: { t: "A" } }),
    ]);
    assert.deepEqual(g.map((p) => p.productName), ["Caja", "Zeta"]);
    assert.deepEqual(g[0].variants.map((v) => v.sku), ["P1-A", "P1-B"]);
  });

  it("usa la primera variante (por sku) con imagen", () => {
    const g = groupUsageByProduct([
      row({ variantSku: "P1-C", imageUrl: "c.jpg" }),
      row({ variantSku: "P1-A" }),
      row({ variantSku: "P1-B", imageUrl: "b.jpg" }),
    ]);
    assert.equal(g[0].imageUrl, "b.jpg");
  });

  it("imagen null si ninguna variante tiene", () => {
    assert.equal(groupUsageByProduct([row({})])[0].imageUrl, null);
  });

  it("una sola variante: qty uniforme y sin detalle de variantes", () => {
    const [p] = groupUsageByProduct([row({ qtyRequired: 3 })]);
    assert.equal(p.uniformQty, 3);
    assert.equal(p.showVariants, false);
  });

  it("varias variantes con misma cantidad: muestra variantes y qty uniforme", () => {
    const [p] = groupUsageByProduct([row({ variantSku: "P1-A" }), row({ variantSku: "P1-B" })]);
    assert.equal(p.uniformQty, 1);
    assert.equal(p.showVariants, true);
  });

  it("cantidades distintas: uniformQty null", () => {
    const [p] = groupUsageByProduct([
      row({ variantSku: "P1-A", qtyRequired: 1 }),
      row({ variantSku: "P1-B", qtyRequired: 2 }),
    ]);
    assert.equal(p.uniformQty, null);
    assert.equal(p.showVariants, true);
  });

  it("vacío", () => {
    assert.deepEqual(groupUsageByProduct([]), []);
  });
});
