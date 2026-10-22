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

/**
 * Server actions of checkout step 1. They are public POST endpoints: inputs are
 * untrusted and validated here, and nothing they return is a source of truth
 * (slice 4 re-reads prices, re-measures and reserves stock).
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
