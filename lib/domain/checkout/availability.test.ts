import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCartLines,
  hasBlockingIssue,
  parseCheckLines,
  type CheckLine,
  type FreshCatalog,
} from "./availability.ts";
import type { Producto } from "../types.ts";

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    sku: "CRI-AZUL",
    slug: "cri-azul",
    nombre: "Mariposa Azul",
    coleccion: "Pequeños Milagros",
    coleccionSlug: "pequenos-milagros",
    descripcion: null,
    simbolismo: null,
    precioDesdeCop: 50_000,
    tienePreciosVariables: false,
    disponibilidad: "Disponible",
    variantes: [
      { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 50_000, vendible: true, imagenUrl: null },
    ],
    adicionales: [{ id: "a1", nombre: "Tarjeta 3D", precioCop: 12_000, maxCantidad: 2 }],
    imagenes: [],
    creadoEn: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function line(overrides: Partial<CheckLine> = {}): CheckLine {
  return {
    key: "CRI-AZUL-S|",
    productoId: "p1",
    varianteId: "v1",
    sku: "CRI-AZUL-S",
    precioCop: 50_000,
    adicionales: [],
    cantidad: 1,
    ...overrides,
  };
}

function fresh(products: Producto[], units: Record<string, number> = { v1: 5 }): FreshCatalog {
  return { products, unitsByVariant: new Map(Object.entries(units)) };
}

function only(lines: CheckLine[], catalog: FreshCatalog) {
  return classifyCartLines(lines, catalog);
}

describe("classifyCartLines", () => {
  it("marks a sellable line with enough units as ok", () => {
    const [r] = only([line({ cantidad: 2 })], fresh([producto()]));
    assert.equal(r.status, "ok");
    assert.equal(r.currentUnitPriceCop, 50_000);
  });

  it("sells Bajo pedido with zero units (disponibilidad governs, not stock)", () => {
    const p = producto({
      disponibilidad: "Bajo pedido",
      variantes: [
        { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 50_000, vendible: true, imagenUrl: null },
      ],
    });
    const [r] = only([line({ cantidad: 3 })], fresh([p], { v1: 0 }));
    assert.equal(r.status, "ok");
  });

  it("flags Agotado as unsellable", () => {
    const p = producto({
      disponibilidad: "Agotado",
      variantes: [
        { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 50_000, vendible: false, imagenUrl: null },
      ],
    });
    const [r] = only([line()], fresh([p], { v1: 0 }));
    assert.equal(r.status, "unsellable");
  });

  it("flags a variant that stopped being sellable even if the product still is", () => {
    const p = producto({
      variantes: [
        { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 50_000, vendible: false, imagenUrl: null },
        { id: "v2", sku: "CRI-AZUL-L", etiqueta: "Grande", precioCop: 80_000, vendible: true, imagenUrl: null },
      ],
    });
    const [r] = only([line()], fresh([p], { v1: 0, v2: 3 }));
    assert.equal(r.status, "unsellable");
  });

  it("flags deleted, unpublished or reassigned products and variants as not found", () => {
    assert.equal(only([line()], fresh([]))[0].status, "not_found");
    assert.equal(only([line({ varianteId: "gone" })], fresh([producto()]))[0].status, "not_found");
    assert.equal(only([line({ sku: "OTHER-SKU" })], fresh([producto()]))[0].status, "not_found");
  });

  it("reports the new price when it changed (display only, not blocking)", () => {
    const p = producto({
      variantes: [
        { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 55_000, vendible: true, imagenUrl: null },
      ],
    });
    const results = only([line()], fresh([p]));
    assert.equal(results[0].status, "price_changed");
    assert.equal(results[0].currentUnitPriceCop, 55_000);
    assert.equal(hasBlockingIssue(results), false);
  });

  it("includes adicionales in the compared unit price", () => {
    const l = line({
      precioCop: 50_000,
      adicionales: [{ id: "a1", precioCop: 12_000, cantidad: 2 }],
    });
    assert.equal(only([l], fresh([producto()]))[0].status, "ok");

    const repriced = producto({
      adicionales: [{ id: "a1", nombre: "Tarjeta 3D", precioCop: 15_000, maxCantidad: 2 }],
    });
    const [r] = only([l], fresh([repriced]));
    assert.equal(r.status, "price_changed");
    assert.equal(r.currentUnitPriceCop, 80_000);
  });

  it("flags a line whose adicional disappeared or whose limit dropped", () => {
    const l = line({ adicionales: [{ id: "a1", precioCop: 12_000, cantidad: 2 }] });
    assert.equal(only([l], fresh([producto({ adicionales: [] })]))[0].status, "unsellable");
    const lowered = producto({
      adicionales: [{ id: "a1", nombre: "Tarjeta 3D", precioCop: 12_000, maxCantidad: 1 }],
    });
    assert.equal(only([l], fresh([lowered]))[0].status, "unsellable");
  });

  it("flags Disponible lines asking for more units than are available", () => {
    const results = only([line({ cantidad: 4 })], fresh([producto()], { v1: 2 }));
    assert.equal(results[0].status, "insufficient");
    assert.equal(results[0].availableUnits, 2);
    assert.equal(results[0].maxQuantity, 2);
    assert.equal(hasBlockingIssue(results), true);
  });

  it("accepts a quantity equal to the available units", () => {
    assert.equal(only([line({ cantidad: 5 })], fresh([producto()], { v1: 5 }))[0].status, "ok");
  });

  it("adds up lines of the same variant before comparing with the units", () => {
    const a = line({ key: "A", cantidad: 2 });
    const b = line({ key: "B", cantidad: 2, adicionales: [{ id: "a1", precioCop: 12_000, cantidad: 1 }] });
    const results = only([a, b], fresh([producto()], { v1: 3 }));
    assert.equal(results[0].status, "insufficient");
    assert.equal(results[1].status, "insufficient");
    assert.equal(results[0].maxQuantity, 1); // 3 units minus the 2 held by the other line
    assert.equal(results[1].maxQuantity, 1);
  });

  it("keeps results in cart order and one per line", () => {
    const lines = [line({ key: "A" }), line({ key: "B", productoId: "zzz" })];
    const results = only(lines, fresh([producto()]));
    assert.deepEqual(results.map((r) => [r.key, r.status]), [
      ["A", "ok"],
      ["B", "not_found"],
    ]);
  });
});

