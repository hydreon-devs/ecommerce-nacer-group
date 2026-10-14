"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Escrituras de la vista de producción: exactamente dos campos, el proveedor
 * (quien surte las mariposas) y el artesano (quien arma el pedido), y nada
 * más. Deliberadamente no toca `advisor_name` — esta vista es de la artesana,
 * no del panel administrativo completo.
 */
async function setOrderName(column: "supplier_name" | "artisan_name", orderId: string, name: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ [column]: name.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw error;

  revalidatePath("/admin/produccion");
  return { ok: true as const };
}

export async function setOrderSupplier(orderId: string, supplierName: string) {
  return setOrderName("supplier_name", orderId, supplierName);
}

export async function setOrderArtisan(orderId: string, artisanName: string) {
  return setOrderName("artisan_name", orderId, artisanName);
}
