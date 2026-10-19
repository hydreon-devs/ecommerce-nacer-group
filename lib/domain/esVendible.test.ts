import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esVendible } from "./esVendible.ts";

describe("esVendible", () => {
  it("disponibilidad governs: only Agotado blocks", () => {
    assert.equal(esVendible({ disponibilidad: "Disponible" }), true);
    assert.equal(esVendible({ disponibilidad: "Bajo pedido" }), true);
    assert.equal(esVendible({ disponibilidad: "Agotado" }), false);
  });
});
