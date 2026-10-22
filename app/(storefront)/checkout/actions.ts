"use server";

import {
  classifyCartLines,
  parseCheckLines,
  type LineAvailability,
} from "@/lib/domain/checkout/availability";
import {
  quoteDelivery,
  quoteErrorMessage,
  type QuoteErrorKind,
} from "@/lib/domain/checkout/quoteDelivery";
import { isMunicipality } from "@/lib/domain/checkout/municipalities";
import { getFreshStorefrontProducts } from "@/lib/data/storefront-products";
import { fetchDeliveryFee } from "@/lib/data/delivery-fee";
import { createGoogleDistanceProvider } from "@/lib/data/google-distance-provider";
import { callCreateWebOrder } from "@/lib/data/web-order";
import { allowOrderRequest, allowQuoteRequest } from "@/lib/data/checkout-rate-limit";
import type { CreateOrderResult } from "@/lib/domain/checkout/attempt";
import { createWebOrder } from "@/lib/domain/checkout/createWebOrder";

/**
 * Server actions of checkout. They are public POST endpoints: inputs are
 * untrusted and validated here, and each is rate limited per IP. Step 1 answers
 * are display only; `createWebOrderAction` re-measures, re-prices and reserves.
 */

export type AvailabilityResponse =
  | { ok: true; lines: LineAvailability[] }
  | { ok: false; message: string };

/**
 * Non-reserving availability re-check of the cart, read fresh (not the 5-minute
 * catalog cache). Nothing is held or written.
 */
export async function checkCartAvailability(input: unknown): Promise<AvailabilityResponse> {
  const lines = parseCheckLines(input);
  if (!lines) {
    return { ok: false, message: "No pudimos leer tu carrito. Vuelve a abrirlo e inténtalo de nuevo." };
  }
  if (lines.length === 0) return { ok: true, lines: [] };

  try {
    const fresh = await getFreshStorefrontProducts([...new Set(lines.map((l) => l.productoId))]);
    return { ok: true, lines: classifyCartLines(lines, { products: fresh.products, unitsByVariant: fresh.unitsByVariant }) };
  } catch (error) {
    console.error("checkCartAvailability failed", error);
    return {
      ok: false,
      message: "No pudimos revisar la disponibilidad ahora mismo. Inténtalo de nuevo en unos minutos.",
    };
  }
}

export type QuoteResponse =
  | { ok: true; resolvedAddress: string; meters: number; feeCop: number }
  | { ok: false; error: QuoteErrorKind; message: string };

/**
 * Measures the road distance from the workshop (Google Distance Matrix) and
 * prices it with the database RPC `quote_delivery`. The fee is DISPLAY ONLY
 * here. A missing key returns the typed `not_configured` error, never a crash.
 */
export async function quoteDeliveryAction(input: unknown): Promise<QuoteResponse> {
  if (!(await allowQuoteRequest())) {
    return { ok: false, error: "rate_limited", message: quoteErrorMessage("rate_limited") };
  }
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const address = typeof body.address === "string" ? body.address : "";
  const municipality = typeof body.municipality === "string" ? body.municipality : "";
  if (!isMunicipality(municipality)) {
    return { ok: false, error: "invalid_input", message: quoteErrorMessage("invalid_input") };
  }

  const result = await quoteDelivery(
    { address, municipality },
    { distance: createGoogleDistanceProvider(), fee: fetchDeliveryFee },
  );
  if (result.ok) return result;
  return { ok: false, error: result.error, message: quoteErrorMessage(result.error) };
}

/**
 * Creates the open web order (reservations, delivery, customer details) from
 * the cart, the delivery choice and the form. Everything in `input` is
 * untrusted: the use case validates it with the shared schemas, re-measures
 * the distance and lets the database price the lines. The answer is typed so
 * the client knows where to send the customer on a failure.
 */
export async function createWebOrderAction(input: unknown): Promise<CreateOrderResult> {
  if (!(await allowOrderRequest())) {
    return {
      ok: false,
      route: { kind: "retry", message: "Estás intentando muy seguido. Espera un momento y vuelve a intentarlo." },
    };
  }
  return createWebOrder(input, {
    distance: createGoogleDistanceProvider(),
    rpc: callCreateWebOrder,
  });
}
