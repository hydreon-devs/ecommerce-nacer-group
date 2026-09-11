# Especificación de Diagnóstico: Línea Base del Esquema de Supabase (001)

**Estado:** borrador — pendiente de aprobación
**Fecha:** 2026-09-11
**Tipo:** diagnóstico (no funcional). No propone qué construir; documenta qué existe.
**Depende de:** ninguna spec previa en este repositorio — es la primera.
**Referencia externa (solo lectura):** `docs/rpc-contract.md` y `docs/constitution.md` del
repositorio `asistente-nacer-group`, que gobierna el agente de WhatsApp sobre el mismo
proyecto Supabase. Este repositorio no modifica ese repositorio ni sus flujos de n8n.

## 1. Contexto y objetivo

El Panel de Administración de Nacer Group es una app nueva en *este* repositorio, cliente
distinto del agente de WhatsApp, que comparte el mismo proyecto Supabase: **`DB-nacer-group`
(`pbjwbozxpzqqtheatxsi`)**, `us-east-1`, Postgres 17.6, activo desde 2026-08-26.

Antes de diseñar el panel hace falta saber, con la verdad de la base y no con lo que este
repositorio *documenta que tendría*, qué tablas y columnas existen, cómo está cerrado el
acceso, y qué falta para lo que el panel necesita mostrar. Este documento es solo eso.

**No implementa nada.** Es el resultado del Paso 1 (estado de este repo) y el Paso 2
(línea base de Supabase) acordados con el usuario antes de escribir spec 002 (alcance del
MVP del panel).

## 2. Método

Introspección directa vía MCP de Supabase (`list_tables` con `verbose=true`, `list_migrations`,
`get_advisors`, consultas a `storage.buckets`/`storage.objects`) contra el proyecto
`pbjwbozxpzqqtheatxsi`, el 2026-09-11. **No se usó memoria ni la skill `nacer-dominio` de
este repositorio como fuente de verdad** — ver §8, esa skill describe un esquema que nunca
se implementó así.

Como referencia cruzada de intención (no de verdad de esquema) se leyó `docs/rpc-contract.md`
de `asistente-nacer-group`, que declara estar "actualizado el 2026-09-03". La introspección
en vivo encontró migraciones posteriores a esa fecha (hasta el 2026-09-11, la más reciente
el mismo día de este documento) que ese archivo todavía no refleja — notablemente la tabla
`sale_details` (§4.8). Ante cualquier discrepancia, manda la base, no ese documento.

## 3. Estado de este repositorio (Paso 1)

| | |
|---|---|
| Framework | Next.js 16.3.2 (App Router), React 19.2.8, TypeScript 5 |
| Gestor de paquetes | npm (`package-lock.json`) |
| Estilos | Tailwind CSS v4 |
| Animación | Framer Motion 12 (convención `nacer-motion`; **no aplica al panel**, ver `.claude/agents/admin-panel.md`) |
| Auth | **No existe.** Sin Supabase Auth, sin NextAuth, sin `middleware.ts`, sin sesión de ningún tipo |
| Conexión a Supabase | **No existe.** `@supabase/supabase-js` no está en `package.json`; no hay cliente en `lib/`; no hay variables `SUPABASE_*` en ningún `.env*` (no hay `.env*` versionado ni local) |
| Datos | 100% mock. `lib/data/products.ts` es un array estático tipado por `lib/domain/types.ts` (`Producto`), documentado explícitamente en el propio archivo como "no es el catálogo real" |
| Estructura de rutas | `app/{catalogo,marca,nosotros}` — todas público-orientadas (storefront de Crisálidas y Mariposas). Nada bajo `app/admin` ni equivalente todavía |
| Hábito de spec-driven development | **No existía.** No había carpeta `specs/`. Este documento la crea, siguiendo la convención ya probada en `asistente-nacer-group` (`specs/NNN_nombre/{spec,plan,tasks}.md`) |
| Agente ya definido | `.claude/agents/admin-panel.md` ya describe el alcance esperado del panel (tres tableros + vista consolidada) pero no hay código construido a partir de él |

