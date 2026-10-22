/**
 * Port for measuring the driving distance from the workshop to an address.
 * Adapters: Google Distance Matrix (`lib/data/google-distance-provider.ts`,
 * server-only) and a fake for tests (`fakeDistanceProvider.ts`).
 */

/**
 * Workshop origin, written once. Same string as the n8n flow (spec 006 §5);
 * if the workshop moves, change it here and nowhere else.
 */
export const WORKSHOP_ORIGIN = "Cl. 35cc #8951, La América, Medellín, Antioquia, Colombia";

export type DistanceErrorKind =
  /** The server key is missing: the quote is unavailable, never a crash. */
  | "not_configured"
  /** Google could not place the address (ZERO_RESULTS / NOT_FOUND). */
  | "address_not_found"
  /** Rejected key, quota, network failure or a response we cannot read. */
  | "provider_error";

export interface DistanceError {
  kind: DistanceErrorKind;
  /** Technical detail for server logs only; never shown to the customer. */
  detail?: string;
}

export interface Distance {
  /** Integer meters by road. */
  meters: number;
  /** The address as Google understood it, for the customer to confirm. */
  resolvedAddress: string;
}

export type DistanceResult =
  | ({ ok: true } & Distance)
  | { ok: false; error: DistanceError };

export interface DistanceProvider {
  measure(address: string): Promise<DistanceResult>;
}
