# Plan Técnico: MVP del Panel de Administración (002)

**Estado:** **aprobado** — las tres verificaciones de código abiertas se resolvieron contra
`pg_get_functiondef` real (§4.1, §5). Listo para `tasks.md`.
**Depende de:** `specs/002_mvp_panel_administracion/spec.md` (decisiones §2.5, §3.4) y de la
línea base de `specs/001_linea_base_esquema_supabase/spec.md`.
**No aplica nada.** La migración de §6 se muestra completa para aprobación; no se ejecuta
desde este documento. Ninguna dependencia se instala todavía — eso es `tasks.md`.

## 1. Resumen de la arquitectura

Una sola app Next.js (este repositorio), dos secciones con **layouts raíz independientes**:
la tienda pública existente (sin tocar su comportamiento) y `/admin`, nueva, sin ninguna de
las convenciones de `nacer-motion` ni el `SiteHeader` de la tienda.

Todo acceso a Supabase desde `/admin` ocurre en el servidor (Server Components, Server
Actions, `proxy.ts`). **Ningún componente cliente importa un cliente de Supabase.** Dos
clientes distintos, con dos llaves distintas, para dos propósitos distintos:

| Cliente | Llave | Uso | Dónde vive |
|---|---|---|---|
| `authClient` | `SUPABASE_ANON_KEY` | Solo `auth.getUser()` / login / logout — nunca lee ni escribe tablas de negocio | `lib/supabase/auth-server.ts`, y `proxy.ts` |
| `adminClient` | `SUPABASE_SERVICE_ROLE_KEY` | Todas las lecturas/escrituras de `orders`, `products`, `product_variants`, Storage | `lib/supabase/admin-client.ts`, marcado `server-only` |

Separar los dos evita el error más fácil de cometer con `service_role`: que el flujo de
login termine usándola "porque ya estaba importada" y la sesión de auth quede mezclada con
la llave que se salta RLS. `authClient` nunca ve una tabla de negocio; `adminClient` nunca ve
una cookie de sesión.

## 2. Por qué dos layouts raíz

