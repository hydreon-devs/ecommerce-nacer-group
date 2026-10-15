import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adjustNeedsConfirmation, nextQtyForMode } from "./stockAdjust.ts";

describe("adjustNeedsConfirmation", () => {
  it("no pide confirmar al sumar o restar", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "delta", current: 10, qty: -10 }), false);
  });
  it("pide confirmar al fijar en 0 con stock existente", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 5, qty: 0 }), true);
  });
  it("no pide confirmar si ya estaba en 0", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 0, qty: 0 }), false);
  });
  it("pide confirmar si baja más del 50%", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 10, qty: 4 }), true);
  });
  it("no pide confirmar si baja exactamente 50% o menos", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 10, qty: 5 }), false);
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 10, qty: 8 }), false);
  });
  it("no pide confirmar si sube", () => {
    assert.equal(adjustNeedsConfirmation({ mode: "set", current: 10, qty: 30 }), false);
  });
});

describe("nextQtyForMode", () => {
  it("precarga el stock actual al pasar a fijar valor", () => {
    assert.equal(nextQtyForMode("set", 12), 12);
  });
  it("reinicia a 0 al volver a sumar/restar", () => {
    assert.equal(nextQtyForMode("delta", 12), 0);
  });
});
