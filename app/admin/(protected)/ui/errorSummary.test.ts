import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildErrorSummary } from "./errorSummary.ts";

const target = (field: string) =>
  field === "buyer_name" ? { id: "buyer-name", label: "Nombre del comprador" } : null;

describe("buildErrorSummary", () => {
  it("devuelve una entrada con ancla y etiqueta por campo con error", () => {
    const items = buildErrorSummary({ buyer_name: "Obligatorio." }, target);
    assert.deepEqual(items, [
      { field: "buyer_name", href: "#buyer-name", text: "Nombre del comprador: Obligatorio." },
    ]);
  });
  it("conserva el orden de los errores", () => {
    const resolve = (f: string) => ({ id: f, label: f.toUpperCase() });
    const items = buildErrorSummary({ b: "x", a: "y" }, resolve);
    assert.deepEqual(items.map((i) => i.field), ["b", "a"]);
  });
  it("sin destino conocido usa solo el mensaje y no genera ancla", () => {
    const items = buildErrorSummary({ otro: "Falla." }, target);
    assert.deepEqual(items, [{ field: "otro", href: null, text: "Falla." }]);
  });
  it("sin errores devuelve lista vacía", () => {
    assert.deepEqual(buildErrorSummary({}, target), []);
  });
});
