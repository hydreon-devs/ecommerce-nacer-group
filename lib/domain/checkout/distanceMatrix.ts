import type { DistanceResult } from "./distanceProvider.ts";

/**
 * Pure parser of a Google Distance Matrix response, with the same validations,
 * in the same order, as the n8n node `Extraer Metros de la Respuesta`
 * (asistente spec 006 plan §5):
 *
 *  1. Top-level `status` is `OK`; otherwise Google rejected the request (key,
 *     quota, malformed): a provider error, and the rows are not read.
 *  2. The element `status` is `OK`; `ZERO_RESULTS` / `NOT_FOUND` mean the
 *     address cannot be located.
 *  3. Returns the meters and the address Google understood.
 *
 * It does NOT convert to km or compute any fee: the database does that
 * (`quote_delivery`). Never throws, whatever the input shape.
 */

const MALFORMED = {
  ok: false,
  error: { kind: "provider_error", detail: "malformed Distance Matrix response" },
} as const satisfies DistanceResult;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseDistanceMatrix(payload: unknown): DistanceResult {
  const root = asRecord(payload);
  if (!root) return MALFORMED;

  if (root.status !== "OK") {
    const status = typeof root.status === "string" ? root.status : "no status";
    return { ok: false, error: { kind: "provider_error", detail: `Distance Matrix status ${status}` } };
  }

  const rows = root.rows;
  const row = Array.isArray(rows) ? asRecord(rows[0]) : null;
  const elements = row?.elements;
  const element = Array.isArray(elements) ? asRecord(elements[0]) : null;
  if (!element) return MALFORMED;

  if (element.status === "ZERO_RESULTS" || element.status === "NOT_FOUND") {
    return { ok: false, error: { kind: "address_not_found", detail: String(element.status) } };
  }
  if (element.status !== "OK") {
    const status = typeof element.status === "string" ? element.status : "no status";
    return { ok: false, error: { kind: "provider_error", detail: `element status ${status}` } };
  }

  const meters = asRecord(element.distance)?.value;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) return MALFORMED;

  const destinations = root.destination_addresses;
  const resolved = Array.isArray(destinations) ? destinations[0] : undefined;
  if (typeof resolved !== "string" || resolved.trim() === "") return MALFORMED;

  return { ok: true, meters: Math.round(meters), resolvedAddress: resolved.trim() };
}
