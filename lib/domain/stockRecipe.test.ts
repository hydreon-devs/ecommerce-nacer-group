import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeRecipeAvailability,
  rpcErrorMessage,
  validateRecipeRows,
  type ItemAvailability,
} from "./stockRecipe.ts";

const items: Record<string, ItemAvailability> = {
  crisalida: { available: 5, isActive: true },
  base: { available: 20, isActive: true },
  flor: { available: 10, isActive: true },
  viejo: { available: 99, isActive: false },
};

describe("computeRecipeAvailability", () => {
  it("toma el mínimo de floor(disponible / requerido) y nombra el cuello de botella", () => {
    const r = computeRecipeAvailability(
      [
        { stockItemId: "base", qtyRequired: 1 },
        { stockItemId: "crisalida", qtyRequired: 2 },
        { stockItemId: "flor", qtyRequired: 2 },
      ],
      items,
    );
    assert.deepEqual(r, { availableUnits: 2, bottleneckItemId: "crisalida" });
  });
  it("sin receta da 0 y sin cuello de botella", () => {
    assert.deepEqual(computeRecipeAvailability([], items), { availableUnits: 0, bottleneckItemId: null });
  });
  it("un insumo inactivo da 0 y es el cuello de botella", () => {
    const r = computeRecipeAvailability(
      [
        { stockItemId: "base", qtyRequired: 1 },
        { stockItemId: "viejo", qtyRequired: 1 },
      ],
      items,
    );
    assert.deepEqual(r, { availableUnits: 0, bottleneckItemId: "viejo" });
  });
  it("un insumo desconocido da 0", () => {
    const r = computeRecipeAvailability([{ stockItemId: "nada", qtyRequired: 1 }], items);
    assert.deepEqual(r, { availableUnits: 0, bottleneckItemId: "nada" });
  });
  it("disponible negativo se trata como 0", () => {
    const r = computeRecipeAvailability([{ stockItemId: "x", qtyRequired: 1 }], {
      x: { available: -3, isActive: true },
    });
    assert.equal(r.availableUnits, 0);
  });
});

describe("validateRecipeRows", () => {
  it("acepta filas válidas", () => {
    assert.deepEqual(validateRecipeRows([{ stockItemId: "a", qtyRequired: 2 }]), { ok: true });
  });
  it("rechaza receta vacía salvo que se permita", () => {
    const r = validateRecipeRows([]);
    assert.equal(r.ok === false && r.error, "RECETA_VACIA");
    assert.deepEqual(validateRecipeRows([], { allowEmpty: true }), { ok: true });
  });
  it("rechaza cantidades no enteras, cero o negativas", () => {
    for (const q of [0, -1, 1.5, Number.NaN]) {
      const r = validateRecipeRows([{ stockItemId: "a", qtyRequired: q }]);
      assert.equal(r.ok === false && r.error, "COMPONENTES_INVALIDOS");
    }
  });
  it("rechaza insumos duplicados y filas sin insumo", () => {
    const dup = validateRecipeRows([
      { stockItemId: "a", qtyRequired: 1 },
      { stockItemId: "a", qtyRequired: 2 },
    ]);
    assert.equal(dup.ok === false && dup.error, "COMPONENTES_INVALIDOS");
    const empty = validateRecipeRows([{ stockItemId: "", qtyRequired: 1 }]);
    assert.equal(empty.ok === false && empty.error, "COMPONENTES_INVALIDOS");
  });
});

describe("rpcErrorMessage", () => {
  it("traduce códigos conocidos", () => {
    assert.match(rpcErrorMessage("STOCK_NEGATIVO"), /negativ/i);
    assert.match(rpcErrorMessage("SKU_EN_USO"), /SKU/);
  });
  it("traduce los códigos de create_stock_item", () => {
    for (const code of [
      "NOMBRE_REQUERIDO",
      "ORIGEN_INVALIDO",
      "VARIANTE_SOLO_TALLER",
      "SKU_BASE_INVALIDO",
      "SUFIJOS_AGOTADOS",
      "SECUENCIA_AGOTADA",
    ]) {
      assert.doesNotMatch(rpcErrorMessage(code), /No se pudo completar/, code);
    }
  });
  it("usa el mensaje de respaldo o uno genérico para códigos desconocidos", () => {
    assert.equal(rpcErrorMessage("RARO", "del servidor"), "del servidor");
    assert.match(rpcErrorMessage("RARO"), /No se pudo/);
    assert.match(rpcErrorMessage(undefined), /No se pudo/);
  });
});
