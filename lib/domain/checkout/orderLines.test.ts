import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeOrderLines } from "./orderLines.ts";
import type { WebOrderLine } from "./webOrderResult.ts";

const cartLine = (sku: string, nombre: string, etiqueta: string) => ({ sku, nombre, etiqueta });
const orderLine = (variantSku: string, qty = 1): WebOrderLine => ({
  variantSku,
  qty,
  unitPrice: 1000,
  totalPrice: 1000 * qty,
  options: [],
});

describe("describeOrderLines", () => {
  it("names each server line from the cart by position when the SKUs line up", () => {
    const r = describeOrderLines(
      [orderLine("A"), orderLine("A"), orderLine("B")],
      [cartLine("A", "Mariposa", "Azul"), cartLine("A", "Mariposa", "Azul con tarjeta"), cartLine("B", "Pin", "Único")],
    );
    assert.deepEqual(r.map((l) => [l.name, l.label]), [
      ["Mariposa", "Azul"],
      ["Mariposa", "Azul con tarjeta"],
      ["Pin", "Único"],
    ]);
  });

  it("falls back to matching by SKU, each cart line used once, when the order differs", () => {
    const r = describeOrderLines(
      [orderLine("B"), orderLine("A")],
      [cartLine("A", "Mariposa", "Azul"), cartLine("B", "Pin", "Único")],
    );
    assert.deepEqual(r.map((l) => l.name), ["Pin", "Mariposa"]);
  });

  it("uses the SKU when the cart no longer has the line", () => {
    const [line] = describeOrderLines([orderLine("Z")], []);
    assert.equal(line.name, "Z");
    assert.equal(line.label, "");
  });

  it("keeps the server amounts and options untouched", () => {
    const server: WebOrderLine = { variantSku: "A", qty: 2, unitPrice: 5000, totalPrice: 10000, options: [{ name: "Tarjeta", qty: 1, unitPrice: 1000 }] };
    const [line] = describeOrderLines([server], [cartLine("A", "X", "Y")]);
    assert.equal(line.line, server);
  });
});
