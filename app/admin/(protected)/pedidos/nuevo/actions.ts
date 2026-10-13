"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import {
  advisorNameFor,
  buildPanelSalePayload,
  fieldPaso,
  mapSaleError,
  validatePanelSale,
  type SaleErrorView,
} from "@/lib/domain/panelSale";

export type PanelSaleState = { error: SaleErrorView | null; fieldErrors: Record<string, string> };

/**
 * Registra una venta manual con `create_panel_sale` (todo o nada en la base).
 * El asesor sale de la sesión del servidor, nunca del cliente. Con éxito
 * redirige al detalle; con error devuelve el mensaje y los campos a marcar
 * para que el formulario conserve lo escrito.
 */
export async function createPanelSale(
  input: unknown,
  skuNames: Record<string, string>,
): Promise<PanelSaleState> {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const advisor = advisorNameFor(user);
  if (!user || !advisor) {
    return {
      error: mapSaleError({ ok: false, error: "VENDEDOR_REQUERIDO", paso: "datos" }, {}),
      fieldErrors: {},
    };
  }

  const validated = validatePanelSale(input);
  if (!validated.ok) {
    const first = Object.keys(validated.errors)[0];
    return {
      error: {
        paso: fieldPaso(first),
        message: "Revisa los campos marcados.",
        fields: Object.keys(validated.errors),
      },
      fieldErrors: validated.errors,
    };
  }

  const names = typeof skuNames === "object" && skuNames !== null ? skuNames : {};
  const payload = buildPanelSalePayload(validated.value, advisor);
  const { data, error } = await createAdminClient().rpc("create_panel_sale", { p_payload: payload });

  if (error || typeof data !== "object" || data === null) {
    return {
      error: mapSaleError({ ok: false, error: "INESPERADO", paso: "datos" }, {}),
      fieldErrors: {},
    };
  }

  const result = data as { ok?: boolean; order_id?: string };
  if (result.ok === true && typeof result.order_id === "string") {
    for (const path of ["/admin/pedidos", "/admin/produccion", "/admin/despachos", "/admin/estadisticas"]) {
      revalidatePath(path);
    }
    redirect(`/admin/pedidos/${result.order_id}`);
  }

  return { error: mapSaleError(data, names), fieldErrors: {} };
}
