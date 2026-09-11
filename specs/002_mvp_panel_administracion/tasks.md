# Tareas: MVP del Panel de Administración (002)

**Especificación:** `specs/002_mvp_panel_administracion/spec.md`
**Plan:** `specs/002_mvp_panel_administracion/plan.md`

Una tarea no se marca hecha hasta que su resultado esté verificado. La migración de la Fase 1
se **muestra para aprobación explícita antes de ejecutarse** (regla del encargo) — no se
aplica solo porque esta lista de tareas exista.

## Fase 0 — Antes de empezar

- [x] **T-0.1** Aprobar `spec.md` (decisiones §2.5, §3.4).
- [x] **T-0.2** Aprobar `plan.md` (arquitectura, acceso, verificaciones de código).
- [ ] **T-0.3** El usuario pega `SUPABASE_SERVICE_ROLE_KEY` directo en `.env.local` (Project
      Settings → API) — **no por el chat**. `SUPABASE_URL` y `SUPABASE_ANON_KEY` ya están en
      `.env.local` (no son secretas, se tomaron de `get_project_url`/`get_publishable_keys`).
- [ ] **T-0.4** El usuario decide qué correos tienen la primera cuenta del panel (Supabase
      Auth → Users, creación manual, sin registro propio — plan §3.2).

## Fase 1 — Migración de base de datos

- [x] **T-1.1** SQL mostrado en `plan.md` §6, aprobado explícitamente por el usuario
      ("sigue con la migración") el 2026-09-11.
- [x] **T-1.2** Migración `add_fulfillment_status_to_orders` aplicada con `apply_migration`
      sobre `pbjwbozxpzqqtheatxsi`.
- [x] **T-1.3** `get_advisors` (`security`) sin advertencias nuevas: mismos 13
      `rls_enabled_no_policy` + 12 `function_search_path_mutable` de antes de la migración,
      ninguno atribuible a `fulfillment_status`.
- [x] **T-1.4** Confirmado por consulta directa: las 3 filas reales de `orders` (todas
      `pagado`) quedaron con `fulfillment_status = null`.

## Fase 2 — Dependencias y configuración base

- [x] **T-2.1** Instalar `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`
      (plan §8). De paso, `npm audit` destapó una vulnerabilidad **crítica** preexistente en
      Next.js (RCE en la API de optimización de imágenes con AVIF) — se corrigió subiendo a
      `16.3.5` (antes `16.3.2`), 0 vulnerabilidades tras el cambio.
- [x] **T-2.2** `.env.example` sin valores reales, creado. `.env.local` creado con
      `SUPABASE_URL`/`SUPABASE_ANON_KEY` (no secretas, ya obtenidas por MCP) — falta que el
      usuario complete `SUPABASE_SERVICE_ROLE_KEY` (T-0.3).
- [x] **T-2.3** `next.config.ts` con `images.remotePatterns` sobre
      `pbjwbozxpzqqtheatxsi.supabase.co`.
- [x] **T-2.4** `npx tsc --noEmit` en verde.

## Fase 3 — Restructuración en route groups (plan §2)

- [x] **T-3.1** `app/(storefront)/` creado; `layout.tsx`, `template.tsx`, `page.tsx`,
      `catalogo/`, `marca/`, `nosotros/` movidos con `git mv`. Único ajuste de contenido: el
      import relativo de `globals.css` (`./` → `../`).
- [x] **T-3.2** `favicon.ico` se queda en `app/` y sigue resolviendo en `/` (confirmado por
      build). `/admin` no declaró ícono propio en este MVP — hereda el default de Next.js, no
      el de la tienda (root layouts distintos). No bloquea nada, se puede afinar después.
- [x] **T-3.3** `npm run build` en verde; `/`, `/catalogo`, `/marca`, `/nosotros` responden
      200 con contenido real vía `curl` contra `npm run dev`.

## Fase 4 — Clientes de Supabase (plan §1)

- [x] **T-4.1** `lib/supabase/admin-client.ts` con `server-only`.
- [x] **T-4.2** `lib/supabase/auth-server.ts` con `@supabase/ssr`, cookies de
      `next/headers`.
