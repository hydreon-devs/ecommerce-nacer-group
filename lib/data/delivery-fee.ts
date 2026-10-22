import "server-only";
import { parseQuoteDeliveryRpc, type FeeFunction } from "@/lib/domain/checkout/quoteDelivery";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Delivery fee from the database RPC `quote_delivery(p_distance_m)` (spec 035).
 * The tariff tiers live only there; nothing here knows a price. The RPC is
 * granted to `service_role` only, hence the admin client, server-side.
 */
export const fetchDeliveryFee: FeeFunction = async (meters) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("quote_delivery", { p_distance_m: meters });
  if (error) return { ok: false, error: "unavailable" };
  return parseQuoteDeliveryRpc(data);
};
