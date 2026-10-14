import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chrysalisExtrasPerUnit, isChrysalisExtra, lineChrysalis, optionQty } from "./chrysalis.ts";

describe("isChrysalisExtra", () => {
  it("ignora tildes y mayúsculas", () => {
    assert.equal(isChrysalisExtra("Crisalida adicional"), true);
    assert.equal(isChrysalisExtra("CRISÁLIDA extra"), true);
    assert.equal(isChrysalisExtra("Dos crisálidas"), true);
  });
  it("no cuenta otros adicionales", () => {
    assert.equal(isChrysalisExtra("Tarjeta dedicada"), false);
    assert.equal(isChrysalisExtra(undefined), false);
    assert.equal(isChrysalisExtra(42), false);
  });
});

describe("chrysalisExtrasPerUnit", () => {
  it("suma las cantidades de los adicionales de crisálida", () => {
    const options = [
      { qty: 2, nombre: "Crisálida adicional", precio: 25000 },
      { qty: 1, nombre: "Caja de regalo", precio: 8000 },
      { qty: 1, nombre: "crisalida premium", precio: 30000 },
    ];
    assert.equal(chrysalisExtrasPerUnit(options), 3);
  });
  it("tolera opciones vacías, ausentes o mal formadas", () => {
    assert.equal(chrysalisExtrasPerUnit([]), 0);
    assert.equal(chrysalisExtrasPerUnit(null), 0);
    assert.equal(chrysalisExtrasPerUnit({ nombre: "Crisalida" }), 0);
    assert.equal(chrysalisExtrasPerUnit([null, 3, "x"]), 0);
  });
  it("un adicional sin cantidad válida cuenta como una unidad", () => {
    assert.equal(chrysalisExtrasPerUnit([{ nombre: "Crisalida adicional" }]), 1);
    assert.equal(chrysalisExtrasPerUnit([{ nombre: "Crisalida adicional", qty: "x" }]), 1);
  });
});

describe("lineChrysalis", () => {
  it("multiplica la cantidad por crisálidas base y adicionales", () => {
    const options = [{ qty: 1, nombre: "Crisalida adicional" }];
    assert.equal(lineChrysalis(3, 5, options), 18);
  });
  it("sin adicionales es cantidad por conteo", () => {
    assert.equal(lineChrysalis(2, 6, []), 12);
  });
  it("un conteo en cero sigue siendo cero (distinto de sin definir)", () => {
    assert.equal(lineChrysalis(2, 0, []), 0);
  });
  it("conteo nulo es sin definir", () => {
    assert.equal(lineChrysalis(2, null, [{ qty: 1, nombre: "Crisalida adicional" }]), null);
  });
});

describe("optionQty", () => {
  it("una sola interpretación de la cantidad de un adicional", () => {
    assert.equal(optionQty(2), 2);
    assert.equal(optionQty("2"), 2);
    assert.equal(optionQty(1.5), 1.5);
    assert.equal(optionQty(0), 0);
    assert.equal(optionQty(-2), 1);
    assert.equal(optionQty("x"), 1);
    assert.equal(optionQty(undefined), 1);
    assert.equal(optionQty(null), 1);
  });
  it("el conteo de crisálidas usa la misma interpretación", () => {
    for (const qty of [-2, "2", 1.5, undefined]) {
      assert.equal(chrysalisExtrasPerUnit([{ nombre: "Crisalida adicional", qty }]), optionQty(qty));
    }
  });
});
