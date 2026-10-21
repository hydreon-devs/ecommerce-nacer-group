"use client";

import { motion } from "framer-motion";
import { CartIcon } from "@/components/ui/icons";
import { useCart } from "./CartProvider";
import { useCartTarget } from "./useCartTarget";

interface HeaderCartButtonProps {
  /** Header over a light surface (true) or over the dark hero (false). */
  solid: boolean;
  onOpen: () => void;
}

/**
 * Cart button of the header: the landing target of the add-to-cart flight
 * while the header is on screen (see `useCartTarget` for the hit). The button
 * is never disabled or made inert during the animation.
 */
export function HeaderCartButton({ solid, onOpen }: HeaderCartButtonProps) {
  const { itemCount } = useCart();
  const { buttonRef, badgeRef, ringRef, x, y } = useCartTarget({
    id: "header",
    ringScale: 2.2,
    popBadge: true,
  });

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      style={{ x, y }}
      aria-label={
        itemCount > 0 ? `Abrir carrito, ${itemCount} artículos` : "Abrir carrito"
      }
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
        solid ? "text-ink/75 hover:text-moss" : "text-cream/85 hover:text-amber"
      }`}
    >
      {/* Ring: absolute, invisible at rest, so it never takes layout space. */}
      <span
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber opacity-0"
      />
      <CartIcon />
      {itemCount > 0 && (
        <span
          ref={badgeRef}
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 font-body text-[11px] font-medium leading-none text-ink"
        >
          {itemCount}
        </span>
      )}
    </motion.button>
  );
}
