import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BRANDS } from "./brands.ts";

const byId = (id: string) => BRANDS.find((b) => b.id === id);

describe("BRANDS (home presentation)", () => {
  it("presents exactly the three brands of Nacer Group, in order", () => {
    assert.deepEqual(
      BRANDS.map((b) => b.id),
      ["crisalidas", "florea", "jagua"],
    );
  });

  it("has unique ids and non-empty name and description", () => {
    assert.equal(new Set(BRANDS.map((b) => b.id)).size, BRANDS.length);
    for (const b of BRANDS) {
      assert.ok(b.name.trim().length > 0);
      assert.ok(b.description.trim().length > 0);
    }
  });

  it("links Crisalidas internally to the catalog", () => {
    const link = byId("crisalidas")?.link;
    assert.equal(link?.href, "/catalogo");
    assert.equal(link?.external, false);
  });

  it("links Florea to its external site and only there", () => {
    const link = byId("florea")?.link;
    assert.equal(link?.href, "https://universoflorea.com/");
    assert.equal(link?.external, true);
  });

  it("gives Jagua no link and points to Complementos in the copy", () => {
    const jagua = byId("jagua");
    assert.equal(jagua?.link, undefined);
    assert.match(jagua?.description ?? "", /Complementos/);
  });

  it("never offers a purchase path for Florea (no price, stock or cart fields)", () => {
    const florea = byId("florea") as unknown as Record<string, unknown>;
    for (const key of ["precio_cop", "price", "stock", "sku", "cart"]) {
      assert.equal(key in florea, false);
    }
  });

  it("only references token-based tones, never raw colors", () => {
    for (const b of BRANDS) assert.ok(["moss", "violet", "amber"].includes(b.tone));
  });
});
