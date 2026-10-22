import type { DistanceProvider } from "./distanceProvider.ts";
import { isMunicipality } from "./municipalities.ts";

/**
 * Delivery quote use case. Dependencies are injected so it runs without
 * network or database in tests.
 *
 * The fee NEVER comes from this code: it comes from the database RPC
 * `quote_delivery(p_distance_m)` (spec 035), wrapped by `FeeFunction`. The
 * tariff tiers are not duplicated in TypeScript. The fee computed here is
 * DISPLAY ONLY: slice 4 re-measures and re-quotes server-side.
 */

export const ADDRESS_MIN_LENGTH = 5;
export const ADDRESS_MAX_LENGTH = 200;

export type FeeResult =
  | { ok: true; feeCop: number }
  | { ok: false; error: "out_of_coverage" | "unavailable" };

/** `meters -> fee`, backed by the `quote_delivery` RPC in production. */
export type FeeFunction = (meters: number) => Promise<FeeResult>;

export type QuoteErrorKind =
  | "invalid_input"
  | "not_configured"
  | "address_not_found"
  | "provider_error"
  | "out_of_coverage"
  | "fee_unavailable";

export type QuoteDeliveryResult =
  | { ok: true; resolvedAddress: string; meters: number; feeCop: number }
  | { ok: false; error: QuoteErrorKind };

export interface QuoteDeliveryDeps {
  distance: DistanceProvider;
  fee: FeeFunction;
}

/** Free text + municipality, like n8n; the city and country anchor Google's search. */
export function buildDestination(address: string, municipality: string): string {
  return `${address.trim()}, ${municipality}, Antioquia, Colombia`;
}

export async function quoteDelivery(
  input: { address: string; municipality: string },
  deps: QuoteDeliveryDeps,
): Promise<QuoteDeliveryResult> {
  const address = input.address.trim();
  if (
    address.length < ADDRESS_MIN_LENGTH ||
    address.length > ADDRESS_MAX_LENGTH ||
    !isMunicipality(input.municipality)
  ) {
    return { ok: false, error: "invalid_input" };
  }

  let measured;
  try {
    measured = await deps.distance.measure(buildDestination(address, input.municipality));
  } catch {
    return { ok: false, error: "provider_error" };
  }
  if (!measured.ok) return { ok: false, error: measured.error.kind };

  let fee;
  try {
    fee = await deps.fee(measured.meters);
  } catch {
    return { ok: false, error: "fee_unavailable" };
  }
  if (!fee.ok) {
    return { ok: false, error: fee.error === "out_of_coverage" ? "out_of_coverage" : "fee_unavailable" };
  }

  return {
    ok: true,
    resolvedAddress: measured.resolvedAddress,
    meters: measured.meters,
    feeCop: fee.feeCop,
  };
}

/**
 * Reads the jsonb returned by `quote_delivery`:
 * `{ ok: true, distancia_km, costo_domicilio }` or `{ ok: false, error, ... }`.
 * A payload that is not exactly that yields `unavailable`; no fee is invented.
 */
export function parseQuoteDeliveryRpc(payload: unknown): FeeResult {
  const unavailable: FeeResult = { ok: false, error: "unavailable" };
  if (typeof payload !== "object" || payload === null) return unavailable;
  const body = payload as Record<string, unknown>;

  if (body.ok === false) {
    return body.error === "FUERA_DE_COBERTURA"
      ? { ok: false, error: "out_of_coverage" }
      : unavailable;
  }
  if (body.ok !== true) return unavailable;

  const raw = body.costo_domicilio;
  if (raw === null || raw === undefined || raw === "") return unavailable;
  const fee = Number(raw);
  if (!Number.isFinite(fee) || fee < 0) return unavailable;
  return { ok: true, feeCop: Math.round(fee) };
}

const MESSAGES: Record<QuoteErrorKind, string> = {
  invalid_input:
    "Revisa la dirección y el municipio: necesitamos una dirección completa, por ejemplo «Calle 10 #5-20».",
  not_configured:
    "Por ahora no podemos calcular el domicilio en línea. Escríbenos por WhatsApp y lo coordinamos contigo.",
  address_not_found:
    "No logramos ubicar esa dirección. Revisa que esté completa (tipo de vía, número y municipio) e inténtalo de nuevo.",
  provider_error:
    "No pudimos calcular el domicilio en este momento. Inténtalo de nuevo en unos minutos.",
  out_of_coverage:
    "Esa dirección queda fuera de nuestra zona de entrega. Escríbenos por WhatsApp y vemos cómo hacerlo posible.",
  fee_unavailable:
    "No pudimos calcular el valor del domicilio en este momento. Inténtalo de nuevo en unos minutos.",
};

/** Customer-facing copy (Spanish) for each failure; never leaks provider details. */
export function quoteErrorMessage(kind: QuoteErrorKind): string {
  return MESSAGES[kind];
}
