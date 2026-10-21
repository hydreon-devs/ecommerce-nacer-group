import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseAddFeedback,
  flightGeometry,
  impactOffset,
  isSoberOccasions,
  isTargetVisible,
  resolveTarget,
  type Rect,
} from "./addToCart.ts";

const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  width,
  height,
});
const VIEWPORT = { width: 1000, height: 800 };

describe("chooseAddFeedback", () => {
  it("flies only when nothing restricts it and a target is visible", () => {
    assert.equal(
      chooseAddFeedback({ reducedMotion: false, sober: false, targetVisible: true }),
      "fly",
    );
  });

  it("bumps without flying when no target is visible", () => {
    assert.equal(
      chooseAddFeedback({ reducedMotion: false, sober: false, targetVisible: false }),
      "bump",
    );
  });

  it("reduced motion always wins over fly and bump", () => {
    for (const sober of [true, false]) {
      for (const targetVisible of [true, false]) {
        assert.equal(
          chooseAddFeedback({ reducedMotion: true, sober, targetVisible }),
          "fade",
        );
      }
    }
  });

  it("sober register always wins over fly and bump", () => {
    for (const reducedMotion of [true, false]) {
      for (const targetVisible of [true, false]) {
        assert.equal(
          chooseAddFeedback({ reducedMotion, sober: true, targetVisible }),
          "fade",
        );
      }
    }
  });
});

describe("resolveTarget", () => {
  const onScreen = rect(900, 20, 44, 44);
  const hiddenHeader = rect(900, -80, 44, 44);
  const pillRect = rect(700, 12, 260, 44);

  it("prefers the header button when it is visible", () => {
    assert.equal(resolveTarget({ header: onScreen, pill: pillRect }, VIEWPORT), "header");
  });

  it("falls back to the pill when the header is hidden by scroll", () => {
    assert.equal(resolveTarget({ header: hiddenHeader, pill: pillRect }, VIEWPORT), "pill");
  });

  it("is null when neither is visible or registered", () => {
    assert.equal(resolveTarget({ header: hiddenHeader, pill: null }, VIEWPORT), null);
    assert.equal(resolveTarget({ header: null, pill: null }, VIEWPORT), null);
    assert.equal(
      resolveTarget({ header: hiddenHeader, pill: rect(0, 0, 0, 0) }, VIEWPORT),
      null,
    );
  });

  it("uses the pill when only the pill is registered and visible", () => {
    assert.equal(resolveTarget({ header: null, pill: pillRect }, VIEWPORT), "pill");
  });
});

describe("flightGeometry", () => {
  it("returns the centre-to-centre delta", () => {
    const g = flightGeometry(rect(100, 500, 200, 250), rect(800, 20, 44, 44));
    assert.equal(g.dx, 822 - 200);
    assert.equal(g.dy, 42 - 625);
  });

  it("scales the source down to the target size", () => {
    const g = flightGeometry(rect(0, 0, 200, 200), rect(0, 0, 50, 50));
    assert.equal(g.scale, 0.25);
  });

  it("clamps the scale to a sane range", () => {
    assert.equal(flightGeometry(rect(0, 0, 4000, 4000), rect(0, 0, 10, 10)).scale, 0.08);
    assert.equal(flightGeometry(rect(0, 0, 10, 10), rect(0, 0, 400, 400)).scale, 1);
  });

  it("never returns NaN or Infinity for zero-size rects", () => {
    const cases: Array<[Rect, Rect]> = [
      [rect(0, 0, 0, 0), rect(10, 10, 44, 44)],
      [rect(10, 10, 44, 44), rect(0, 0, 0, 0)],
      [rect(0, 0, 0, 0), rect(0, 0, 0, 0)],
    ];
    for (const [from, to] of cases) {
      const g = flightGeometry(from, to);
      assert.ok(Number.isFinite(g.dx) && Number.isFinite(g.dy) && Number.isFinite(g.scale));
      assert.ok(g.scale >= 0.08 && g.scale <= 1);
    }
  });
});

describe("isTargetVisible", () => {
  it("is true for a rect fully inside the viewport", () => {
    assert.equal(isTargetVisible(rect(900, 20, 44, 44), VIEWPORT), true);
  });

  it("is false for a zero-size rect", () => {
    assert.equal(isTargetVisible(rect(900, 20, 0, 0), VIEWPORT), false);
    assert.equal(isTargetVisible(rect(900, 20, 44, 0), VIEWPORT), false);
  });

  it("is false when the header is translated out of view", () => {
    assert.equal(isTargetVisible(rect(900, -80, 44, 44), VIEWPORT), false);
  });

  it("is false when fully outside on any side", () => {
    assert.equal(isTargetVisible(rect(1100, 20, 44, 44), VIEWPORT), false);
    assert.equal(isTargetVisible(rect(900, 900, 44, 44), VIEWPORT), false);
    assert.equal(isTargetVisible(rect(-100, 20, 44, 44), VIEWPORT), false);
  });

  it("needs at least half of the rect on screen", () => {
    assert.equal(isTargetVisible(rect(900, -10, 44, 44), VIEWPORT), true);
    assert.equal(isTargetVisible(rect(900, -30, 44, 44), VIEWPORT), false);
  });

  it("is false for a degenerate viewport", () => {
    assert.equal(isTargetVisible(rect(0, 0, 44, 44), { width: 0, height: 0 }), false);
  });
});

describe("impactOffset", () => {
  it("pushes along the flight direction with the given magnitude", () => {
    const o = impactOffset(30, 40, 10);
    assert.ok(Math.abs(o.x - 6) < 1e-9 && Math.abs(o.y - 8) < 1e-9);
  });

  it("is zero for a zero-length flight", () => {
    assert.deepEqual(impactOffset(0, 0, 10), { x: 0, y: 0 });
  });
});

describe("isSoberOccasions", () => {
  it("is true for condolencias, acompañar and recordar", () => {
    for (const slug of ["condolencias", "acompañar", "recordar"]) {
      assert.equal(isSoberOccasions([slug]), true);
    }
  });

  it("ignores case and accents", () => {
    assert.equal(isSoberOccasions(["Acompanar"]), true);
  });

  it("is false for other occasions and for none", () => {
    assert.equal(isSoberOccasions(["regalo", "celebración"]), false);
    assert.equal(isSoberOccasions([]), false);
    assert.equal(isSoberOccasions(undefined), false);
  });

  it("is true if any occasion is sober", () => {
    assert.equal(isSoberOccasions(["regalo", "condolencias"]), true);
  });
});
