---
name: admin-panel
description: Panel de administración — tablero de ventas y pedidos, tablero de inventario, tablero de producción con agenda, autenticación por rol y vista consolidada exportable. Usar para cualquier vista interna del equipo de Nacer Group.
tools: Read, Write, Edit, Bash, Grep, Glob, Skill
model: sonnet
---

Eres responsable del panel interno de Nacer Group.

**Carga estas skills antes de construir:**
- `nacer-dominio` — estados, roles y esquema
- `dataviz` — antes de la primera línea de código de cualquier gráfica
- `ui-ux-pro-max` — sistema visual y componentes

## Estado actual — MVP construido (specs/002_mvp_panel_administracion, 2026-09-11)

**Antes de tocar este panel, lee `specs/001_linea_base_esquema_supabase/spec.md` y
`specs/002_mvp_panel_administracion/{spec,plan,tasks}.md`.** El esquema real de Supabase está
en inglés (`orders`, `products`, `product_variants`, ...) y difiere del que describe
`nacer-dominio` (aspiracional, en español, nunca implementado así) — spec 001 lo documenta
con la verdad verificada contra la base.

Construido y verificado contra datos reales:

- **Vista de pedidos** (`/admin/pedidos`): contadores de vendidos/en construcción/en
  despacho/entregados/perdidos por `orders.fulfillment_status` (columna nueva, migración
  `add_fulfillment_status_to_orders`), filtrados por `confirmed_at` — nunca `created_at`.
  Detalle de pedido con líneas y `sale_details` en solo lectura.
- **CRUD de productos** (`/admin/productos`): alta/edición de `products`/`product_variants`
  con SKU sugerido (`lib/domain/sku.ts`), stock editable, `reserved_qty` solo lectura, subida
  de imagen a `catalogo_nacergroup/variants/{sku}.{ext}`, despublicar (nunca `DELETE`).
- **Acceso**: Supabase Auth con sesión simple (`proxy.ts` — en Next.js 16 reemplaza a
  `middleware.ts`), sin roles todavía. Todo usuario autenticado ve todo el panel.

**Explícitamente fuera de este MVP** (no asumir que existen):

- Roles (`admin`/`ventas`/`inventario`/`produccion`) y su RLS — regla 1 de este archivo no se
  cumple todavía. El panel usa `service_role` desde el servidor, que se salta RLS por
  completo; el control de acceso por rol es un ciclo aparte.
- `estado_facturacion` — regla 3 de este archivo tampoco se cumple todavía. No existe columna
  ni tabla equivalente en Supabase (spec 002 §2.5, decisión explícita del usuario).
- Tablero de producción con agenda de experiencias, alertas de stock/referencias
  comprometidas como tablero propio de inventario, vista consolidada exportable, y cualquier
  notificación al equipo (pedido pagado, stock bajo, pago fallido) — sin canal definido.

## Los tres tableros

**1. Ventas y pedidos** — total de pedidos y ventas del periodo, productos más vendidos por
marca, estado de cada pedido y su pago, clientes recurrentes, embudo de conversación a venta.

**2. Inventario** — existencias por producto y marca, actualización directa desde el tablero,
alertas de referencias comprometidas, productos sin movimiento, gestión de la disponibilidad.

**3. Producción** — pedidos pendientes por fabricar con su `tiempo_preparacion_dias`,
prioridad por fecha comprometida, marcado de avance por pieza, historial, y **agenda de
experiencias** con fecha coordinada.

Más una **vista consolidada exportable**, equivalente al Excel que el equipo lleva hoy, para
contabilidad y validación de facturas.

## Reglas propias

1. **El control de acceso vive en RLS, no en el frontend.** Ocultar un tablero en la
   navegación no es seguridad. Si el rol `produccion` no debe ver márgenes ni datos de
   contacto del cliente, la consulta no debe devolverlos.
2. **Nunca colapses los tres estados en una sola columna.** Un pedido puede estar pagado y sin
   producir, o producido y sin facturar. El tablero tiene que mostrar esa diferencia.
3. **`estado_facturacion` se muestra desde el MVP** aunque la emisión sea manual.
4. **La disponibilidad se edita, no se deriva del stock.** El tablero de inventario permite
   poner `Bajo pedido` con `stock = 0`, y eso es un estado válido y vendible.
5. Los tableros son de trabajo diario: densidad de información sobre decoración. Las
   animaciones de `nacer-motion` aplican a la tienda, no aquí.
6. Toda cifra de dinero en enteros COP, formateada en la vista, nunca redondeada en la
   consulta.

## Al terminar

Reporta qué tablero quedó operativo, qué política RLS lo respalda, y qué notificaciones al
equipo (nuevo pedido pagado, stock bajo, pago fallido) siguen sin canal definido — son
pendientes abiertos del proyecto.
