import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { polaroidMotion } from "./polaroid.ts";

describe("polaroidMotion", () => {
  it("rests at the tilt and straightens, lifts and scales on hover", () => {
    const m = polaroidMotion(-4, false);
    assert.deepEqual(m.rest, { rotate: -4 });
    assert.deepEqual(m.hover, { rotate: 0, y: -18, scale: 1.04 });
    assert.deepEqual(m.transition, {
      type: "spring",
      duration: 0.35,
      bounce: 0.25,
    });
  });

  it("keeps the static tilt and no hover transform with reduced motion", () => {
    const m = polaroidMotion(5, true);
    assert.deepEqual(m.rest, { rotate: 5 });
    assert.equal(m.hover, undefined);
  });

  it("stays within the 150-400 ms window", () => {
    const { duration } = polaroidMotion(0, false).transition;
    assert.ok(duration >= 0.15 && duration <= 0.4);
  });
});
