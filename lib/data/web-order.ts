import "server-only";
import type { CreateWebOrderPayload } from "@/lib/domain/checkout/webOrderPayload";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * `create_web_order(p_payload jsonb)`: creates the open web order, its stock
 * reservations (60 min) and the customer details in one transaction. The RPC is
 * granted to `service_role` only, hence the admin client, server-side.
 *
 * Returns the raw jsonb: reading it is the domain's job
 * (`parseCreateWebOrderResult`). A transport error throws, and the use case
 * turns it into a "try again" route.
 */
export async function callCreateWebOrder(payload: CreateWebOrderPayload): Promise<unknown> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_web_order", { p_payload: payload });
  if (error) throw new Error(`create_web_order failed: ${error.code ?? "unknown"}`);
  return data;
}
