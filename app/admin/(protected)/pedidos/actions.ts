"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { canMarkLost, validateLostReason } from "@/lib/domain/dispatch";
import { canResolveLost, validateResolution } from "@/lib/domain/lostFollowUp";
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

/**
 * Marca como perdido un pedido que está en despacho (solo Despachos). Escribe
 * únicamente la fase de cumplimiento y el motivo: el pago y el inventario no
 * se tocan. El motivo y la regla se validan aquí, sobre lo guardado; la
 * escritura exige que el pedido siga pagado y en despacho, así que un doble
 * clic o un cambio concurrente no escriben nada.
 * Requiere `orders.lost_reason` (add_lost_reason_to_orders) y `orders.lost_at` (add_lost_follow_up_to_orders).
 */
export async function markOrderLost(orderId: string, reason: string) {
  const checked = validateLostReason(reason);
  if (!checked.ok) return { ok: false as const, error: "MOTIVO_INVALIDO" as const };

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) return { ok: false as const, error: "PEDIDO_NO_EXISTE" as const };
  if (!canMarkLost(order)) return { ok: false as const, error: "PEDIDO_CAMBIO" as const };

  const now = new Date().toISOString();
  const { data: changed, error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "perdido",
      lost_reason: checked.reason,
      lost_at: now,
      updated_at: now,
    })
    .eq("id", orderId)
    .eq("status", "pagado")
    .eq("fulfillment_status", "en_despacho")
    .select("id");

  if (error) throw error;
  if (!changed || changed.length === 0) {
    return { ok: false as const, error: "PEDIDO_CAMBIO" as const };
  }

  revalidateFulfillmentViews();
  return { ok: true as const };
}

/**
 * Registra cómo se resolvió un pedido perdido (solo la página Perdidos). Es un
 * registro: no reembolsa, no crea pedidos y no toca el pago, la fase ni el
 * inventario. Se valida aquí sobre lo guardado y la escritura exige que siga
 * pagado, perdido y sin resolución, así que un doble clic o un cambio
 * concurrente no escriben nada. Requiere la migración add_lost_follow_up_to_orders.
 */
export async function resolveLostOrder(orderId: string, resolution: string, note: string | null) {
  const checked = validateResolution(resolution, note);
  if (!checked.ok) return { ok: false as const, error: checked.error };

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status, fulfillment_status, lost_resolution")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) return { ok: false as const, error: "PEDIDO_NO_EXISTE" as const };
  if (!canResolveLost(order)) return { ok: false as const, error: "PEDIDO_CAMBIO" as const };

  const now = new Date().toISOString();
  const { data: changed, error } = await supabase
    .from("orders")
    .update({
      lost_resolution: checked.resolution,
      lost_resolution_note: checked.note,
      lost_resolved_at: now,
      updated_at: now,
    })
    .eq("id", orderId)
    .eq("status", "pagado")
    .eq("fulfillment_status", "perdido")
    .is("lost_resolution", null)
    .select("id");

  if (error) throw error;
  if (!changed || changed.length === 0) {
    return { ok: false as const, error: "PEDIDO_CAMBIO" as const };
  }

  revalidateFulfillmentViews();
  revalidatePath("/admin/perdidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true as const };
}
