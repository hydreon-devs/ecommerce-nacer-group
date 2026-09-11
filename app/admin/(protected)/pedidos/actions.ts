"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";
import type { FulfillmentStatus } from "@/lib/data/orders";

/**
 * No tiene sentido "en despacho" sobre un pedido que no está pagado (plan
 * §4.1) — se rechaza explícitamente en vez de escribir en silencio.
 */
export async function setFulfillmentStatus(orderId: string, status: FulfillmentStatus) {
  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) return { ok: false as const, error: "PEDIDO_NO_EXISTE" as const };
  if (order.status !== "pagado") {
    return { ok: false as const, error: "PEDIDO_NO_PAGADO" as const };
  }

  const { error } = await supabase
    .from("orders")
    .update({ fulfillment_status: status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw error;

  revalidatePath("/admin/pedidos");
  return { ok: true as const };
}
