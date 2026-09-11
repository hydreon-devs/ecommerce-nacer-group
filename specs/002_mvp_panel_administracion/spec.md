# Especificación: MVP del Panel de Administración (002)

**Estado:** **aprobado** — decisiones de modelo de datos tomadas por el usuario el 2026-09-11 (§2.5, §3.4). Lista para `plan.md`.
**Fecha:** 2026-09-11
**Depende de:** `specs/001_linea_base_esquema_supabase/spec.md`
**No implementa nada.** Este documento fija alcance y las decisiones de modelo de datos
donde había un hueco. Ninguna migración se aplicó todavía — eso ocurre en `plan.md`/`tasks.md`
y sigue requiriendo mostrar el SQL exacto para aprobación antes de correrlo (regla del
encargo).

## 1. Contexto y objetivo

Primer entregable del panel de administración de Nacer Group: una app Next.js dentro de
*este* repositorio, servida con `service_role` desde el servidor, que reemplaza dos cosas
que hoy pasan por fuera de cualquier sistema: mirar el estado del negocio "a ojo" en
Supabase/logs, y mantener el catálogo (`products`/`product_variants`) editable solo por
migración SQL manual.

Alcance de este MVP, dos piezas:

1. **Vista de pedidos** con conteo por fase (vendidos, perdidos, en despacho, en
   construcción) — bloqueada por una decisión de modelo de datos (§2).
2. **CRUD de `products` y `product_variants`**, compatible con lo que el agente de WhatsApp
   ya lee (§3).

Todo lo demás que menciona `.claude/agents/admin-panel.md` (tablero de producción con
agenda, vista consolidada exportable, autenticación por rol, notificaciones) queda **fuera
de este MVP** — ver §5.

## 2. Vista de pedidos: conteo por fase

### 2.1 Qué debe mostrar

Cuatro números (mínimo) sobre el periodo seleccionado: **vendidos**, **perdidos**, **en
despacho**, **en construcción** — el vocabulario que hoy usa el Excel del cliente. Debajo,
lista de pedidos individuales con su fase.

### 2.2 Por qué está bloqueado

`specs/001.../spec.md` §4.6 confirmó, contra la base real, que `orders.status` **solo**
tiene `abierto | pagado | vencido | cancelado`. No existe ninguna columna de fase operativa.
"Vendidos" se puede leer hoy mismo (`status = 'pagado'`, o `payment_status = 'aprobado'` —
ver la distinción entre ambos campos en 001 §4.5, hay que elegir cuál es la fuente para
"vendido"). "Perdidos" tampoco es obvio: ¿`vencido` + `cancelado` juntos, o son fases
distintas para el negocio? Pero **"en despacho" y "en construcción" no existen en ningún
lado de Supabase hoy** — son la fase que el Excel del cliente rastrea aparte.

No lo resuelvo yo. Van tres opciones concretas.

### 2.3 Opciones de modelo de datos

**Opción A — Columna `fulfillment_status` en `orders`**

```sql
alter table orders add column fulfillment_status text
  check (fulfillment_status in ('en_construccion','en_despacho','entregado','perdido'))
  default null; -- null mientras el pedido no está pagado: no aplica todavía
```

- Ventajas: una consulta, sin `join`; coherente con cómo ya conviven `status` y
  `payment_status` en la misma tabla (001 §4.5) — es el mismo patrón, una dimensión más.
  Simple de leer y de escribir desde el panel.
