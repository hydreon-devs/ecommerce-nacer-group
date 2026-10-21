"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { CART_PILL_DURATION, EASE_UI } from "@/components/motion/variants";
import { CartIcon } from "@/components/ui/icons";
import { cartPillLabel, shouldShowCartPill } from "@/lib/domain/cartPill";
import { useCart } from "./CartProvider";
import { useHeaderVisibility } from "./HeaderVisibility";
import { useCartTarget } from "./useCartTarget";

/**
 * Cart access while the header is hidden by scroll: a pill fixed top-right
 * ("Tu pedido (2) · $402.000"). The visibility rule is `shouldShowCartPill`.
 * It is the flight target whenever the header button is off screen.
 */
export function FloatingCartPill() {
  const { itemCount, subtotal, drawerOpen, openDrawer } = useCart();
  const { hidden } = useHeaderVisibility();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const show = shouldShowCartPill({
    headerHidden: hidden,
    itemCount,
    drawerOpen,
    pathname,
  });

  return (
    <AnimatePresence initial={false}>
      {show && (
        <Pill
          key="cart-pill"
          itemCount={itemCount}
          subtotal={subtotal}
          onOpen={openDrawer}
          reduced={reduced ?? false}
        />
      )}
    </AnimatePresence>
  );
}

function Pill({
  itemCount,
  subtotal,
  onOpen,
  reduced,
}: {
  itemCount: number;
  subtotal: number;
  onOpen: () => void;
  reduced: boolean;
}) {
  const { buttonRef, badgeRef, ringRef, x, y } = useCartTarget({
    id: "pill",
    ringScale: 1.12,
    popBadge: false,
  });
  const { text, ariaLabel } = cartPillLabel(itemCount, subtotal);
  // Reduced motion: opacity only. Otherwise a small rise and scale, no bounce.
  const hiddenState = reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 };
  const shownState = reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };

  return (
    <motion.div
      initial={hiddenState}
      animate={shownState}
      exit={hiddenState}
      transition={{ duration: CART_PILL_DURATION, ease: EASE_UI }}
      className="fixed z-40 flex max-w-[calc(100vw-1.5rem)] justify-end"
      style={{
        top: "max(0.75rem, env(safe-area-inset-top))",
        right: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        style={{ x, y }}
        aria-label={ariaLabel}
        className="relative inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-full bg-moss px-4 py-2 font-body text-sm font-medium text-cream shadow-card transition-colors duration-150 ease-out hover:bg-moss-deep motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        {/* Ring: absolute, invisible at rest, so it never takes layout space. */}
        <span
          ref={ringRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber opacity-0"
        />
        <CartIcon width={18} height={18} aria-hidden="true" className="shrink-0" />
        <span ref={badgeRef} aria-hidden="true" className="min-w-0 truncate">
          {text}
        </span>
      </motion.button>
    </motion.div>
  );
}
