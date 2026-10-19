/**
 * PostgREST rechaza a veces un JWT interno con `PGRST303` ("JWT issued at
 * future") cuando el gateway de Supabase cambia la clave opaca `sb_secret_`
 * por un token de corta vida. El `iat` de ese token se firma con el reloj
 * del gateway; si va un instante por delante del de PostgREST, la petición
 * falla. Un reintento corto suele caer en un nodo alineado (supabase#49655).
 *
 * Sin `server-only`: `node --test` lo carga directo.
 */
export const JWT_SKEW_RETRY_DELAYS_MS = [300, 900] as const;

function isJwtIssuedAtFuture(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    (body as { code: unknown }).code === "PGRST303"
  );
}

export async function fetchWithJwtSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(input, init);
    if (response.status !== 401 || attempt >= JWT_SKEW_RETRY_DELAYS_MS.length) {
      return response;
    }

    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      return response;
    }

    if (!isJwtIssuedAtFuture(body)) return response;
    await sleep(JWT_SKEW_RETRY_DELAYS_MS[attempt]);
  }
}
