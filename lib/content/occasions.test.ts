import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OCCASIONS } from "./home.ts";

describe("OCCASIONS (home)", () => {
  it("lists the nine occasions in order", () => {
    assert.deepEqual(
      OCCASIONS.map((o) => o.name),
      [
        "Cumpleaños",
        "Aniversario",
        "Boda",
        "Condolencias",
        "Grados",
        "Nacimiento o bautizo",
        "Recuperación",
        "Felicitaciones",
        "Fecha especial",
      ],
    );
  });

  it("has unique ids", () => {
    assert.equal(new Set(OCCASIONS.map((o) => o.id)).size, OCCASIONS.length);
  });

  it("keeps every tilt within +-6 degrees", () => {
    for (const o of OCCASIONS) {
      assert.ok(Math.abs(o.tilt) <= 6, `${o.id} tilt ${o.tilt}`);
    }
  });

  it("gives neighbors different tilts", () => {
    for (let i = 1; i < OCCASIONS.length; i++) {
      assert.notEqual(OCCASIONS[i].tilt, OCCASIONS[i - 1].tilt);
    }
  });
});