`app/layout.tsx` hoy envuelve todo en `<MotionConfig>` + `<SiteHeader>`, y `app/template.tsx`
aplica una transición de página con Framer Motion a **toda** ruta, porque `template.tsx` no
tiene alcance por segmento — aplica a lo que esté debajo de `app/`. Si `/admin` cuelga del
mismo root layout, hereda el header de la tienda y la animación de entrada/salida, lo que
`.claude/agents/admin-panel.md` regla 5 prohíbe explícitamente ("las animaciones de
`nacer-motion` aplican a la tienda, no aquí").

Next.js soporta **múltiples layouts raíz** (confirmado en
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`, §"Root
Layout"): cualquier `layout.tsx` sin otro `layout.tsx` por encima es, él mismo, un layout
raíz — puede definir su propio `<html>`/`<body>`. La forma recomendada por esa misma
documentación es un route group.

**Cambio de estructura** (mecánico, se ejecuta en `tasks.md`, no ahora):

```
app/
├── (storefront)/          ← nuevo route group, no aparece en la URL
│   ├── layout.tsx         ← el actual app/layout.tsx, sin cambios de contenido
│   ├── template.tsx       ← el actual app/template.tsx, sin cambios
│   ├── page.tsx
│   ├── catalogo/
│   ├── marca/
│   └── nosotros/
├── admin/
│   ├── layout.tsx         ← NUEVO root layout, propio <html>/<body>, sin MotionConfig/SiteHeader
│   ├── login/
│   │   └── page.tsx
│   ├── pedidos/
│   │   └── page.tsx
│   └── productos/
│       ├── page.tsx
│       ├── nuevo/page.tsx
│       └── [sku]/page.tsx
├── globals.css            ← se queda donde está; ambos layouts raíz lo importan
└── favicon.ico            ← verificar en tasks.md si Next.js lo resuelve para ambos
                              root layouts o si `/admin` necesita su propio ícono;
                              es detalle de implementación, no de arquitectura
```

Navegar entre `/` y `/admin` dispara una recarga completa de página (documentado como
comportamiento esperado al cruzar layouts raíz distintos) — aceptable: son dos apps
distintas para dos audiencias distintas, no hay navegación de usuario final entre ellas.

`app/admin/layout.tsx` importa `app/globals.css` (mismo Tailwind v4, mismos tokens de color
base) pero no `MotionConfig` ni `SiteHeader`. La construcción visual del shell del panel
(nav lateral, densidad de información) es trabajo de `tasks.md` con las skills
`ui-ux-pro-max` y `dataviz` que ya exige `.claude/agents/admin-panel.md` — este plan no
diseña esa UI, solo la estructura de rutas y datos que la sostiene.

## 3. Acceso: Supabase Auth, sesión simple (decidido con el usuario)

Sin roles todavía (fuera de alcance de este MVP, spec 002 §4) — **cualquier persona con una
cuenta creada a mano en el dashboard de Supabase Auth entra y ve todo el panel.** Esto deja
el mecanismo de sesión listo para que un ciclo posterior agregue roles sin rehacer login.

### 3.1 `proxy.ts` (raíz del repo)

**Corrección sobre la primera versión de este plan:** en Next.js 16 `middleware.ts` está
deprecado y renombrado a `proxy.ts` (export `proxy`, no `middleware` — confirmado en
`node_modules/next/dist/docs/.../file-conventions/proxy.md` al implementar la Fase 5).
Mismo comportamiento, otro nombre de archivo y de función.

```ts
export const config = { matcher: ["/admin/:path*"] };
```

Usa `@supabase/ssr` (`createServerClient`) con `SUPABASE_ANON_KEY` para leer/refrescar la
sesión desde las cookies de la request. Si no hay usuario y la ruta no es `/admin/login`,
redirige a `/admin/login`. Si hay usuario y la ruta es `/admin/login`, redirige a `/admin`.

**No usa `SUPABASE_SERVICE_ROLE_KEY`.** `proxy.ts` solo verifica identidad, nunca toca
`orders` ni `products`.

### 3.2 `app/admin/login/page.tsx`

Formulario servidor (`Server Action`) con email + contraseña →
`authClient.auth.signInWithPassword`. Sin registro propio: los usuarios del panel se crean
manualmente en el dashboard de Supabase (Authentication → Users), no hay flujo de
"crear cuenta" en la app. Error genérico ante credenciales inválidas, sin distinguir "usuario
no existe" de "contraseña incorrecta" (evita enumeración).

### 3.3 Qué decide `tasks.md`, no este plan

- Quién crea las primeras cuentas del panel y con qué correos (dato operativo del cliente,
  no técnico).
- Si el logout limpia sesión en todos los dispositivos o solo el actual (`signOut({scope})`)
   — por defecto, `local`.

## 4. Estructura de datos por vista

### 4.1 Vista de pedidos (`app/admin/pedidos/page.tsx`)

Cuatro contadores, mapeados 1:1 a lo que ya existe tras la decisión de §2.5 de `spec.md`:

| Contador del Excel | Consulta |
|---|---|
| **Vendidos** | `count(*) where status = 'pagado'` |
| **En construcción** | `count(*) where fulfillment_status = 'en_construccion'` |
| **En despacho** | `count(*) where fulfillment_status = 'en_despacho'` |
| **Perdidos** | `count(*) where fulfillment_status = 'perdido'` |

`fulfillment_status = 'entregado'` no es uno de los cuatro contadores que pidió el usuario,
pero existe como valor — se muestra en la lista de pedidos y puede sumarse como un quinto
tile ("entregados") en implementación; no es una decisión de modelo de datos, es de layout
del tablero, así que queda para `tasks.md` con la skill `dataviz`.

**Periodo del tablero: `orders.confirmed_at`, no `created_at`.** Verificado leyendo el cuerpo
real de `confirm_order` (`pg_get_functiondef`, 2026-09-11): `confirmed_at` se escribe en un
único lugar, `update orders set status = 'pagado', confirmed_at = now(), ...`, exactamente en
el momento en que la venta ocurre. `created_at` es el momento en que se abre el carrito
(`status = 'abierto'`) — puede terminar `cancelado` o `vencido` sin haber sido nunca una
venta, y un pedido creado un día y pagado días después desalinearía el conteo si se filtrara
por `created_at`. Todas las consultas de §4.1 (contadores y lista) filtran el periodo por
`confirmed_at is not null and confirmed_at between :desde and :hasta` — lo que además excluye
automáticamente cualquier pedido que nunca llegó a pagarse, sin necesidad de repetir
`status = 'pagado'` en cada condición.

Server Component hace una sola consulta a `adminClient.from("orders").select(...)` con los
campos necesarios para la lista (`id`, `chat_id`, `status`, `payment_status`,
`fulfillment_status`, `grand_total`, `delivery_method`, `created_at`, `confirmed_at`) más
una segunda consulta agregada para los contadores (o los cuatro `count()` en paralelo con
`Promise.all` — a volumen de MVP, sin necesidad de una vista materializada ni RPC nueva).

**`sale_details` sí se muestra en el detalle de pedido, confirmado con el usuario — solo
lectura, y solo cuando `submitted_at is not null`.** Mientras sea `null`, el pedido está
pagado pero el cliente todavía no llenó el formulario posventa (comprador, destinatario,
tarjeta, facturación) — el panel lo señala como "esperando datos del cliente", un estado que
vale la pena distinguir visualmente de "en construcción" aunque **no** se modele como un
quinto valor de `fulfillment_status`: son ejes distintos (uno es la fase que decide el
negocio, el otro es si el cliente ya completó su parte) y mezclarlos en el mismo enum
repetiría el error que ya se evitó en spec 002 §2.3 Opción C. La UI puede mostrar el badge de
"esperando datos" superpuesto al `fulfillment_status` real, no en su lugar. La edición de
`sale_details` sigue fuera de alcance de este MVP (spec 001 §8.3) — el panel solo lee.

**Acción de servidor `setFulfillmentStatus(orderId, status)`:** valida que el pedido esté
`status = 'pagado'` antes de aceptar un cambio de `fulfillment_status` (no tiene sentido
"en despacho" sobre un pedido `abierto` o `cancelado`); si no, retorna error explícito, no
lo permite en silencio.

### 4.2 CRUD de productos (`app/admin/productos/*`)

- **Listado** (`productos/page.tsx`): tabla de `products` con filtro por `brand` (las tres,
  incluida Florea — decidido en spec 002 §3.4) y por `is_published`. Muestra
  `available_units` agregada de sus variantes (suma de `stock_qty - reserved_qty` con piso en
  cero, replicando la lógica de la función `available_units` de la base — se lee directo con
  una expresión SQL equivalente, no se llama la función porque es `SECURITY INVOKER` pensada
  para el flujo del agente y no está en el contrato de acceso del panel; ver spec 001 §6).
- **Alta** (`productos/nuevo/page.tsx`): formulario de producto (marca, tipo, nombre,
  descripción, precio base, categoría solo si `brand = 'crisalidas'`) + al menos una
  variante inicial. SKU sugerido en vivo según §7. Validación con `zod` antes de tocar la
  base.
- **Edición** (`productos/[sku]/page.tsx`): edita el producto y administra sus variantes
  (agregar variante nueva, editar `stock_qty`/`price_delta`/`attributes`/imagen, despublicar
  variante con `is_active = false`). `reserved_qty` se muestra, nunca se edita (spec 002
  §3.1).
- **Despublicar** reemplaza cualquier acción de `DELETE` (spec 002 §3.4.1): botón que pone
  `is_published = false` sobre el producto, o `is_active = false` sobre la variante.

## 5. Imágenes de variante

Acción de servidor `uploadVariantImage(variantSku: string, file: File)`, usando
`adminClient.storage.from("catalogo_nacergroup")`:

1. Valida tipo (`image/png`, `image/jpeg`, `image/webp`) y tamaño (propuesta: 5 MB máx., a
   confirmar en `tasks.md` si el cliente sube fotos de cámara sin comprimir).
2. Sube a `variants/{variantSku}.{ext}` con `upsert: true`.
3. Si la variante ya tenía `image_url` con una extensión distinta a la nueva (ej. reemplazar
   un `.png` por un `.jpg`), **borra el objeto anterior** antes de subir el nuevo — si no, el
   archivo viejo queda huérfano en el bucket y sirviendo una URL que nadie referencia.
4. Actualiza **únicamente** `product_variants.image_url` con la URL pública resultante.

**`products.image_url` no se edita ni se muestra en el CRUD — confirmado leyendo el código
real de ambas funciones de catálogo del agente, no solo `get_product`.**
`pg_get_functiondef` de `get_product` muestra que su campo `imagen` sale de `v.image_url`
(variante); `products.image_url` no aparece en ningún lugar del cuerpo de la función.
`search_products`, la otra vía por la que el agente ve el catálogo, **no expone ninguna
imagen en absoluto** (ni de producto ni de variante) en su `jsonb_build_object` de salida.
Es decir: `products.image_url` no lo lee ninguna de las dos rutas por las que el agente
llega al catálogo — está genuinamente muerta para WhatsApp. Si el CRUD la editara igual,
crearía una segunda fuente de verdad de imagen que nadie del lado del agente respeta y que
un operador del panel podría confundir con la real. El listado de productos del panel usa la
imagen de la **primera variante activa** como miniatura, no `products.image_url`.

`next.config.ts` está vacío hoy — necesita `images.remotePatterns` apuntando a
`pbjwbozxpzqqtheatxsi.supabase.co` para que `next/image` sirva las fotos del bucket dentro
del panel (cambio de una línea, se aplica en `tasks.md`).

## 6. Migración propuesta — para aprobación, no aplicada

```sql
-- specs/002_mvp_panel_administracion — fulfillment_status en orders
-- Decisión: spec.md §2.5, Opción A. Sin tabla de historial en este MVP.

alter table public.orders
  add column fulfillment_status text
  constraint orders_fulfillment_status_check
  check (fulfillment_status is null or fulfillment_status in (
    'en_construccion',
    'en_despacho',
    'entregado',
    'perdido'
  ));

comment on column public.orders.fulfillment_status is
  'Fase operativa de cumplimiento tras el pago (reemplaza el Excel externo del cliente). '
  'NULL mientras el pedido no está pagado. La escribe únicamente el panel de administración '
  '(specs/002_mvp_panel_administracion) — ninguna RPC del agente de WhatsApp la toca.';
```

Sin `default`: una fila nueva nace `NULL` y el panel exige elegir un valor solo cuando el
pedido pasa a `pagado` (regla de la acción de servidor en §4.1, no de la base — dejar la
validación de negocio en la app y no en un `CHECK` que dependa de `status`, porque `status` y
`fulfillment_status` son columnas independientes y un `CHECK` cruzado entre ellas sería
frágil ante los `UPDATE` que hace `confirm_order` sin saber que `fulfillment_status` existe).

**No se toca ninguna función RPC existente.** `confirm_order`, `cancel_order`,
`expire_reservations` no necesitan saber de `fulfillment_status` — es una columna que solo
escribe el panel, después de que esas funciones ya dejaron el pedido en `pagado`.

Esta migración se aplica con `apply_migration` (MCP de Supabase) **solo cuando el usuario la
apruebe explícitamente**, igual que cualquier otro cambio a este proyecto compartido.

## 7. Convención de generación de SKU (spec 002 §3.4.2)

Deducida de los SKU reales (spec 001, consulta directa a `products.sku`/
`product_variants.sku`), **no de ningún documento** — no existe una regla escrita en ningún
repositorio, así que el panel no puede fingir reproducir con exactitud el criterio humano
que generó los SKU ya cargados (ej. `CRI-ARR-COMPFIEL` para "Compañero Fiel" no es un slug
mecánico). En vez de eso, el panel **sugiere y deja editar antes de guardar**, con un guardia
de unicidad real — que es exactamente lo que pidió el usuario ("automático pero evitando que
se dupliquen").

**SKU de producto:** `{PREFIJO_MARCA}-{TIPO}-{CODIGO_NOMBRE}`

- `PREFIJO_MARCA`: fijo por marca, confirmado por los datos reales — `crisalidas → CRI`,
  `jagua → JAG`, `florea → FLO`. (Corrige el prefijo `FL` que se había escrito por error en
  una versión anterior de `spec.md` §3.3 antes de consultar la base — ya corregido ahí.)
- `TIPO`: código de 3 letras de la línea de producto (`ARR`, `TER`, `ARB`, `PUP`, `DET`,
  `KIT`, `JAR`, `COL`, `HOT`, `CHO`, `PIN`, `STK`, `TAR`, ...). **No se puede derivar de
  `products.category`** — esa columna es la franja comercial de precio de Crisálidas
  (`Pequeños Milagros`, ...), un eje distinto del tipo físico de producto, y además es nula
  en Jagua y Florea. El panel ofrece un campo de texto de 3 letras con autocompletado de los
  códigos ya usados en esa marca (consulta `distinct` sobre los SKU existentes, partiendo el
  segundo segmento), pero permite escribir uno nuevo si el producto es de una línea que no
  existía.
- `CODIGO_NOMBRE`: sugerencia automática = `name` sin tildes/espacios/puntuación, mayúsculas,
  recortado a un máximo razonable (propuesta: 12 caracteres, a ajustar en `tasks.md` si sale
  demasiado largo o corto en casos reales). Editable antes de guardar.
- **Guardia de unicidad:** antes de insertar, `adminClient` consulta si el SKU propuesto ya
  existe en `products.sku`. Si sí, se muestra el conflicto en el formulario — no se
  autoincrementa en silencio ni se guarda un duplicado (spec 002 §3.4.2).

**SKU de variante:** `{SKU_PRODUCTO}-{CODIGO_ATRIBUTO}`

- `CODIGO_ATRIBUTO`: primeras 2 letras (mayúsculas, sin tildes) del valor del atributo que
  distingue la variante (`color`, `presentacion`, u otro `key` libre de `attributes`) —
  patrón observado en los datos reales (`blanco→BL`, `oliva→OL`, `azul→AZ`, `rosado→RO`).
  Si la variante no tiene atributo distintivo (producto de variante única), el código por
  defecto es `STD` — también observado en los datos reales, no inventado.
- Si el código de 2 letras ya existe entre las variantes de ese mismo producto, el panel
  prueba con 3 letras antes de mostrar el conflicto al usuario.
- Mismo guardia de unicidad que el SKU de producto, contra `product_variants.sku`.

## 8. Dependencias nuevas

Ninguna instalada todavía (`tasks.md` lo hace). Se necesitan:

| Paquete | Para |
|---|---|
| `@supabase/supabase-js` | Cliente base, usado por ambos clientes de `lib/supabase/` |
| `@supabase/ssr` | Manejo de cookies de sesión en `proxy.ts` y el login (reemplaza el antiguo `auth-helpers-nextjs`, es el paquete vigente para App Router) |
| `zod` | Validación de formularios de producto/variante antes de tocar la base |
| `server-only` | Import guard en `lib/supabase/admin-client.ts` — falla el build si algún día un componente cliente lo importa por error |

No se agrega Framer Motion al panel (ya está en el proyecto para la tienda, pero
`admin-panel.md` regla 5 excluye su uso aquí — el panel no lo importa).

## 9. Variables de entorno

Todas server-only. **Ninguna con prefijo `NEXT_PUBLIC_`** — ni el login ni las consultas de
datos necesitan ejecutarse en el navegador, así que no hace falta exponer ninguna llave al
cliente, ni siquiera la `anon`.

```
SUPABASE_URL=https://pbjwbozxpzqqtheatxsi.supabase.co
SUPABASE_ANON_KEY=<la publishable/anon key — no es secreta, pero tampoco hace falta exponerla>
SUPABASE_SERVICE_ROLE_KEY=<el usuario la copia del dashboard de Supabase — nunca la entrega una tool de MCP>
```

Van en `.env.local` (ya cubierto por `.gitignore`, patrón `.env*`). `tasks.md` documenta
también las variables de entorno equivalentes para Railway (el destino de despliegue de
`CLAUDE.md`, no Vercel).

## 10. Riesgos y pendientes que este plan no resuelve

- **Sin ambiente de staging.** El panel escribe contra la misma base que usa el agente de
  WhatsApp en producción desde el primer día (spec 001 §4.2/§4.5). Un error en una acción de
  servidor es inmediato y visible para el agente. Aceptado como riesgo del MVP, no mitigado
  aquí.
- **Sin historial de `fulfillment_status`.** La Opción A elegida no guarda quién cambió la
  fase ni cuándo, más allá de `orders.updated_at` (que se pisa con cualquier otro cambio del
  pedido, no es un log dedicado). Si el negocio pide trazabilidad de cumplimiento, es
  migración futura hacia algo parecido a la Opción B de `spec.md`.
- **`estado_facturacion` sigue sin existir** (spec 002 §2.5) — el panel de este MVP no lo
  muestra ni lo pide, aunque `CLAUDE.md` lo exija "desde el MVP". Deuda conocida, no de este
  plan.
- **Autenticación sin roles.** Cualquier cuenta creada en Supabase Auth ve todo el panel —
  `.claude/agents/admin-panel.md` regla 1 ("el control de acceso vive en RLS, no en el
  frontend") no se cumple todavía para roles, solo para identidad. Documentado como decisión
  explícita del alcance (spec 002 §4), no como omisión.

Las tres verificaciones de código que quedaban pendientes (columna de imagen real, `created_at`
vs. `confirmed_at`, alcance de `sale_details`) se resolvieron contra `pg_get_functiondef` de
`get_product`, `search_products` y `confirm_order` — ver §4.1 y §5. Ninguna quedó abierta.

## 11. Próximo paso

`tasks.md`: desglose ejecutable de lo anterior — instalación de dependencias, la migración de
§6 (mostrada para aprobación en el momento de ejecutarse, no antes), restructuración de
`app/` en route groups, y las rutas/acciones de servidor de §3–§5.
