"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import {
  rpcErrorMessage,
  validateRecipeRows,
  type RecipeRow,
} from "@/lib/domain/stockRecipe";

export type FormState = { error: string | null; saved?: boolean };

type RpcResult = { ok: boolean; error?: string; mensaje?: string; [key: string]: unknown };

async function callRpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: "RPC", mensaje: error.message };
  return (data ?? { ok: false }) as RpcResult;
}

function failure(res: RpcResult): { ok: false; error: string } {
  return { ok: false, error: rpcErrorMessage(res.error, res.mensaje) };
}

async function currentActor(): Promise<string> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "panel";
}

const itemFieldsSchema = z.object({
  sku: z.string().trim().min(2, "El SKU es obligatorio.").max(60),
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1, "La unidad es obligatoria.").max(20),
});

export async function createStockItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = itemFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const input = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.from("stock_items").insert({
    sku: input.sku,
    name: input.name,
    description: input.description || null,
    unit: input.unit,
    kind: "component",
  });
  if (error) {
    return {
      error: error.code === "23505" ? `El SKU "${input.sku}" ya existe.` : `No se pudo crear el insumo: ${error.message}`,
    };
  }
  revalidatePath("/admin/productos/insumos");
  redirect(`/admin/productos/insumos/${encodeURIComponent(input.sku)}`);
}

export async function updateStockItem(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = itemFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const input = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("stock_items")
    .update({
      sku: input.sku,
      name: input.name,
      description: input.description || null,
      unit: input.unit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) {
    return {
      error: error.code === "23505" ? `El SKU "${input.sku}" ya existe.` : `No se pudo guardar: ${error.message}`,
    };
  }
  revalidatePath("/admin/productos/insumos");
  // Si el SKU cambió, la URL de la ficha cambia: hay que redirigir. Si no, se
  // queda en la página y se confirma el guardado en el formulario.
  if (formData.get("previousSku") === input.sku) return { error: null, saved: true };
  redirect(`/admin/productos/insumos/${encodeURIComponent(input.sku)}`);
}

export async function setStockItemActive(itemId: string, sku: string, active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("stock_items")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
  revalidatePath("/admin/productos/insumos");
  revalidatePath(`/admin/productos/insumos/${sku}`);
}

const adjustSchema = z.object({
  itemId: z.string().uuid(),
  mode: z.enum(["delta", "set"]),
  qty: z.coerce.number().int(),
  reason: z.string().trim().min(1, "Indica el motivo del ajuste."),
});

export type AdjustResult =
  | { ok: true; stockQty: number; reserved: number; available: number; warning: string | null }
  | { ok: false; error: string };

export async function adjustStockItem(input: {
  itemId: string;
  mode: "delta" | "set";
  qty: number;
  reason: string;
}): Promise<AdjustResult> {
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const res = await callRpc("adjust_stock_item", {
    p_item: parsed.data.itemId,
    p_mode: parsed.data.mode,
    p_qty: parsed.data.qty,
    p_reason: parsed.data.reason,
    p_actor: await currentActor(),
  });
  if (!res.ok) return failure(res);

  revalidatePath("/admin/productos", "layout");
  return {
    ok: true,
    stockQty: Number(res.stock_qty),
    reserved: Number(res.reserved),
    available: Number(res.available),
    warning:
      res.warning === "STOCK_MENOR_QUE_RESERVADO"
        ? "El stock quedó por debajo de lo reservado: hay reservas activas que no se podrán cumplir completas."
        : null,
  };
}

export type DeleteResult =
  | { ok: true; deleted: true }
  | { ok: true; deleted: false; archived: true; usedIn: string[]; options: string[]; message: string }
  | { ok: false; error: string };

export async function deleteStockItem(itemId: string): Promise<DeleteResult> {
  const res = await callRpc("delete_stock_item", { p_item: itemId });
  if (!res.ok) return failure(res);
  revalidatePath("/admin/productos", "layout");
  if (res.deleted) return { ok: true, deleted: true };
  return {
    ok: true,
    deleted: false,
    archived: true,
    usedIn: (res.usado_en as string[] | undefined) ?? [],
    options: (res.opciones as string[] | undefined) ?? [],
    message: (res.mensaje as string | undefined) ?? "El insumo está en uso y se archivó.",
  };
}

export type RecipeResult =
  | { ok: true; availableUnits: number | null }
  | { ok: false; error: string };

const rowsSchema = z.array(
  z.object({ stockItemId: z.string(), qtyRequired: z.number() }),
);

async function saveRecipe(
  kind: "variant" | "option",
  id: string,
  rows: RecipeRow[],
): Promise<RecipeResult> {
  const parsedRows = rowsSchema.safeParse(rows);
  if (!parsedRows.success) return { ok: false, error: rpcErrorMessage("COMPONENTES_INVALIDOS") };

  const validation = validateRecipeRows(parsedRows.data, { allowEmpty: kind === "option" });
  if (!validation.ok) return { ok: false, error: rpcErrorMessage(validation.error) };

  const components = parsedRows.data.map((r) => ({
    stock_item_id: r.stockItemId,
    qty_required: r.qtyRequired,
  }));
  const res =
    kind === "variant"
      ? await callRpc("set_variant_components", { p_variant: id, p_components: components })
      : await callRpc("set_option_components", { p_option: id, p_components: components });
  if (!res.ok) return failure(res);

  revalidatePath("/admin/productos", "layout");
  return { ok: true, availableUnits: kind === "variant" ? Number(res.available_units) : null };
}

export async function saveVariantRecipe(variantId: string, rows: RecipeRow[]) {
  return saveRecipe("variant", variantId, rows);
}

export async function saveOptionRecipe(optionId: string, rows: RecipeRow[]) {
  return saveRecipe("option", optionId, rows);
}
