import {
  DRAFT_STORAGE_KEY,
  emptyDraft,
  parseStoredDraft,
  serializeDraft,
  type DeliveryDraft,
} from "@/lib/domain/checkout/deliveryStep";

/**
 * Checkout step 1 progress over `sessionStorage`, shaped for
 * `useSyncExternalStore` like `components/cart/cartStore.ts`.
 *
 * It is a convenience, never a source of truth: reads are validated (corrupt
 * content starts over), every storage access is in try/catch (private mode,
 * blocked storage -> in-memory only), and the server snapshot is the empty
 * draft so SSR and the first client render match.
 */
const SERVER_SNAPSHOT: DeliveryDraft = emptyDraft();

let current: DeliveryDraft | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): DeliveryDraft {
  try {
    return parseStoredDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY));
  } catch {
    return emptyDraft();
  }
}

export function getSnapshot(): DeliveryDraft {
  if (current === null) current = readFromStorage();
  return current;
}

export function getServerSnapshot(): DeliveryDraft {
  return SERVER_SNAPSHOT;
}

export function updateDraft(patch: Partial<DeliveryDraft>): void {
  current = { ...getSnapshot(), ...patch };
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(current));
  } catch {
    // Storage unavailable: keep the draft in memory for this page.
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
