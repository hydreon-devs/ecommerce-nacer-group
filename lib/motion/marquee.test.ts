import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marqueeDurationSeconds } from "./marquee.ts";

describe("marqueeDurationSeconds", () => {
  it("scales with the number of cards so the speed stays constant", () => {
    assert.equal(
      marqueeDurationSeconds(18) / marqueeDurationSeconds(9),
      2,
    );
  });

  it("is a calm 40-60 s loop for the nine occasions", () => {
    const s = marqueeDurationSeconds(9);
    assert.ok(s >= 40 && s <= 60, `got ${s}`);
  });

  it("never returns a zero or negative duration", () => {
    assert.ok(marqueeDurationSeconds(0) > 0);
  });
});
