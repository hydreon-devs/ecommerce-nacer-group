"use client";

import { animate, arc, useReducedMotion, type AnimationPlaybackControls } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  ADD_FLIGHT_DURATION,
  ADD_MAX_GHOSTS,
  CART_PILL_SETTLE_MS,
} from "@/components/motion/variants";
import {
  chooseAddFeedback,
  flightGeometry,
  isTargetVisible,
  resolveTarget,
  type CartTargetId,
  type Rect,
} from "@/lib/motion/addToCart";

/** What the header cart button does when an add lands. */
export interface CartHit {
  kind: "bump" | "fade";
  /** Flight direction (px), used to push the button the same way. */
  dx: number;
  dy: number;
}

/** Registered by a cart control (header button or floating pill). */
export interface CartTarget {
  getRect: () => Rect | null;
  hit: (hit: CartHit) => void;
}

export interface PlayAddFeedbackInput {
  /** Image element of the product (card image or gallery). May be null. */
  source: Element | null;
  /** The pressed button: start rect when `source` is off screen. */
  trigger: Element | null;
  /** `producto.imagenes[0]?.url`; a neutral tile is used when missing. */
  imageUrl?: string;
  /** Sober register (condolencias / acompañar / recordar): no flight, no bounce. */
  sober?: boolean;
}

interface CartFeedbackValue {
  registerTarget: (id: CartTargetId, target: CartTarget | null) => void;
  play: (input: PlayAddFeedbackInput) => void | Promise<void>;
}

const CartFeedbackContext = createContext<CartFeedbackValue | null>(null);

const NOOP: CartFeedbackValue = {
  registerTarget: () => {},
  play: () => {},
};

/** Reads a DOMRect as the plain `Rect` the pure helpers expect. */
function toRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Body-level, non-interactive layer for the ghosts. `pointer-events-none`
 * lives on this decorative layer only so it never swallows clicks; the real
 * buttons are never disabled while a flight runs.
 */
function getLayer(): HTMLElement {
  let layer = document.getElementById("cart-flight-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "cart-flight-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.className = "pointer-events-none fixed inset-0 z-[60] overflow-hidden";
    document.body.appendChild(layer);
  }
  return layer;
}

function createGhost(from: Rect, src: string | null): HTMLElement {
  const ghost = document.createElement("div");
  ghost.className = "fixed overflow-hidden rounded-xl bg-white shadow-card will-change-transform";
  // Fixed start box; everything afterwards is transform/opacity only.
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.draggable = false;
    img.className = "h-full w-full object-contain p-4";
    ghost.appendChild(img);
  } else {
    // No cover image: neutral rounded tile.
    ghost.className = ghost.className.replace("bg-white", "bg-cream-soft");
  }
  return ghost;
}

/**
 * Sibling of `CartProvider`: owns the add-to-cart feedback. The header cart
 * button and the floating pill register as targets; the ghost flies to the
 * visible one. Callers (card QuickAdd, product page) call `play` with the
 * source image element after a successful add.
 */
export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion() ?? false;
  const targetsRef = useRef<Partial<Record<CartTargetId, CartTarget>>>({});
  const flights = useRef(new Set<{ stop: () => void }>());
  const timers = useRef(new Set<number>());
  const disposed = useRef(false);

  const registerTarget = useCallback((id: CartTargetId, target: CartTarget | null) => {
    if (target) targetsRef.current[id] = target;
    else delete targetsRef.current[id];
  }, []);

  const play = useCallback(
    async ({ source, trigger, imageUrl, sober = false }: PlayAddFeedbackInput) => {
      const readViewport = () => ({ width: window.innerWidth, height: window.innerHeight });
      /** Picks the visible target (header button, else pill) and its rect. */
      const resolve = () => {
        const { header, pill } = targetsRef.current;
        const rects = { header: header?.getRect() ?? null, pill: pill?.getRect() ?? null };
        const id = resolveTarget(rects, readViewport());
        return id ? { id, target: targetsRef.current[id]!, rect: rects[id]! } : null;
      };

      let resolved = resolve();
      const restricted = reducedMotion || sober;
      if (!resolved && !restricted) {
        // First item while the header is hidden: the pill is about to mount.
        // Wait for it to mount and settle (tied to its enter duration).
        await new Promise<void>((done) => {
          const id = window.setTimeout(() => {
            timers.current.delete(id);
            done();
          }, CART_PILL_SETTLE_MS);
          timers.current.add(id);
        });
        if (disposed.current) return;
        resolved = resolve();
      }

      let mode = chooseAddFeedback({ reducedMotion, sober, targetVisible: resolved !== null });
      // Too many ghosts already in the air: the extra add only hits the cart.
      if (mode === "fly" && flights.current.size >= ADD_MAX_GHOSTS) mode = "bump";

      if (mode !== "fly" || !resolved) {
        // Hit whatever is on screen; the header button when nothing is.
        const fallback = resolved?.target ?? targetsRef.current.header ?? targetsRef.current.pill;
        fallback?.hit({ kind: mode === "fade" ? "fade" : "bump", dx: 0, dy: 0 });
        return;
      }

      // Start from the product image; if it is scrolled out of view, from the button.
      const viewport = readViewport();
      const startEl = [source, trigger].find(
        (el): el is Element => !!el && isTargetVisible(toRect(el), viewport),
      );
      if (!startEl) {
        resolved.target.hit({ kind: "bump", dx: 0, dy: 0 });
        return;
      }
      const from = toRect(startEl);
      const { dx, dy, scale } = flightGeometry(from, resolved.rect);
      const loaded = startEl.querySelector("img")?.currentSrc;
      const ghost = createGhost(from, loaded || imageUrl || null);
      getLayer().appendChild(ghost);

      const flight = {
        controls: null as AnimationPlaybackControls | null,
        stop() {
          this.controls?.stop();
          ghost.remove();
          flights.current.delete(this);
        },
      };
      flights.current.add(flight);

      flight.controls = animate(
        ghost,
        { x: dx, y: dy, scale, opacity: [1, 1, 0] },
        {
          duration: ADD_FLIGHT_DURATION,
          path: arc({ strength: 0.5, peak: 0.15, rotate: 0.9, direction: "cw" }),
          ease: [0.74, 0.18, 0.93, 0.69],
          opacity: { duration: ADD_FLIGHT_DURATION, times: [0, 0.95, 1] },
        },
      );
      const { target } = resolved;
      flight.controls.finished.then(
        () => {
          const finished = flights.current.has(flight);
          flight.stop();
          // An interrupted flight (provider unmounted) must not hit.
          if (finished) target.hit({ kind: "bump", dx, dy });
        },
        () => flight.stop(),
      );
    },
    [reducedMotion],
  );

  // Provider unmount: stop every flight, clear waits and drop the ghosts.
  useEffect(() => {
    const active = flights.current;
    const pending = timers.current;
    disposed.current = false;
    return () => {
      disposed.current = true;
      active.forEach((f) => f.stop());
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
      document.getElementById("cart-flight-layer")?.remove();
    };
  }, []);

  const value = useMemo(() => ({ registerTarget, play }), [registerTarget, play]);

  return (
    <CartFeedbackContext.Provider value={value}>{children}</CartFeedbackContext.Provider>
  );
}

/** Outside the provider (tests, isolated renders) this is a silent no-op. */
export function useCartFeedback(): CartFeedbackValue {
  return useContext(CartFeedbackContext) ?? NOOP;
}
