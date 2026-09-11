import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente con la llave `anon`, atado a las cookies de la request actual.
 * Solo se usa para `auth.getUser()` / `signInWithPassword()` / `signOut()`
 * en Server Components y Server Actions — nunca lee ni escribe tablas de
 * negocio (eso es `lib/supabase/admin-client.ts`).
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno del servidor.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component, que no puede escribir cookies.
          // El middleware (lib/supabase/middleware.ts) refresca la sesión.
        }
      },
    },
  });
}