**Discrepancia encontrada, no corregida en este documento:** la skill `.claude/skills/nacer-dominio/SKILL.md`
de este repositorio documenta un esquema hipotético en español (`productos`, `pedidos`,
`pedido_items`, `clientes`, `reservas_stock`, etc.) que **no es el esquema real**. El esquema
que de verdad corre en `pbjwbozxpzqqtheatxsi` está en inglés (`products`, `orders`,
`reservations`, ...) y lo construyó el otro repositorio. `nacer-dominio` describe principios
de negocio que siguen siendo válidos (disponibilidad ≠ stock, tres dimensiones de estado,
ocasiones) pero su §7 (esquema de tablas) es aspiracional, nunca se implementó tal cual.
Vale la pena que el equipo lo sepa; no lo toco porque no es parte del encargo de esta spec.

## 4. Esquema real — tablas relevantes al panel

Fuente: `list_tables`, verbose, 2026-09-11. Todas en `public`, todas con **RLS habilitado y
sin ninguna política** (confirmado por `get_advisors` tipo `security`: 13 tablas con el
lint `rls_enabled_no_policy`). Ver §6.

### 4.1 `products` — 64 filas

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `sku` | text, único | |
| `name` | text | |
| `brand` | text | `CHECK IN ('crisalidas','florea','jagua')` |
| `description` | text, nullable | |
| `image_url` | text, nullable | |
| `base_price` | numeric | `CHECK >= 0` |
| `is_published` | boolean | default `true` |
| `category` | text, nullable | franja comercial de Crisálidas (techo de precio por franja); `null` en Florea y Jagua |
| `simbolismo` | text, nullable | texto libre, usado por el agente al recomendar |
| `created_at` | timestamptz | |

Sin columna de `activo` separada de `is_published` ni de `vende_en_sitio` a nivel de marca —
la marca vive como texto libre con `CHECK`, no como tabla `marcas` con su propio booleano.
Florea **sí tiene productos cargados** en esta base (a diferencia de lo que documenta el
storefront de este repo, que la trata como enlace externo sin catálogo). Es un hueco de
alineación entre "lo que vende el asistente" y "lo que vende el sitio web" — anotado, no
resuelto aquí.

### 4.2 `product_variants` — 83 filas

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `product_id` | uuid FK → `products.id` | |
| `sku` | text, único | el SKU de variante, el que usa el bucket de imágenes (§5) |
| `attributes` | jsonb | default `{}` |
| `price_delta` | numeric | default `0`, se suma a `base_price` |
| `image_url` | text, nullable | |
| `stock_qty` | integer | `CHECK >= 0` |
| `reserved_qty` | integer | `CHECK >= 0` |
| `is_active` | boolean | default `true` |

**El stock vendible nunca es `stock_qty` directo.** Es
`greatest(stock_qty - reserved_qty, 0)`, expuesto por la función `available_units`. Cualquier
consulta del panel que muestre "existencias" debe replicar esa resta, no leer `stock_qty` a
secas.

### 4.3 `product_options` — 2 filas

`id`, `product_id` FK, `name`, `price` (`CHECK >= 0`), `max_qty` (`CHECK > 0`, default `1`),
`is_active`. Añadidos con precio propio (ej. tarjeta personalizada), no variantes.

### 4.4 `reservations` — 1 fila

`id`, `variant_id` FK, `qty` (`CHECK > 0`), `options` jsonb, `unit_price`, `total_price`,
`chat_id` (nullable), `status` (`CHECK IN ('activa','consumida','liberada','expirada')`,
default `'activa'`), `expires_at`, `created_at`, `order_id` (nullable, FK → `orders.id`).

Máquina de estados (confirmada, no es el hueco de este documento):

```
activa ──confirm_order/confirm_reservation──> consumida
   ├────cancel_order/release_reservation────> liberada
   └────expire_reservations─────────────────> expirada
```

### 4.5 `orders` — 1 fila

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `chat_id` | text | conversación de origen |
| `status` | text | `CHECK IN ('abierto','pagado','vencido','cancelado')`, default `'abierto'` |
| `total_price` | numeric | suma de líneas, **sin envío** |
| `payment_source` | text, nullable | `CHECK IN ('mercadopago','transferencia','panel')` |
| `payment_ref` | text, nullable, único | llave de idempotencia del webhook |
| `payment_status` | text, nullable | `CHECK IN ('pendiente','aprobado','rechazado','en_proceso','reembolsado')` |
| `paid_amount` | numeric, nullable | |
| `preference_id` / `init_point` | text, nullable | Mercado Pago |
| `payment_expires_at` | timestamptz, nullable | |
| `delivery_method` | text, nullable | `CHECK IN ('domicilio','tienda')` |
| `delivery_address`, `delivery_distance_km`, `delivery_fee` | | congelados al cotizar |
| `grand_total` | numeric, **generada** | `total_price + delivery_fee` |
| `confirmed_at` | timestamptz, nullable | |
| `occasion`, `desired_delivery_date` | | copia congelada de `conversations` al crear el pedido (spec 015, ver §4.8) |
| `created_at`, `updated_at` | | |

