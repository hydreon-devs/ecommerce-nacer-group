"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { nextStep } from "@/lib/domain/fulfillmentFlow";

/** Todas las pantallas que muestran la fase de cumplimiento. */
function revalidateFulfillmentViews() {
  for (const path of ["/admin/pedidos", "/admin/produccion", "/admin/despachos", "/admin/estadisticas"]) {
    revalidatePath(path);
  }
}

/**
 * Avanza un pedido a su siguiente paso (Producción y Despachos). Es la única
 * escritura de la fase de cumplimiento desde el panel: el estado cambia por
 * proceso, no a mano. El destino lo decide el servidor con `nextStep` a partir
 * de lo guardado, no lo que diga el cliente; la escritura exige que la fase
 * siga siendo la leída, así que un doble clic o dos personas a la vez no
 * saltan pasos.
 */
export async function advanceFulfillment(orderId: string) {
  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status, fulfillment_status, delivery_method")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) return { ok: false as const, error: "PEDIDO_NO_EXISTE" as const };

  const step = nextStep(order);
  if (!step) return { ok: false as const, error: "SIN_SIGUIENTE_PASO" as const };

  const update = supabase
    .from("orders")
    .update({ fulfillment_status: step.to, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pagado");
  const { data: changed, error } = await (
    order.fulfillment_status === null
      ? update.is("fulfillment_status", null)
      : update.eq("fulfillment_status", order.fulfillment_status)
  ).select("id");

  if (error) throw error;
  if (!changed || changed.length === 0) {
    return { ok: false as const, error: "PEDIDO_CAMBIO" as const };
  }

  revalidateFulfillmentViews();
  return { ok: true as const };
}
