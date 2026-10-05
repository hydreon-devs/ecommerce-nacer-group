# 0002 — Dos clientes de Supabase separados en el panel

**Fecha:** 2026-09-11 · **Estado:** Aceptada · **Spec relacionada:** `specs/002_mvp_panel_administracion`

## Contexto

El panel necesita dos cosas de Supabase que no deberían compartir código ni credencial:
verificar quién inició sesión (login/logout), y leer/escribir `orders`, `products` y el
resto del catálogo saltándose RLS por completo (porque las 14 tablas de este proyecto tienen
RLS habilitado sin políticas — spec 001 §6 — así que solo `service_role` puede operar sobre
ellas desde un cliente que no sea el propio Supabase Auth).

Un solo cliente configurado con `service_role` "porque ya está importado" es el error más
fácil de cometer aquí: mezclaría la sesión de autenticación (que debe viajar en cookies
`httpOnly`, atada al usuario real) con la llave que se salta toda protección de fila.

## Decisión

Dos módulos en `lib/supabase/`, con fronteras estrictas:

- `auth-server.ts` — `createServerClient` de `@supabase/ssr`, llave `anon`. Solo se usa para
  `auth.getUser()`, `signInWithPassword()`, `signOut()`. **Nunca** consulta `orders` ni
  `products`.
- `admin-client.ts` — `createClient` de `@supabase/supabase-js`, llave `service_role`,
  marcado con `import "server-only"` en la primera línea para que el build falle si algún
  componente cliente llega a importarlo por error. Todas las consultas de negocio del panel
  pasan por aquí.

`proxy.ts` (ADR 0001) usa exclusivamente `auth-server.ts`. Ninguna Server Action ni Server
Component del panel importa `service_role` fuera de `admin-client.ts`.

## Alternativas consideradas

**Un solo cliente con `service_role` en todos lados.** Más simple de escribir, pero borra la
frontera entre "verificar identidad" y "tener acceso total a los datos" — un bug en el login
podría filtrar la llave más sensible del proyecto hacia código pensado para manejar cookies
de sesión, o viceversa.

## Consecuencias

- Cualquier ruta o acción nueva del panel debe decidir explícitamente cuál de los dos
  clientes necesita — es una pregunta de diseño de una línea, no una carga extra real.
- Las variables de entorno (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) viven las dos
  en `.env.local`, pero solo `SUPABASE_SERVICE_ROLE_KEY` es genuinamente secreta — ninguna
  herramienta de MCP la expone; el usuario la copia a mano del dashboard.