**Hallazgo no trivial:** `orders` ya tiene **dos campos de estado de pago**, no uno:
`status` (grueso, gobierna el ciclo de vida del pedido: `abierto → pagado/cancelado/vencido`)
y `payment_status` (fino, intermedio: `pendiente/en_proceso/rechazado/aprobado/reembolsado`,
escrito solo por `set_payment_status` mientras el pedido sigue `abierto`). No hay que
inventar una columna de estado de pago fino — ya existe. Lo que no existe es nada de
cumplimiento/producción ni de facturación (§4.6).

### 4.6 El hueco: no existe estado de cumplimiento ni de facturación

Confirmado por columnas: `orders` no tiene ningún campo de fase operativa más allá de
`status` (`abierto/pagado/vencido/cancelado`) y `payment_status`. **No existe** en ninguna
tabla del proyecto una columna equivalente a "en construcción", "en despacho", "perdido", ni
a `estado_facturacion`.

Esto es relevante para dos cosas a la vez, y hay que separarlas:

1. **Lo que pidió el usuario explícitamente:** el Excel del cliente rastrea una "fase
   general" del pedido (construcción → despacho → entregado/perdido) que hoy vive fuera de
   Supabase. Es una decisión de modelo de datos, no de UI. **No la resuelvo aquí** — se
   presentan opciones en spec 002 (§1 del encargo del usuario): ¿columna nueva en `orders`
   (ej. `fulfillment_status`)? ¿tabla aparte `order_fulfillment` con su propia máquina de
   estados e historial? Cualquiera de las dos convive con `status`/`payment_status` sin
   tocarlos — ninguna opción implica colapsar dimensiones, lo que violaría el principio de
   este repositorio (`CLAUDE.md` invariante 3) y el artículo 10 de la constitución del otro
   repositorio (separación de responsabilidades).

2. **Lo que encontré y que el usuario no pidió que buscara, pero es del mismo tipo de hueco:**
   `CLAUDE.md` de este repositorio exige `estado_facturacion` "desde el MVP aunque la
   emisión sea manual" (invariante 3, y lo repite `.claude/agents/admin-panel.md` regla 3).
   **Esa columna no existe en la base real.** Ni en `orders` ni en tabla aparte. Lo marco
   como hallazgo para que se decida en spec 002 junto con el hueco de cumplimiento — probablemente
   con la misma forma de solución (columna vs. tabla aparte), y potencialmente en la misma
   tabla de fulfillment si el negocio los trata como una sola fase administrativa. No lo
   doy por asumido: son dos preguntas, no una.

### 4.7 `conversations` — 1 fila

`chat_id` PK (text), `first_name`, `active_brand` (nullable, `CHECK`), `lead_score`,
`lead_state`, `agent_paused_until`, `buffer_key`, `lead_notified_at`,
`last_escalation_reason`, `last_escalation_at`, `occasion`, `desired_delivery_date`,
`created_at`, `updated_at`.

No hay tabla `clientes` separada con teléfono/documento/dirección de forma estructurada —
lo más cercano es `conversations.first_name` (un nombre, no un cliente completo) y, ya del
lado de un pedido pagado, `sale_details` (§4.8).

### 4.8 `sale_details` — 1 fila. Tabla nueva, no documentada aún en el otro repositorio

Migraciones del **2026-09-11** (`add_discovery_context_to_conversations_and_orders`,
`create_sale_details_table`, `add_sale_form_rpcs`, `reserve_variant_copia_contexto_de_descubrimiento`,
`create_sale_form_token_devuelve_contexto`) — el mismo día de este documento. El
`docs/rpc-contract.md` que leí como referencia (fechado 2026-09-03) no la menciona; tampoco
hay carpeta `specs/015_.../` todavía en el checkout local de `asistente-nacer-group` (existe
`specs/014_ficha_de_producto_con_simbolismo/` como la última committeada). Es trabajo en
curso del otro equipo, documentado aquí solo por lo que la propia base declara en comentarios
de columna — no inventé el propósito, lo tomé de `COMMENT ON COLUMN`.

