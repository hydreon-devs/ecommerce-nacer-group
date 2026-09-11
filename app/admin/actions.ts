"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

/**
 * Cierra sesión en este dispositivo (`scope: "local"` — plan §3.3, sin
 * decidir todavía si algún flujo necesita cerrar sesión en todos lados).
 */
export async function signOut() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
