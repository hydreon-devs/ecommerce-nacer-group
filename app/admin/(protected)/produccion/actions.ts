"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Única escritura que puede hacer la vista de producción: el proveedor que
 * arma el pedido. Deliberadamente no toca `advisor_name` ni nada más —
 * esta vista es de la artesana, no del panel administrativo completo.
 */
export async function setOrderSupplier(orderId: string, supplierName: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ supplier_name: supplierName.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw error;

  revalidatePath("/admin/produccion");
  return { ok: true as const };
}