- [x] **T-4.3** Ningún archivo `"use client"` importa `admin-client.ts` (confirmado por
      `tsc`/build: `server-only` habría hecho fallar el build si ocurriera).

## Fase 5 — Autenticación (plan §3)

- [x] **T-5.1** **Corrección de nombre de archivo, no de diseño**: en Next.js 16
      `middleware.ts` está deprecado, renombrado a `proxy.ts` (export `proxy`). Se implementó
      con ese nombre; `plan.md` §3.1 ya quedó corregido.
- [x] **T-5.2** `app/admin/layout.tsx`: root layout propio, sin `MotionConfig` ni
      `SiteHeader`.
- [x] **T-5.3** `app/admin/login/page.tsx` + `signIn` (Server Action, `useActionState` para
      mostrar el error).
- [x] **T-5.4** `signOut` en el shell de `(protected)/layout.tsx`.
- [x] **T-5.5 (parcial)** Verificado por `curl`: `/admin` y `/admin/pedidos` sin sesión
      devuelven 307 a `/admin/login`; `/admin/login` responde 200. **Falta** probar el login
      real (`signInWithPassword`) y el logout — depende de T-0.4 (cuenta real en Supabase
      Auth), no de código pendiente.

## Fase 6 — Vista de pedidos (plan §4.1)

- [x] **T-6.1** `lib/data/orders.ts`: `getOrderCounts`, `getOrders`, `getOrderDetail`, todas
      filtrando por `confirmed_at`. Incluye `currentMonthPeriodBogota()` (America/Bogota,
      UTC-5 fijo).
- [x] **T-6.2** `app/admin/(protected)/pedidos/page.tsx`: los cuatro contadores del Excel más
      "entregados".
- [x] **T-6.3** `pedidos/[id]/page.tsx`: `sale_details` solo lectura cuando `submitted_at`
      existe; badge "esperando datos del cliente" cuando no, superpuesto al
      `fulfillment_status` sin reemplazarlo.
- [x] **T-6.4** `setFulfillmentStatus` en `pedidos/actions.ts`, rechaza si
      `orders.status <> 'pagado'`.
- [x] **T-6.5** Verificado contra datos reales (2026-09-11), vía script temporal desechado al
      terminar (no quedó en el repo): `getOrderCounts`/`getOrders`/`getOrderDetail` corrieron
      contra los 3 pedidos reales de `orders` (2 con `confirmed_at` en el mes en curso).
      `getOrderDetail` trajo líneas reales (`CRI-ARB-MINI-STD`) y `sale_details` completo con
      `submitted_at` no nulo. `setFulfillmentStatus` verificado por su equivalente directo
      (`PATCH .../orders`): `en_construccion` escrito y confirmado, luego revertido a `null`
      para no alterar el estado real de un pedido de producción.

## Fase 7 — CRUD de productos (plan §4.2, §7)

- [x] **T-7.1** `lib/domain/sku.ts`: `suggestProductSku`, `suggestVariantSku`,
      `resolveVariantSku` (prueba 2 letras y luego 3 ante colisión), `isProductSkuTaken`,
      `isVariantSkuTaken`. Prefijos reales confirmados: `CRI`/`JAG`/`FLO` (no `CM`/`JA`/`FL`
      de `nacer-dominio`).
- [x] **T-7.2** `productos/page.tsx`: filtro por marca (Florea incluida) y por publicado/
      despublicado vía `searchParams`; miniatura desde la primera variante activa con imagen,
      nunca desde `products.image_url`.
- [x] **T-7.3** `productos/nuevo/`: `NewProductForm.tsx` (sugerencia de SKU en vivo,
      client-side) + `createProduct` (Server Action con `zod`, valida unicidad real,
      advertencia no bloqueante si excede el techo de precio de Crisálidas).
- [x] **T-7.4** `productos/[sku]/`: `ProductEditor.tsx` — publicar/despublicar producto,
      variantes con stock editable, `reserved_qty` solo lectura, activar/despublicar
      variante, agregar variante nueva (con `resolveVariantSku`).