Según esos comentarios: una fila por pedido, nace vacía junto con el enlace de pago y se
completa cuando el cliente llena un formulario público protegido por `form_token` (uuid
opaco) después de pagar.

| Columna | Notas |
|---|---|
| `order_id` | único, FK → `orders.id` |
| `form_token`, `token_expires_at` | protección del enlace público |
| `submitted_at` | nulo = "pagado y sin datos todavía" |
| `reminded_at` | un único recordatorio permitido |
| `buyer_name`, `buyer_email` | **datos del comprador** |
| `delivery_address_exact`, `delivery_unit`, `neighborhood`, `city`, `building_name` | dirección detallada |
| `recipient_name`, `recipient_phone`, `may_call_recipient` | **datos de quien recibe** |
| `card_from`, `card_to`, `card_message` | tarjeta del regalo |
| `special_notes` | |
| `wants_invoice`, `invoice_legal_name`, `invoice_tax_id`, `invoice_email` | **facturación** |
| `referral_source` | |

**Esto responde en gran parte a "qué columnas ya existen para lo que el Excel rastrea"**:
comprador, destinatario y datos de facturación ya tienen hogar estructurado — pero
condicionado a que el pedido esté pagado y el formulario ya se haya enviado (`submitted_at
IS NOT NULL`). Un pedido `abierto` (aún no pagado) no tiene fila en `sale_details`, o la tiene
vacía. El panel de ventas y pedidos tiene que contemplar ese estado intermedio ("pagado, sin
datos de entrega todavía") como algo visible, no como un `null` silencioso.

Lo que el Excel rastrea y **no** tiene columna en ningún lado todavía: la fase de
cumplimiento/producción en sí (§4.6) y cualquier historial de quién cambió esa fase y cuándo.

### 4.9 Tablas de apoyo (no listadas explícitamente por el usuario, documentadas por completitud)

- `messages` — 20 filas. Historial de conversación, `role ∈ (user, assistant, human_agent, system)`, dedupe por `wa_message_id`.
- `message_batches` — 10 filas. Orquestación de lotes del agente (`status ∈ processing/completed/failed`). Irrelevante para el panel salvo como fuente de "embudo de conversación a venta" si se decide usarlo.
- `payment_proofs` — 0 filas. Comprobantes de transferencia con OCR (`extracted` jsonb).
- `payment_info` — 1 fila, `id = 1` fija. Datos bancarios para mostrarle al cliente.
- `app_secrets` — 5 filas. `mp_webhook_secret`, URLs de notificación/retorno, moneda. El panel no debería necesitar leerla salvo config de checkout, si el panel algún día cobra.
- `delivery_tariffs` — 7 filas. Tabla de tarifas de domicilio por tramo de distancia.

## 5. Almacenamiento de imágenes

Bucket **`catalogo_nacergroup`**, público, confirmado por consulta directa a
`storage.buckets`. Estructura real de objetos (`storage.objects`, muestra):

```
catalogo/catalogo.pdf
variants/CRI-ARR-INDIGO-STD.png
variants/CRI-ARR-AURA-OL.jpg
variants/CRI-ARB-HOJAS-STD.png
...
```

Confirma la convención `catalogo_nacergroup/variants/{SKU_DE_VARIANTE}.{ext}` que describe
el encargo del usuario — el SKU es el de `product_variants.sku`, no el de `products.sku`. La
extensión varía (`.png`, `.jpg`) por archivo, no es fija. El CRUD de productos del panel
(spec 002) debe subir a esa misma ruta con ese mismo SKU para que la ficha que ve el agente
de WhatsApp (`get_product`, vía `variantes[].imagen`) quede sincronizada sin pasos extra.

## 6. Acceso y seguridad

- **13 tablas de `public` tienen RLS habilitado y cero políticas** (`get_advisors`, tipo
  `security`, lint `rls_enabled_no_policy`, confirmado en las 13: `products`,
  `product_variants`, `product_options`, `reservations`, `orders`, `conversations`,
  `messages`, `message_batches`, `payment_proofs`, `payment_info`, `app_secrets`,
  `delivery_tariffs`, `sale_details`). Sin política, RLS deniega todo a `anon` y
  `authenticated`. Solo `service_role` — que **se salta RLS por diseño de Postgres/Supabase**,
  no porque tenga una política a su favor — puede leer o escribir directamente.
- El agente de WhatsApp nunca toca las tablas directo: pasa por 23 funciones RPC en
  `public`, casi todas `SECURITY INVOKER` con `search_path` mutable (advisor `WARN`,
  preexistente, no de esta spec) o vacío según la antigüedad de la función. Esas RPC están
  diseñadas para el vocabulario y las invariantes de una conversación de WhatsApp (idempotencia
  por `wa_message_id`, redacción de `mensaje` pensada para el LLM, etc.) — no son la interfaz
  natural de un panel administrativo humano.
- **El panel de administración es un cliente distinto** y debe usar la **service-role key**
  desde código de servidor (Route Handlers / Server Actions de Next.js), nunca expuesta al
  navegador. Hoy no existe ninguna variable de entorno para esto en el repo — habrá que crear
  `.env.local` (ya cubierto por `.gitignore`, línea `.env*`) con al menos
  `SUPABASE_URL=https://pbjwbozxpzqqtheatxsi.supabase.co` y una `SUPABASE_SERVICE_ROLE_KEY`
  que el usuario debe copiar del dashboard de Supabase — **ninguna herramienta MCP la expone**
  por diseño (`get_publishable_keys` solo entrega `anon`/`publishable`, ambas ya cerradas por
  RLS sin políticas y por tanto inútiles para escritura del panel).
- **No reutilizar los RPC del agente por defecto.** Encajan si el panel necesita exactamente
  la misma operación con las mismas invariantes (ej. `confirm_order` para marcar un pago
  manual desde el panel, que ya contempla `p_source = 'panel'` — literalmente previsto para
  esto). No encajan para lectura general de listados/tableros, done el panel debe consultar
  las tablas directo con `service_role` y construir sus propias vistas/consultas, sin pasar
  por funciones pensadas para el turno de una conversación.
- **RLS por rol dentro del panel** (`admin`, `ventas`, `inventario`, `produccion` — ya
  previsto en `.claude/agents/admin-panel.md`) es una decisión de spec 002/plan, no de este
  documento: hoy no hay ninguna tabla de roles ni de usuarios del panel en Supabase. Como el
  panel entero opera con `service_role` desde el servidor, ese control de acceso por rol
  tendrá que vivir en autenticación + autorización de la propia app (o en una capa adicional
  de RLS si el panel en algún momento usa `authenticated` en vez de `service_role` para
  ciertas lecturas) — a decidir en plan.md, no aquí.

## 7. Fuera del alcance de este documento

- Diseño de tablas o columnas nuevas (fulfillment, facturación, roles de panel) — eso es
  spec 002 y su plan.md, con opciones para aprobación del usuario, no decisión unilateral.
- Cualquier migración a Supabase. No se aplicó ninguna en este paso.
- Cambios al repositorio `asistente-nacer-group`, sus specs, RPC o flujos de n8n.
- Resolver la discrepancia entre `nacer-dominio` (esquema aspiracional) y el esquema real —
  anotada en §3, no corregida.

## 8. Preguntas abiertas para spec 002

1. Estado de cumplimiento: ¿columna `fulfillment_status` en `orders`, o tabla aparte con
   historial? (encargo explícito del usuario, §4.6.1)
2. Estado de facturación: ¿mismo mecanismo que cumplimiento, o campo independiente? Hoy no
   existe ninguno de los dos. (hallazgo de esta spec, §4.6.2 — el usuario debe decidir si
   entra en el MVP o queda fuera de alcance explícito, ya que `CLAUDE.md` lo exige "desde el
   MVP" pero el usuario no lo mencionó en el encargo de spec 002)
3. ¿El panel muestra/edita `sale_details` (datos de comprador, destinatario, factura) como
   parte de la vista de pedidos del MVP, o queda para un ciclo posterior? La tabla ya existe
   y cubre buena parte de lo que el Excel rastrea, pero es trabajo en curso de otro equipo
   (spec 015 sin documentar todavía) — vale la pena confirmar que no cambiará de forma antes
   de construir UI sobre ella.
4. Control de acceso por rol del panel (`admin`/`ventas`/`inventario`/`produccion`): ¿auth
   propia de la app, o Supabase Auth con RLS real usando `authenticated` en vez de
   `service_role` para las lecturas que si pueden pasar por RLS? Afecta directamente el
   principio de este repo de que el control de acceso "vive en RLS, no en el frontend".
