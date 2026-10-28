import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterVariantBases, mapCreateStockItemResult, parseCreateStockItemInput } from "./stockItemCreate.ts";

const UUID = "3f2b8c1e-5d4a-4b6f-9a1e-0c2d3e4f5a6b";

describe("parseCreateStockItemInput", () => {
  it("accepts a workshop item and trims fields", () => {
    const r = parseCreateStockItemInput({ origin: "workshop", name: "  Alambre ", unit: "m", description: " " });
    assert.deepEqual(r, {
      ok: true,
      data: { origin: "workshop", name: "Alambre", unit: "m", description: null, variantOf: null },
    });
  });
  it("accepts a purchased item", () => {
    const r = parseCreateStockItemInput({ origin: "purchased", name: "Bolsa", unit: "unidad", description: "kraft" });
    assert.equal(r.ok && r.data.origin, "purchased");
    assert.equal(r.ok && r.data.description, "kraft");
  });
  it("accepts a workshop variant with a base id", () => {
    const r = parseCreateStockItemInput({ origin: "workshop", name: "x", unit: "u", variantOf: UUID });
    assert.equal(r.ok && r.data.variantOf, UUID);
  });
  it("treats empty variantOf as no variant", () => {
    const r = parseCreateStockItemInput({ origin: "workshop", name: "x", unit: "u", variantOf: "" });
    assert.equal(r.ok && r.data.variantOf, null);
  });
  it("rejects a missing or invalid origin", () => {
    for (const origin of [undefined, "", "other"]) {
      const r = parseCreateStockItemInput({ origin, name: "x", unit: "u" });
      assert.equal(r.ok, false);
      assert.match(!r.ok ? r.error : "", /origen/i);
    }
  });
  it("rejects empty name and unit", () => {
    const n = parseCreateStockItemInput({ origin: "workshop", name: " ", unit: "u" });
    assert.match(!n.ok ? n.error : "", /nombre/i);
    const u = parseCreateStockItemInput({ origin: "workshop", name: "x", unit: "" });
    assert.match(!u.ok ? u.error : "", /unidad/i);
  });
  it("rejects a malformed variantOf", () => {
    const r = parseCreateStockItemInput({ origin: "workshop", name: "x", unit: "u", variantOf: "nope" });
    assert.equal(r.ok, false);
  });
  it("rejects variants of purchased items", () => {
    const r = parseCreateStockItemInput({ origin: "purchased", name: "x", unit: "u", variantOf: UUID });
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /comprado/i);
  });
});

describe("mapCreateStockItemResult", () => {
  it("returns the generated sku and id on success", () => {
    const r = mapCreateStockItemResult({ ok: true, stock_item_id: "id", sku: "CM0159", origin: "workshop" });
    assert.deepEqual(r, { ok: true, sku: "CM0159", stockItemId: "id" });
  });
  it("maps known error codes to Spanish messages", () => {
    const r = mapCreateStockItemResult({ ok: false, error: "VARIANTE_SOLO_TALLER", mensaje: "raw" });
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /taller/i);
  });
  it("falls back to the server message for unknown codes", () => {
    const r = mapCreateStockItemResult({ ok: false, error: "RARO", mensaje: "del servidor" });
    assert.deepEqual(r, { ok: false, error: "del servidor" });
  });
  it("fails when a successful result carries no sku or id", () => {
    assert.equal(mapCreateStockItemResult({ ok: true }).ok, false);
    assert.equal(mapCreateStockItemResult({ ok: true, sku: "CM0001" }).ok, false);
  });
});

describe("filterVariantBases", () => {
  const bases = [
    { id: "1", sku: "CM0045-01", name: "Matero encanto blanco" },
    { id: "2", sku: "CM0045-02", name: "Matero encanto azul" },
    { id: "3", sku: "CM0058-03", name: "Figuras grandes libélula" },
    { id: "4", sku: "CM0012", name: "Rosa en tela" },
  ];

  it("returns nothing for a blank query", () => {
    assert.deepEqual(filterVariantBases(bases, "   "), []);
  });
  it("matches by sku, case-insensitively", () => {
    assert.deepEqual(filterVariantBases(bases, "cm0045").map((b) => b.id), ["1", "2"]);
  });
  it("matches by name ignoring accents", () => {
    assert.deepEqual(filterVariantBases(bases, "libelula").map((b) => b.id), ["3"]);
    assert.deepEqual(filterVariantBases(bases, "LIBÉLULA").map((b) => b.id), ["3"]);
  });
  it("requires every word to match, in any order", () => {
    assert.deepEqual(filterVariantBases(bases, "azul matero").map((b) => b.id), ["2"]);
  });
  it("caps the number of results", () => {
    assert.equal(filterVariantBases(bases, "matero", 1).length, 1);
  });
});
