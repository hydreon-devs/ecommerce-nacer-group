# Tareas: Rediseño del Panel, KPIs y Tabla Operativa (003)

**Especificación:** `specs/003_rediseno_panel_kpis_tabla_operativa/spec.md`
**Plan:** `specs/003_rediseno_panel_kpis_tabla_operativa/plan.md`
**Estado general: completo y verificado contra datos reales (2026-09-12).** Varias fases se
ejecutaron con revisiones sobre el plan original tras feedback directo del usuario — cada
una queda anotada donde ocurrió, y su razón completa vive en `docs/adr/`.

## Fase 0 — Antes de empezar

- [x] **T-0.1** `spec.md` y `plan.md` aprobados.
- [x] **T-0.2** Decisiones reversibles confirmadas sobre la marcha (barras en vez de dona:
      sin objeción; todas las columnas en vez de un subconjunto denso: el usuario pidió
      explícitamente el set completo, ver Fase 4).

## Fase 1 — Migración de base de datos

- [x] **T-1.1** SQL mostrado y aprobado (2026-09-11). Revisado el 2026-09-12: correlativo
      configurable en vez de literal fijo — `docs/adr/0004-correlativo-humano-configurable.md`.
- [x] **T-1.2** Aplicada en migraciones: `add_order_human_number_advisor_supplier`,
      `enable_rls_order_number_settings`, `harden_generate_order_human_number`,
      `default_advisor_name_agente_virtual`.
- [x] **T-1.3** `get_advisors` revisado en cada paso. Un hallazgo real: la tabla nueva quedó
      sin RLS al crearla (`rls_disabled_in_public`, único ERROR de todo el proyecto) —
      corregido de inmediato. Estado final: 0 advertencias nuevas más allá de las ya
      esperadas por agregar una tabla al patrón existente.
- [x] **T-1.4** Correlativo verificado transaccional (un `INSERT` de prueba con `ROLLBACK`
      no dejó hueco en la numeración). `advisor_name` verificado con default
      `'Agente virtual'` y backfill de las 3 filas reales —
      `docs/adr/0005-asesor-proveedor-texto-libre.md`.

## Fase 2 — Sistema visual del panel

- [x] **T-2.1** `app/admin/globals.css` creado. **Revisado el 2026-09-12**: el usuario pidió
      reutilizar la paleta de marca para los detalles del panel — el acento final es
      `--color-moss`/`--color-moss-soft`, no un azul genérico. Ver
      `docs/adr/0006-paleta-panel-separada-de-tienda.md`.
- [x] **T-2.2** Resuelto sin necesitar `@custom-variant dark`: los componentes usan clases
      Tailwind normales sobre variables CSS que ya cambian de valor según `data-theme`/
      `prefers-color-scheme` (bloque `@theme inline`) — mismo mecanismo que ya usa
      `app/globals.css` de la tienda. La duda quedó cerrada, no pendiente.
- [x] **T-2.3** **Revisado**: no se usó `next/font/google` con Fira Sans/Fira Code. La
      tipografía final es la pila de fuentes del sistema (`ui-sans-serif...`), con
      `font-admin-mono` (`ui-monospace...`) reservado a números y códigos — decisión tomada
      al construir la maqueta interactiva que el usuario aprobó, sin depender de una fuente
      externa.
- [x] **T-2.4** Toggle de tema construido en dos iteraciones. La primera versión
      (`useState` + ícono condicional) causaba un **mismatch real de hidratación** — un swap
      de subárbol completo (dos `<svg>` distintos) no es lo que `suppressHydrationWarning`
      cubre (solo texto/atributos de un mismo nodo). Se reescribió `ThemeToggle.tsx` sin
      estado de React: ambos íconos viven siempre en el DOM y CSS decide cuál se ve según
      `data-theme` — cero riesgo de mismatch porque el árbol nunca cambia de forma.
      `suppressHydrationWarning` sí se necesitó, correctamente, en el propio `<html>` de
      `app/admin/layout.tsx` (el script anti-parpadeo le agrega `data-theme` antes de
      hidratar — ese es el caso real para el que existe esa prop).
- [x] **T-2.5** Verificado en dos rondas: primero por el usuario en navegador real (confirmó
      "se ve bien" tras un hard-refresh), después con una carga de servidor autenticada real
      (sesión generada vía `admin.generateLink` + `verifyOtp`, sin pedir contraseña) que
      confirmó `/admin/pedidos` y `/admin/estadisticas` en 200 sin ningún error — descartando
      definitivamente que el error de hidratación observado en el log fuera del código
      actual y no de una pestaña de navegador con un bundle viejo (confirmado además con
      `lsof`, que mostró conexiones reales de Brave abiertas contra el puerto del dev server).