- Desventajas: sin historial. No queda registro de cuándo pasó de `en_construccion` a
  `en_despacho` ni quién lo cambió — si el negocio pide eso luego (ej. "¿cuánto tardamos en
  producir en promedio?"), hay que migrar a una tabla aparte de todos modos.

**Opción B — Tabla aparte `order_fulfillment`**

```sql
create table order_fulfillment (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  status text not null check (status in ('en_construccion','en_despacho','entregado','perdido')),
  changed_by text, -- quién lo cambió, si hay auth de panel (ver §5)
  changed_at timestamptz not null default now()
);
```

Una fila por **cambio** de fase (historial completo), o una fila por **pedido** con
`updated_at` (sin historial, solo estado actual) — son dos variantes dentro de esta misma
opción, a decidir también.

- Ventajas: historial gratis si se modela como log de cambios. Separa limpio "estado del
  negocio" de "estado del pago", que son ejes distintos y pueden evolucionar con reglas
  distintas (ej. agregar una fase nueva no toca `orders`).
- Desventajas: una tabla más, un `join` más en cada consulta del tablero de ventas. Si se
  modela como log, "la fase actual" es "la última fila" — hay que decidir si eso se resuelve
  con una vista o con una columna denormalizada de conveniencia.

**Opción C — Extender el enum de `orders.status` en vez de agregar dimensión nueva**

Ej. `abierto | pagado | en_construccion | en_despacho | entregado | vencido | cancelado |
perdido`.

- **Desventaja de fondo, por eso la incluyo pero no la recomendaría sin que el usuario lo
  vea explícitamente:** colapsa pago y cumplimiento en un solo campo, que es exactamente lo
  que la invariante 3 de `CLAUDE.md` de este repositorio prohíbe ("tres dimensiones de
  estado independientes... nunca colapsarlas en un solo campo") y lo que el artículo 10 de
  la constitución del otro repositorio también evita (separación de responsabilidades). Un
  pedido pagado y perdido en tránsito necesitaría dos hechos simultáneos (`pagado` +
  `perdido`) que un solo enum no puede representar sin inventar un valor combinado. La dejo
  como opción porque es la más simple de implementar, no porque la recomiende.

### 2.4 Pregunta adicional que depende de la respuesta anterior

`specs/001.../spec.md` §8.2 encontró que tampoco existe `estado_facturacion` en ningún lado,
pese a que `CLAUDE.md` de este repo lo pide "desde el MVP". El usuario no lo incluyó en el
encargo de esta spec 002. **¿Entra en este MVP o queda fuera de alcance explícito?** Si
entra, probablemente comparta la forma de solución que se elija en §2.3 (columna vs. tabla),
quizás incluso la misma tabla si el negocio trata facturación como una fase más del mismo
flujo administrativo.

### 2.5 Decisión

- **Opción A** (§2.3): columna `fulfillment_status` en `orders`, `CHECK IN
  ('en_construccion','en_despacho','entregado','perdido')`, `default null` (nulo mientras el
  pedido no está `pagado` — no aplica todavía). Sin tabla de historial en este MVP.
- **Facturación (§2.4): fuera de alcance explícito de este MVP.** No se crea
  `estado_facturacion` ni columna equivalente en este ciclo. Se deja anotado como pendiente
  conocido, no como olvido — `CLAUDE.md` lo pide "desde el MVP", así que este MVP queda
  formalmente en deuda con esa invariante hasta el ciclo que la resuelva.

## 3. CRUD de productos (`products` + `product_variants`)

### 3.1 Qué cubre

- Crear, editar y despublicar (`is_published = false`, no `DELETE` — hay `product_variants`
  y potencialmente `reservations`/`order` histórico colgando de un producto) productos y sus
  variantes.
- Subir/reemplazar la imagen de una variante al bucket `catalogo_nacergroup`, respetando la
  convención confirmada en `specs/001.../spec.md` §5: `variants/{SKU_DE_VARIANTE}.{ext}`.
- Editar `stock_qty` de variante. **No** editar `reserved_qty` a mano — esa columna la
  mueven `reserve_variant`/`cancel_order`/`confirm_order`/`expire_reservations`; si el panel
  la toca directo, dos reservas activas simultáneas pueden desincronizarse del carrito real
  del agente. El panel muestra `reserved_qty` de solo lectura y el disponible calculado
  (`stock_qty - reserved_qty`, igual que `available_units`), nunca lo edita.
- Editar `base_price`, `category` (con el techo de precio de Crisálidas visible como ayuda,
  no como validación dura — 001 §4.1 documenta los techos pero no hay `CHECK` en la base que
  los fuerce hoy; si el panel debe *forzar* el techo o solo *advertirlo* es otra pregunta
  abierta, ver §3.3).

### 3.2 Por qué "sigue siendo válido para el agente"

`get_product` (RPC del otro repositorio) lee `products`/`product_variants`/`product_options`
tal cual están hoy — no hay caché ni tabla espejo. Cualquier fila que el panel escriba con
`service_role` es inmediatamente lo que el agente de WhatsApp ve en la siguiente consulta.
Esto es una ventaja (no hay sincronización que construir) y un riesgo (un `UPDATE` mal hecho
desde el panel afecta ventas en vivo de inmediato, sin capa de staging). El MVP no incluye
ambiente de *staging* separado — se anota como riesgo aceptado del MVP, no como pendiente a
resolver ahora.

### 3.3 Preguntas abiertas de esta pieza

1. **Despublicar vs. borrar**: ¿el panel permite borrar un producto que nunca tuvo
   pedido/reserva (fila huérfana), o `is_published = false` es la única salida siempre,
   incluso para errores de carga? Afecta si hay `DELETE` en el CRUD o no.
2. **Creación de SKU**: ¿el panel genera el SKU automáticamente con el prefijo de marca
   (`CRI-`/`JAG-`/`FLO-` — confirmado por consulta directa a `products.sku` en Supabase, no
   es una convención documentada en ningún sitio, es simplemente lo que ya está cargado) o lo
   escribe la persona a mano? Un SKU mal tecleado rompe el enlace con el archivo del bucket.
3. **Techo de precio por `category`** (Crisálidas): ¿el panel lo valida y bloquea, o solo lo
   muestra como referencia y confía en la persona? Hoy no hay `CHECK` en la base que lo
   fuerce — si el panel debe ser la única barrera, hay que decidirlo explícitamente porque
   hoy nada lo impide ni en Supabase ni en ningún código.
4. **Florea tiene productos reales en la base** (001 §4.1), aunque el storefront de este
   repositorio la trata como marca sin catálogo (`vende_en_sitio = false` es un concepto de
   este repo, no de la tabla `products` real, que no tiene ese booleano). ¿El CRUD del panel
   incluye Florea igual que las otras dos marcas, ya que el agente sí la vende? Esto es
   independiente de si el storefront web la vende.

### 3.4 Decisiones

1. **Despublicar, nunca borrar.** El CRUD no expone `DELETE` sobre `products` ni
   `product_variants` en este MVP, ni siquiera para filas sin reservas/pedidos. La única
   salida es `is_published = false`. Simplifica el MVP y evita reabrir la pregunta de "¿esta
   fila está realmente huérfana?" en cada borrado.
2. **SKU automático por prefijo de marca, con verificación de unicidad.** El panel genera el
   SKU (`CRI-`/`JAG-`/`FLO-` + lo que corresponda de tipo/código, siguiendo el patrón
   observado directamente en `products.sku`/`product_variants.sku` reales — no hay
   documento que lo defina, se dedujo de los datos) y **valida contra `products.sku`/
   `product_variants.sku` existentes antes de guardar** — si genera una colisión, la persona
   ve el conflicto y elige cómo resolverlo (no se autoincrementa en silencio ni se guarda un
   duplicado). El patrón exacto de generación se fija en `plan.md` (§7 de ese documento).
3. **Techo de precio de Crisálidas: advertencia, no bloqueo.** El panel muestra el techo
   junto al campo de precio cuando `category` está seleccionada, pero permite guardar fuera
   de rango — igual de permisivo que la base hoy, que no tiene `CHECK` para esto.
4. **Florea entra al CRUD** igual que Crisálidas y Jagua. El panel gestiona el catálogo real
   que consume el agente de WhatsApp, que sí vende Florea, independientemente de que el
   storefront web la trate como marca de enlace externo sin catálogo propio.

## 4. Fuera del alcance de este MVP

- Tablero de producción con agenda de experiencias (`requiere_agenda`/fecha comprometida).
- Vista consolidada exportable (equivalente Excel para contabilidad).
- Autenticación por rol (`admin`/`ventas`/`inventario`/`produccion`) y su RLS — sin eso, el
  MVP corre detrás de lo que exista de acceso a este repositorio/deploy (a definir en plan.md
  como riesgo, no como feature de este ciclo).
- Notificaciones al equipo (pedido nuevo pagado, stock bajo, pago fallido) — sin canal
  decidido, igual que en el repositorio del agente.
- Cualquier edición de `sale_details` (comprador/destinatario/factura) — pregunta abierta en
  `specs/001.../spec.md` §8.3, todavía sin resolver si entra en este ciclo o no.
- Cualquier cambio al esquema de Supabase sin migración mostrada y aprobada primero (regla
  explícita del encargo).

## 5. Criterios de aprobación de esta spec

Antes de pasar a `plan.md`, el usuario debe responder:

1. Opción A, B o C (§2.3) para el estado de cumplimiento — y si B, ¿historial o solo estado
   actual?
2. ¿Facturación entra en este MVP? (§2.4)
3. Despublicar vs. borrar, generación de SKU, validación de techo de precio, alcance de
   Florea (§3.3, cuatro preguntas)
