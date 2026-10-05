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

## Estado actual (2026-09-12) — MVP + rediseño construidos

**Antes de tocar este panel, lee en orden: `specs/001_linea_base_esquema_supabase/spec.md`,
`specs/002_mvp_panel_administracion/{spec,plan,tasks}.md`,
`specs/003_rediseno_panel_kpis_tabla_operativa/{spec,plan,tasks}.md`, y `docs/adr/`.** El
esquema real de Supabase está en inglés (`orders`, `products`, `product_variants`, ...) y
difiere del que describe `nacer-dominio` (aspiracional, en español, nunca implementado así) —
spec 001 lo documenta con la verdad verificada contra la base. `docs/adr/` tiene el "por qué"
de las decisiones que se revisaron en vivo durante la construcción — léelo antes de asumir
que el plan original de una spec es lo que terminó implementado.

Construido y verificado contra datos reales:

- **`/admin/estadisticas`**: 4 tiles KPI + 5 gráficas (tendencia de ventas, ventas por marca,
  productos más vendidos, métodos de pago, fase de cumplimiento). Colores decididos por regla
  computable (skill `dataviz`), no a ojo — ver `docs/adr/0006-...md`.
- **`/admin/pedidos`**: tabla operativa completa (~30 columnas, equivalente al Excel real del
  negocio) con scroll horizontal propio, correlativo humano (`orders.human_number`, tipo
  `TEST0001`, prefijo configurable — `docs/adr/0004-...md`), asesor/proveedor editables en
  línea (`orders.advisor_name`/`supplier_name`, nace en `'Agente virtual'` cuando el agente de
  WhatsApp cierra la venta sin intervención humana — `docs/adr/0005-...md`), y fase de
  cumplimiento (`orders.fulfillment_status` — `docs/adr/0003-...md`), filtrado por
  `confirmed_at`, nunca `created_at`. Botón directo a `/admin/estadisticas`.
- **CRUD de productos** (`/admin/productos`): alta/edición de `products`/`product_variants`
  con SKU sugerido (`lib/domain/sku.ts`), stock editable, `reserved_qty` solo lectura, subida
  de imagen a `catalogo_nacergroup/variants/{sku}.{ext}`, despublicar (nunca `DELETE`).
- **Acceso**: Supabase Auth con sesión simple (`proxy.ts` — en Next.js 16 reemplaza a
  `middleware.ts`, `docs/adr/0001-...md`), sin roles todavía. Todo usuario autenticado ve
  todo el panel. Dos clientes de Supabase separados, nunca mezclados —
  `docs/adr/0002-...md`.
- **Sistema visual propio**: tema claro/oscuro con toggle persistente, paleta separada de la
  tienda con un único acento compartido (`--color-moss`), tipografía del sistema con un
  monoespaciado reservado a datos. Animaciones breves (entrada de tarjetas, cambio de vista) —
  ver regla 5 corregida más abajo.

**Explícitamente fuera de alcance todavía** (no asumir que existen):

- Roles (`admin`/`ventas`/`inventario`/`produccion`) y su RLS — regla 1 de este archivo no se
  cumple todavía. El panel usa `service_role` desde el servidor, que se salta RLS por
  completo; el control de acceso por rol es un ciclo aparte.
- `estado_facturacion` — regla 3 de este archivo tampoco se cumple todavía. No existe columna
  ni tabla equivalente en Supabase (spec 002 §2.5, decisión explícita del usuario).
- Tablero de producción con agenda de experiencias (el futuro "dashboard de la artesana" que
  el usuario mencionó como destino de `advisor_name`/`supplier_name`), alertas de stock bajo,
  vista consolidada exportable a CSV/Excel, descuento/recargo, comprobante de pago con UI, y
  cualquier notificación al equipo — sin canal definido.
- Tablas `asesores`/`proveedores` con integridad referencial — hoy son texto libre a propósito
  (`docs/adr/0005-...md`).

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
5. Los tableros son de trabajo diario: densidad de información sobre decoración. **Corregido
   2026-09-12** — el usuario pidió explícitamente animaciones breves en el panel ("que no se
   vea tan página antigua"): entrada con fundido/desplazamiento corto en tarjetas y cambio de
   vista, barras que crecen al cargar. Nunca looping ni decorativa, y nunca la librería
   `nacer-motion`/Framer Motion de la tienda — CSS puro (`@keyframes` en
   `app/admin/globals.css`), 200-420ms, respetando `prefers-reduced-motion`. La regla que
   sigue en pie es "densidad sobre decoración", no "cero animación".
6. Toda cifra de dinero en enteros COP, formateada en la vista, nunca redondeada en la
   consulta.

## Al terminar

Reporta qué tablero quedó operativo, qué política RLS lo respalda, y qué notificaciones al
equipo (nuevo pedido pagado, stock bajo, pago fallido) siguen sin canal definido — son
pendientes abiertos del proyecto.
