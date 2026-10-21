import { formatCop } from "../format.ts";

/** `/checkout` and anything nested under it; not look-alikes such as `/checkouts`. */
function isCheckoutPath(pathname: string | null): boolean {
  return pathname === "/checkout" || (pathname?.startsWith("/checkout/") ?? false);
}

/**
 * The floating cart pill complements the header button: it shows only while
 * the header is hidden by scroll, there is something to show, and the cart is
 * not already on screen (open drawer) or being paid for (checkout).
 */
export function shouldShowCartPill(input: {
  headerHidden: boolean;
  itemCount: number;
  drawerOpen: boolean;
  pathname: string | null;
}): boolean {
  return (
    input.headerHidden &&
    input.itemCount >= 1 &&
    !input.drawerOpen &&
    !isCheckoutPath(input.pathname)
  );
}

/** Visible text and screen-reader label of the pill. Total is display only. */
export function cartPillLabel(
  itemCount: number,
  subtotal: number,
): { text: string; ariaLabel: string } {
  const total = formatCop(subtotal);
  const noun = itemCount === 1 ? "producto" : "productos";
  return {
    text: `Tu pedido (${itemCount}) · ${total}`,
    ariaLabel: `Ver tu pedido: ${itemCount} ${noun}, ${total}`,
  };
}
