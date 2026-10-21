"use client";

import { animate, useMotionValue, type AnimationPlaybackControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ADD_BUMP_PX,
  ADD_BUMP_VISUAL_DURATION,
  ADD_RING_DURATION,
  DURATION_UI,
  EASE_UI,
} from "@/components/motion/variants";
import { impactOffset, type CartTargetId } from "@/lib/motion/addToCart";
import { useCartFeedback, type CartHit } from "./CartFeedbackProvider";

interface CartTargetOptions {
  /** Which control this is; the feedback provider flies to the visible one. */
  id: CartTargetId;
  /** Ring end scale. A wide pill needs a much smaller one than a round button. */
  ringScale: number;
  /** Pop the badge on bump (only meaningful for the small count badge). */
  popBadge: boolean;
}

/**
 * Landing-target behaviour shared by the header cart button and the floating
 * pill: registers with `CartFeedbackProvider` and reacts to the hit.
 * - `bump`: spring back from a small push along the flight, optional badge pop
 *   and an absolutely positioned ring that expands and fades.
 * - `fade`: opacity-only on the badge element.
 * Only transform and opacity animate; nothing changes size (no layout shift).
 */
export function useCartTarget({ id, ringScale, popBadge }: CartTargetOptions) {
  const { registerTarget } = useCartFeedback();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const hitId = useRef(0);
  const [hit, setHit] = useState<(CartHit & { id: number }) | null>(null);

  useEffect(() => {
    registerTarget(id, {
      getRect: () => {
        const r = buttonRef.current?.getBoundingClientRect();
        return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      },
      hit: (h) => setHit({ ...h, id: ++hitId.current }),
    });
    return () => registerTarget(id, null);
  }, [registerTarget, id]);

  // Runs after the commit, so a badge created by this very add already exists.
  useEffect(() => {
    if (!hit) return;
    const controls: AnimationPlaybackControls[] = [];
    const badge = badgeRef.current;

    if (hit.kind === "fade") {
      if (badge) {
        controls.push(animate(badge, { opacity: [0.35, 1] }, { duration: DURATION_UI, ease: EASE_UI }));
      }
    } else {
      const push = impactOffset(hit.dx, hit.dy, ADD_BUMP_PX);
      const spring = { type: "spring", visualDuration: ADD_BUMP_VISUAL_DURATION, bounce: 0.5 } as const;
      x.set(push.x);
      y.set(push.y);
      controls.push(animate(x, 0, spring), animate(y, 0, spring));
      if (badge && popBadge) controls.push(animate(badge, { scale: [1.3, 1] }, spring));
      if (ringRef.current) {
        controls.push(
          animate(
            ringRef.current,
            { scale: [1, ringScale], opacity: [0.8, 0] },
            { duration: ADD_RING_DURATION, ease: EASE_UI },
          ),
        );
      }
    }
    return () => controls.forEach((c) => c.stop());
  }, [hit, x, y, ringScale, popBadge]);

  return { buttonRef, badgeRef, ringRef, x, y };
}