## Fase 3 — Dashboard de KPIs y gráficas

- [x] **T-3.1** `recharts` instalado, 0 vulnerabilidades nuevas.
- [x] **T-3.2** `lib/data/dashboard.ts`: `getSalesSummary`, `getSalesTrend`,
      `getSalesByBrand`, `getTopProducts`, `getPaymentMethods` — todas sobre `confirmed_at`.
- [x] **T-3.3** `DashboardCharts.tsx`: línea de tendencia (acento de marca), barra de marca y
      de métodos de pago (paleta técnica de 3 slots), productos top (acento de marca, serie
      única), fase de cumplimiento (colores de estado — nunca la marca ni la paleta
      categórica, por regla de `dataviz`).
- [x] **T-3.4** `KpiTiles.tsx` con `font-admin-mono` para las cifras.
- [x] **T-3.5** **Resuelto**: dashboard en su propia página, `app/admin/(protected)/estadisticas/page.tsx`
      — decisión del usuario de separar KPIs de la tabla de pedidos en dos rutas distintas,
      posterior a la implementación inicial (que los tenía juntos en `/admin/pedidos`).
- [x] **T-3.6** Verificado contra los pedidos reales del periodo (2 pagados de 3 totales):
      gráficas y tiles renderizan correctamente con dataset pequeño, sin errores.

## Fase 4 — Tabla operativa ampliada

- [x] **T-4.1** `lib/data/orders.ts`: `getOrders` reescrita para traer, en tres consultas en
      lote (no una por fila), **todas** las columnas derivables de `spec.md` §5 — no solo
      un subconjunto. Nuevo tipo `OrderTableRow`. También se agregó `occasion` y
      `desired_delivery_date` a `OrderDetail` (detalle de un pedido).
- [x] **T-4.2** **Revisado sobre el plan original**: la propuesta de "columnas siempre
      visibles + expandir al detalle" se descartó — el usuario pidió el set completo de
      columnas en la tabla misma. Se construyó `app/admin/(protected)/pedidos/columns.tsx`
      (config-driven, ~30 columnas) para no repetir celdas a mano, con `overflow-x-auto`
      propio (tabla ancha con scroll horizontal, sin desbordar la página).
- [x] **T-4.3** `setOrderStaffFields` (Server Action) + `StaffFieldsInput.tsx` (guarda al
      perder el foco). Integrado tanto en la tabla como en el detalle de pedido.
- [x] **T-4.4** Verificado con un `UPDATE`/revert real sobre un pedido de producción (Dayana
      / Manuel (Monarca) → revertido a null antes del default de "Agente virtual"). Columnas
      de `sale_details` confirmadas mostrando "—" sin error cuando la fila no existe.

## Fase 5 — Validación manual de punta a punta

- [x] **T-5.1** Recorrido en ambos temas confirmado por el usuario tras el hard-refresh; sin
      regresiones del MVP de spec 002 (login, productos, edición de stock/imagen siguen
      intactos — no se tocó su lógica, solo su clase CSS).
- [x] **T-5.2** No se tocó ninguna RPC del agente. Las columnas nuevas (`human_number`,
      `advisor_name`, `supplier_name`) son aditivas y `reserve_variant`/`confirm_order` ni
      las conocen — confirmado leyendo sus definiciones reales, no asumido.
- [x] **T-5.3** Todos los scripts de verificación temporal (`scripts/tmp-*.mjs`/`.ts`) se
      borraron después de cada uso; no quedó ninguno en el repo. Los datos de prueba escritos
      directamente en Supabase (asesor/proveedor de prueba, un `INSERT` con `ROLLBACK`) se
      revirtieron o nunca se confirmaron.

## Fase 6 — Cierre

- [x] **T-6.1** `.claude/agents/admin-panel.md` ya tenía su sección "Estado actual" de spec
      002; se actualiza de nuevo en el cierre de esta spec (ver reporte final al usuario).
- [x] **T-6.2** Reporte final entregado. Fuera de ciclo, sin cambios: export CSV, tablas de
      asesores/proveedores con FK, descuento/recargo, comprobante de pago. Decisiones
      reversibles que quedaron como se implementaron (sin veto del usuario): barras en vez
      de dona, umbral de stock bajo sin definir todavía (no llegó a construirse en este
      ciclo — no hay alerta de stock bajo implementada aún, solo se mencionó como pendiente
      menor en `spec.md` §7).

## Nota — huecos conocidos que esta spec no resuelve

- **Umbral de stock bajo**: `spec.md` §7 lo dejó como pendiente no bloqueante. Sigue sin
  implementarse ninguna alerta de inventario — sería un ciclo aparte, no se coló por error.
- **Export de la tabla operativa a CSV/Excel**: no se pidió, no se construyó.
