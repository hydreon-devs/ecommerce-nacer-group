import {
  emptyFlowDraft,
  FLOW_STORAGE_KEY,
  parseStoredFlow,
  serializeFlow,
  type FlowDraft,
} from "@/lib/domain/checkout/flowDraft";

/**
 * Checkout progress past step 1 (form, sub-page, attempt) over
 * `sessionStorage`, shaped for `useSyncExternalStore` exactly like
 * `deliveryDraftStore.ts`. A convenience, never a source of truth: reads are
 * validated, storage errors fall back to memory, and the server snapshot is
 * the empty draft so SSR and the first client render match.
 */
const SERVER_SNAPSHOT: FlowDraft = emptyFlowDraft();

let current: FlowDraft | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): FlowDraft {
  try {
    return parseStoredFlow(window.sessionStorage.getItem(FLOW_STORAGE_KEY));
  } catch {
    return emptyFlowDraft();
  }
}

export function getSnapshot(): FlowDraft {
  if (current === null) current = readFromStorage();
  return current;
}

export function getServerSnapshot(): FlowDraft {
  return SERVER_SNAPSHOT;
}

export function updateFlow(patch: Partial<FlowDraft>): void {
  current = { ...getSnapshot(), ...patch };
  try {
    window.sessionStorage.setItem(FLOW_STORAGE_KEY, serializeFlow(current));
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
