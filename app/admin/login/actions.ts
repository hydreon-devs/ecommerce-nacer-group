"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export type LoginState = { error: string | null };

/**
 * Sin registro propio (plan §3.2): las cuentas del panel se crean a mano en
 * el dashboard de Supabase Auth. Error genérico ante fallo, sin distinguir
 * "usuario no existe" de "contraseña incorrecta" (evita enumeración).
 */
export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contraseña." };
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/admin");
}
