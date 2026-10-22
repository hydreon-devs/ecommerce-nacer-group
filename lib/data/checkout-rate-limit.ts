import "server-only";
import { headers } from "next/headers";
import { clientIpFromHeaders, createSlidingWindowLimiter } from "@/lib/rateLimit";

/**
 * Per-IP limits of the public checkout actions. In memory for now (one window
 * per server instance); see the Redis TODO in `lib/rateLimit.ts`.
 *
 * - quote: every call is a Google Distance Matrix request that costs money.
 * - order: every call can reserve stock and consume an order number.
 */
const quoteLimiter = createSlidingWindowLimiter({ limit: 20, windowMs: 60_000 });
const orderLimiter = createSlidingWindowLimiter({ limit: 8, windowMs: 60_000 });

async function allowed(limiter: typeof quoteLimiter): Promise<boolean> {
  const ip = clientIpFromHeaders(await headers());
  return limiter.check(ip).allowed;
}

export const allowQuoteRequest = () => allowed(quoteLimiter);
export const allowOrderRequest = () => allowed(orderLimiter);