- [x] **T-7.5** Verificado contra datos reales (2026-09-11): `getProducts`/`getProductBySku`
      corrieron sobre las 46 filas publicadas de Crisálidas, con miniaturas resueltas desde
      Storage. Además, prueba de escritura completa con un producto/variante desechables
      (`CRI-TST-VERIFICACIONPANEL`): creado → visible por `get_product` (la RPC real del
      agente) → despublicado (`is_published=false`, `is_active=false`, nunca `DELETE`) →
      `get_product` vuelve a devolver `null`, confirmando que el filtro `is_published` del
      agente respeta el despublicado del panel. Las filas quedan despublicadas en la base
      (no borradas, por la política decidida en spec 002 §3.4.1) — es el estado de limpieza
      correcto, no un residuo.

## Fase 8 — Imágenes de variante (plan §5)

- [x] **T-8.1** `uploadVariantImage` en `productos/actions.ts`: valida tipo (PNG/JPG/WEBP) y
      tamaño (5 MB), sube con `upsert: true`, borra el objeto anterior si la extensión
      cambió, actualiza `product_variants.image_url`. Integrado en `ProductEditor.tsx` como
      input de archivo por variante.
- [x] **T-8.2** Verificado en la misma prueba de T-7.5: imagen de prueba subida a
      `variants/CRI-TST-VERIFICACIONPANEL-STD.png`, confirmada de inmediato en la respuesta
      real de `get_product` (`imagen` con la URL pública), y borrada del bucket al terminar
      — no quedó ningún objeto huérfano.

## Fase 9 — Validación manual de punta a punta

- [x] **T-9.1** Login real por el usuario con `jimmy.personal17@gmail.com` desde el navegador:
      entró y llegó a `/admin/pedidos`. Logout confirmado (vuelve a `/admin/login`).
- [x] **T-9.2** Cubierto por la verificación de T-6.5 (`fulfillment_status` escrito y
      revertido contra un pedido real).
- [x] **T-9.3** Cubierto por T-7.5/T-8.2 (creación, imagen, despublicado de punta a punta) —
      con un hallazgo real, ver bug abajo.
- [x] **T-9.4** Cubierto por T-7.5 (`get_product` antes/después del alta y del despublicado).

**Bug encontrado por el usuario y corregido (2026-09-11):** al abrir el detalle de un
producto (`/admin/productos/[sku]`), la página fallaba/tardaba ~7s con un error de cliente
("Gateway Timeout"). Causa: la variante de prueba de T-7.5/T-8.2 quedó con `image_url`
apuntando a un archivo que mi propio script de limpieza había borrado del bucket sin
actualizar la fila — `next/image` intentaba optimizar una URL rota. Se corrigió en dos
frentes:

1. **Dato:** se borró por completo la fila de prueba (`CRI-TST-VERIFICACIONPANEL` y su
   variante) — no era catálogo real gestionado por la UI, así que no aplica la política de
   "despublicar, nunca borrar" (esa política es para lo que un operador crea con el CRUD).
2. **Código:** `ProductThumbnail.tsx` (nuevo, client component) y el `<Image>` de
   `VariantCard` en `ProductEditor.tsx` ahora tienen `onError` que cae a un placeholder vacío
   en vez de dejar que una imagen rota tumbe la página — endurece el panel contra cualquier
   `image_url` que quede desincronizada del bucket en el futuro, no solo este caso.

**Confirmado corregido por el usuario el 2026-09-11**: el detalle de producto ya carga bien.

## Fase 10 — Cierre

- [x] **T-10.1** `.claude/agents/admin-panel.md` actualizado con una sección "Estado actual"
      que documenta lo construido, remite a specs 001/002, y lista explícitamente qué reglas
      propias del agente (roles vía RLS, `estado_facturacion`) todavía no se cumplen.
- [x] **T-10.2** Reporte final entregado al usuario (ver resumen de cierre de esta
      conversación).
