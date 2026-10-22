import type { DistanceProvider, DistanceResult } from "./distanceProvider.ts";

/** Test double: answers a fixed result (or computes one) and records the addresses asked. */
export function createFakeDistanceProvider(
  answer: DistanceResult | ((address: string) => DistanceResult),
): DistanceProvider & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async measure(address: string) {
      calls.push(address);
      return typeof answer === "function" ? answer(address) : answer;
    },
  };
}
