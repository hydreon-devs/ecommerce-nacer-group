import "server-only";
import { parseDistanceMatrix } from "@/lib/domain/checkout/distanceMatrix";
import {
  WORKSHOP_ORIGIN,
  type DistanceProvider,
} from "@/lib/domain/checkout/distanceProvider";

const ENDPOINT = "https://maps.googleapis.com/maps/api/distancematrix/json";
const TIMEOUT_MS = 8_000;

/**
 * Google Distance Matrix adapter. SERVER-ONLY: `GOOGLE_MAPS_SERVER_KEY` has no
 * `NEXT_PUBLIC_` prefix and must never reach the browser (restrict it by
 * server IP / API in Google Cloud). When the key is missing the provider
 * answers `not_configured` instead of throwing, so checkout degrades to a
 * friendly message. Request details (the URL carries the key) are never logged.
 */
export function createGoogleDistanceProvider(): DistanceProvider {
  return {
    async measure(destination) {
      const key = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
      if (!key) return { ok: false, error: { kind: "not_configured" } };

      const url = new URL(ENDPOINT);
      url.search = new URLSearchParams({
        origins: WORKSHOP_ORIGIN,
        destinations: destination,
        mode: "driving",
        region: "co",
        key,
      }).toString();

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) {
          return { ok: false, error: { kind: "provider_error", detail: `HTTP ${response.status}` } };
        }
        return parseDistanceMatrix(await response.json());
      } catch {
        return { ok: false, error: { kind: "provider_error", detail: "request failed" } };
      }
    },
  };
}
