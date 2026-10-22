import { z } from "zod";
import type { OrderRoute, WebOrder } from "./webOrderResult.ts";

/**
 * The attempt manager. `create_web_order` is idempotent per `attempt_id`: the
 * same id returns the same order and ignores whatever else the payload says.
 * So the id must change exactly when the order content changes:
 *
 *  - same content again (double submit, reload): SAME attempt, the RPC
 *    answers with the existing order (`reutilizado`);
 *  - content changed after an order exists (cart, delivery or details edited
 *    from the Summary): NEW attempt that `replaces` the old one, so the old
 *    reservation is released in the same transaction;
 *  - `INTENTO_CERRADO` (expired, paid, cancelled): NEW attempt, nothing to replace.
 *
 * Pure. The id generator is injected so tests are deterministic.
 */

export interface AttemptState {
  id: string;
  /** The attempt this one replaces; null when there is nothing to release. */
  replacesId: string | null;
  /** Signature of the content last submitted with this attempt. */
  signature: string | null;
  /** Set once the server confirmed an order for this attempt. */
  orderId: string | null;
}

export type CreateOrderResult =
  | { ok: true; order: WebOrder }
  | { ok: false; route: OrderRoute };

const attemptSchema = z.object({
  id: z.uuid(),
  replacesId: z.uuid().nullable(),
  signature: z.string().nullable(),
  orderId: z.uuid().nullable(),
});

/** Validates stored state (sessionStorage is never trusted). */
export function parseStoredAttempt(raw: unknown): AttemptState | null {
  const parsed = attemptSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** The attempt to submit `signature` with. */
export function beginAttempt(
  state: AttemptState | null,
  signature: string,
  newId: () => string,
): AttemptState {
  if (state === null) return { id: newId(), replacesId: null, signature, orderId: null };
  if (state.signature === null) return { ...state, signature };
  if (state.signature === signature) return state;

  // Content changed. Replace the order that exists; if none was confirmed, keep
  // replacing what an earlier changed attempt already pointed at, and failing
  // that the previous attempt itself (its answer may have been lost).
  const replacesId = state.orderId !== null ? state.id : (state.replacesId ?? state.id);
  return { id: newId(), replacesId, signature, orderId: null };
}

export function recordCreated(state: AttemptState, orderId: string): AttemptState {
  return { ...state, orderId };
}

/** After `INTENTO_CERRADO`: a brand-new attempt for the same content. */
export function restartAfterClosed(
  _state: AttemptState,
  signature: string,
  newId: () => string,
): AttemptState {
  return { id: newId(), replacesId: null, signature, orderId: null };
}

/**
 * RFC 4122 v4 uuid from 16 random bytes. The browser feeds it
 * `crypto.getRandomValues`, which (unlike `crypto.randomUUID`) also exists in
 * insecure contexts such as a LAN dev server.
 */
export function uuidV4FromBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error("uuidV4FromBytes needs 16 bytes");
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface SubmitOrderInput {
  state: AttemptState | null;
  signature: string;
  newId: () => string;
  /** The server action, reduced to the attempt it must use. */
  call: (attempt: { attemptId: string; replacesAttemptId: string | null }) => Promise<CreateOrderResult>;
}

const NETWORK_ERROR: OrderRoute = {
  kind: "retry",
  message: "No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.",
};

/**
 * One submission: picks the attempt, calls the server and, if the attempt is
 * closed, starts a new one once, transparently. Returns the attempt to store.
 */
export async function submitOrder(input: SubmitOrderInput): Promise<{
  attempt: AttemptState;
  result: CreateOrderResult;
}> {
  let attempt = beginAttempt(input.state, input.signature, input.newId);
  let result = await callSafely(input, attempt);

  if (!result.ok && result.route.kind === "intento") {
    attempt = restartAfterClosed(attempt, input.signature, input.newId);
    result = await callSafely(input, attempt);
  }

  if (result.ok) attempt = recordCreated(attempt, result.order.orderId);
  return { attempt, result };
}

async function callSafely(input: SubmitOrderInput, attempt: AttemptState): Promise<CreateOrderResult> {
  try {
    return await input.call({ attemptId: attempt.id, replacesAttemptId: attempt.replacesId });
  } catch {
    return { ok: false, route: NETWORK_ERROR };
  }
}
