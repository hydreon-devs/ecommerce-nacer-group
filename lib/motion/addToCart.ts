/**
 * Pure, DOM-free decisions behind the add-to-cart feedback (flight to the
 * header cart button + hit on the button). The components only measure and
 * animate; every branch worth testing lives here.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type AddFeedback = "fly" | "bump" | "fade";

/**
 * - `fade`: opacity-only on the badge. Reduced motion and the sober register
 *   (`condolencias` / `acompañar` / `recordar`) always land here, ahead of
 *   anything else.
 * - `bump`: the cart takes the hit but no ghost flies (no visible target).
 * - `fly`: the full ghost flight, then the hit.
 */
export function chooseAddFeedback(input: {
  reducedMotion: boolean;
  sober: boolean;
  targetVisible: boolean;
}): AddFeedback {
  if (input.reducedMotion || input.sober) return "fade";
  return input.targetVisible ? "fly" : "bump";
}

export type CartTargetId = "header" | "pill";

/**
 * Which cart control the ghost flies to: the header button when it is on
 * screen, otherwise the floating pill. `null` when neither is visible.
 */
export function resolveTarget(
  rects: { header: Rect | null; pill: Rect | null },
  viewport: Viewport,
): CartTargetId | null {
  if (rects.header && isTargetVisible(rects.header, viewport)) return "header";
  if (rects.pill && isTargetVisible(rects.pill, viewport)) return "pill";
  return null;
}

/** Final scale is clamped so a huge photo never shrinks to a speck. */
const MIN_FLIGHT_SCALE = 0.08;
const MAX_FLIGHT_SCALE = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Centre-to-centre translation and uniform end scale for a ghost that starts
 * on `from` and lands on `to`. Zero-size or non-finite rects yield scale 1
 * instead of NaN/Infinity.
 */
export function flightGeometry(
  from: Rect,
  to: Rect,
): { dx: number; dy: number; scale: number } {
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const fromSize = Math.max(from.width, from.height);
  const toSize = Math.max(to.width, to.height);
  const raw = fromSize > 0 && toSize > 0 ? toSize / fromSize : 1;
  const scale = clamp(
    Number.isFinite(raw) ? raw : 1,
    MIN_FLIGHT_SCALE,
    MAX_FLIGHT_SCALE,
  );
  return {
    dx: Number.isFinite(dx) ? dx : 0,
    dy: Number.isFinite(dy) ? dy : 0,
    scale,
  };
}

/**
 * The target counts as visible when it has a size and at least half of it is
 * inside the viewport. A header hidden by scroll is translated above the
 * viewport, so it fails this check without any coupling to the header state.
 */
export function isTargetVisible(rect: Rect, viewport: Viewport): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (viewport.width <= 0 || viewport.height <= 0) return false;
  const w =
    Math.min(rect.left + rect.width, viewport.width) - Math.max(rect.left, 0);
  const h =
    Math.min(rect.top + rect.height, viewport.height) - Math.max(rect.top, 0);
  if (w <= 0 || h <= 0) return false;
  return (w * h) / (rect.width * rect.height) >= 0.5;
}

/** Initial displacement of the button: pushed along the ghost's direction. */
export function impactOffset(
  dx: number,
  dy: number,
  magnitude: number,
): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return { x: 0, y: 0 };
  return { x: (dx / len) * magnitude, y: (dy / len) * magnitude };
}

const SOBER_OCCASIONS: ReadonlySet<string> = new Set([
  "condolencias",
  "acompanar",
  "recordar",
]);

function normalizeSlug(slug: string): string {
  return slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** True when any occasion asks for the sober register (nacer-motion §2.6). */
export function isSoberOccasions(slugs: readonly string[] | undefined): boolean {
  return (slugs ?? []).some((s) => SOBER_OCCASIONS.has(normalizeSlug(s)));
}