describe("hasBlockingIssue", () => {
  it("blocks on unsellable, not found and insufficient, never on ok or price changes", () => {
    const base = { currentUnitPriceCop: null, availableUnits: null, maxQuantity: null };
    assert.equal(hasBlockingIssue([{ key: "a", status: "ok", ...base }]), false);
    assert.equal(hasBlockingIssue([{ key: "a", status: "price_changed", ...base }]), false);
    for (const status of ["unsellable", "not_found", "insufficient"] as const) {
      assert.equal(hasBlockingIssue([{ key: "a", status, ...base }]), true);
    }
    assert.equal(hasBlockingIssue([]), false);
  });
});

describe("parseCheckLines", () => {
  it("accepts a full CartLine and drops the extra fields", () => {
    const parsed = parseCheckLines([
      { ...line(), nombre: "x", slug: "y", etiqueta: "z", adicionales: [{ id: "a1", nombre: "T", precioCop: 1, maxCantidad: 2, cantidad: 1 }] },
    ]);
    assert.ok(parsed);
    assert.deepEqual(Object.keys(parsed[0]).sort(), [
      "adicionales", "cantidad", "key", "precioCop", "productoId", "sku", "varianteId",
    ]);
    assert.deepEqual(parsed[0].adicionales, [{ id: "a1", precioCop: 1, cantidad: 1 }]);
  });

  it("rejects non-arrays, bad quantities and oversized carts", () => {
    assert.equal(parseCheckLines("x"), null);
    assert.equal(parseCheckLines([line({ cantidad: 0 })]), null);
    assert.equal(parseCheckLines([line({ cantidad: 1.5 })]), null);
    assert.equal(parseCheckLines(Array.from({ length: 51 }, () => line())), null);
  });
});
