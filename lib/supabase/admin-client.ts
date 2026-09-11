import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la llave `service_role`: se salta RLS por completo (spec 001
 * §6). Úsalo solo para leer/escribir `orders`, `products`,
 * `product_variants` y Storage — nunca para verificar sesión, eso vive en
 * `lib/supabase/auth-server.ts`. El import de `server-only` hace fallar el
 * build si algún componente cliente llega a importar este archivo.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
