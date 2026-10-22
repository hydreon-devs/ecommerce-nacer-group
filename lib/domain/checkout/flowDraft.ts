import { z } from "zod";
import { parseStoredAttempt, type AttemptState } from "./attempt.ts";
import {
  emptyDetailsDraft,
  OCCASIONS,
  REFERRAL_SOURCES,
  YES_NO,
  type DetailsDraft,
  type DetailsPageNumber,
} from "./saleDetails.ts";

/**
 * Checkout progress past step 1, kept in `sessionStorage` so a reload keeps the
 * form and the order the customer was looking at. Like the delivery draft it
 * is a convenience, NEVER a source of truth: reads are validated, anything odd
 * starts over, and the server re-validates and re-prices every submission.
 *
 * It stores the attempt (ids and a content signature), not the order: on a
 * reload with an order, the client asks the RPC again with the same attempt,
 * which answers idempotently (`reutilizado`).
 */

export type CheckoutStep = 1 | 2 | 3;

export interface FlowDraft {
  step: CheckoutStep;
  /** Sub-page of step 2 ("Tus datos"), 1 to 4. */
  subPage: DetailsPageNumber;
  details: DetailsDraft;
  attempt: AttemptState | null;
}

export const FLOW_VERSION = 1;
export const FLOW_STORAGE_KEY = "nacer.checkout.flow";

export function emptyFlowDraft(): FlowDraft {
  return { step: 1, subPage: 1, details: emptyDetailsDraft(), attempt: null };
}

// Generous caps: the real limits are enforced by the details schemas.
const short = z.string().max(500);
const long = z.string().max(5000);

const detailsSchema = z.object({
  buyer_name: short,
  buyer_phone: short,
  buyer_email: short,
  recipient_name: short,
  recipient_phone: short,
  may_call_recipient: z.union([z.literal(""), z.enum(YES_NO)]),
  occasion: z.union([z.literal(""), z.enum(OCCASIONS)]),
  card_from: short,
  card_to: short,
  card_message: long,
  special_notes: long,
  wants_invoice: z.union([z.literal(""), z.enum(YES_NO)]),
  invoice_legal_name: short,
  invoice_tax_id: short,
  invoice_email: short,
  referral_source: z.union([z.literal(""), z.enum(REFERRAL_SOURCES)]),
});

const storedSchema = z.object({
  version: z.literal(FLOW_VERSION),
  draft: z.object({
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    subPage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    details: detailsSchema,
    attempt: z.unknown(),
  }),
});

export function serializeFlow(draft: FlowDraft): string {
  return JSON.stringify({ version: FLOW_VERSION, draft });
}

/** Safe read of `sessionStorage` content: anything unexpected yields an empty draft. */
export function parseStoredFlow(raw: string | null): FlowDraft {
  if (!raw) return emptyFlowDraft();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyFlowDraft();
  }
  const parsed = storedSchema.safeParse(json);
  if (!parsed.success) return emptyFlowDraft();
  const { step, subPage, details, attempt } = parsed.data.draft;
  if (attempt !== null && attempt !== undefined) {
    const valid = parseStoredAttempt(attempt);
    if (valid === null) return emptyFlowDraft();
    return { step, subPage, details, attempt: valid };
  }
  return { step, subPage, details, attempt: null };
}

/**
 * Pulls the stored step back to what is actually reachable: step 2 needs a
 * complete delivery, step 3 needs an order created for the attempt.
 */
export function reconcileFlow(flow: FlowDraft, ctx: { deliveryReady: boolean }): FlowDraft {
  if (!ctx.deliveryReady) return flow.step === 1 ? flow : { ...flow, step: 1 };
  if (flow.step === 3 && flow.attempt?.orderId == null) return { ...flow, step: 2, subPage: 4 };
  return flow;
}
