"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addToCart,
  cartItemCount,
  cartSubtotal,
  removeLine,
  setLineQuantity,
  type AddToCartInput,
  type Cart,
} from "@/lib/domain/cart";
import { CartDrawer } from "./CartDrawer";
import { CartFeedbackProvider } from "./CartFeedbackProvider";
import { FloatingCartPill } from "./FloatingCartPill";
import { HeaderVisibilityProvider } from "./HeaderVisibility";
import {
  getServerSnapshot,
  getSnapshot,
  setCart,
  subscribe,
} from "./cartStore";

interface CartContextValue {
  cart: Cart;
  itemCount: number;
  /** DISPLAY ONLY: the server re-prices at checkout (slice 4). */
  subtotal: number;
  /** Returns whether the line was added (false when not sellable). */
  add: (input: AddToCartInput) => boolean;
  setQuantity: (key: string, cantidad: number) => void;
  remove: (key: string) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Client provider mounted in the storefront layout. Persistence and SSR safety
 * live in `cartStore`; this adds the drawer state and the domain actions.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const add = useCallback((input: AddToCartInput) => {
    const result = addToCart(getSnapshot(), input);
    if (result.added) setCart(result.cart);
    return result.added;
  }, []);
  const setQuantity = useCallback(
    (key: string, cantidad: number) =>
      setCart(setLineQuantity(getSnapshot(), key, cantidad)),
    [],
  );
  const remove = useCallback(
    (key: string) => setCart(removeLine(getSnapshot(), key)),
    [],
  );
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cartItemCount(cart),
      subtotal: cartSubtotal(cart),
      add,
      setQuantity,
      remove,
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [cart, add, setQuantity, remove, drawerOpen, openDrawer, closeDrawer],
  );

  return (
    <CartContext.Provider value={value}>
      <HeaderVisibilityProvider>
        <CartFeedbackProvider>
          {children}
          <FloatingCartPill />
        </CartFeedbackProvider>
      </HeaderVisibilityProvider>
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
