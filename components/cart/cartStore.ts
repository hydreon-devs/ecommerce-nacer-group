import {
  CART_STORAGE_KEY,
  emptyCart,
  parseStoredCart,
  serializeCart,
  type Cart,
} from "@/lib/domain/cart";

/**
 * Client-side cart store over localStorage, shaped for `useSyncExternalStore`.
 *
 * - Server snapshot is always the empty cart, so SSR and the first client
 *   render match; the stored cart appears right after hydration.
 * - Every storage access is wrapped in try/catch (private mode, quota, blocked
 *   storage). On failure the cart lives in memory for the session.
 * - Snapshots are cached so `getSnapshot` returns a stable reference.
 */
const SERVER_SNAPSHOT: Cart = emptyCart();

let current: Cart | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): Cart {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return emptyCart();
  }
}

export function getSnapshot(): Cart {
  if (current === null) current = readFromStorage();
  return current;
}

export function getServerSnapshot(): Cart {
  return SERVER_SNAPSHOT;
}

function emit() {
  listeners.forEach((l) => l());
}

export function setCart(next: Cart): void {
  current = next;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(next));
  } catch {
    // Storage unavailable: keep the in-memory cart for this session.
  }
  emit();
}

function onStorage(event: StorageEvent) {
  // Another tab changed the cart (or cleared storage): re-read it.
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  current = readFromStorage();
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}
