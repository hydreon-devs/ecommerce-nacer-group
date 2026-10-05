# Plan Técnico: Rediseño del Panel, KPIs con Gráficas y Tabla Operativa (003)

**Estado:** borrador — diseño técnico sobre `spec.md` con decisiones ya tomadas (§5.1).
**Depende de:** `specs/003_rediseno_panel_kpis_tabla_operativa/spec.md`,
`specs/002_mvp_panel_administracion/plan.md` (arquitectura del panel ya construida: dos
clientes de Supabase, `proxy.ts`, route groups).
**Skills cargadas para este plan:** `ui-ux-pro-max` (dirección visual) y `dataviz` (paleta
validada y forma de gráfica) — exigidas por `.claude/agents/admin-panel.md`. Sus resultados
se citan en §2 y §4; no se decidió ningún color ni tipo de gráfica "a ojo".
**Ninguna migración se aplica desde este documento** — el SQL de §3 se muestra para
aprobación en `tasks.md`, igual que en spec 002.

## 1. Resumen del alcance

Tres piezas sobre el panel ya construido (spec 002), sin tocar el storefront ni ninguna
función RPC del agente de WhatsApp:

1. **Sistema visual propio de `/admin`**: tema claro/oscuro con toggle persistente, estética
   "high-tech" con base tecnológica real (paleta validada por CVD, tipografía con un acento
   monoespaciado para datos) sin caer en cyberpunk/neón.
2. **Dashboard de KPIs con gráficas**: 4 tiles de cifra + 5 gráficas, todas derivables de
   datos que ya existen (spec 003 §7 no encontró huecos de modelo para esto).
3. **Tabla operativa ampliada**, con las columnas nuevas que decidió el usuario
   (`spec.md` §5.1): correlativo humano, asesor, proveedor — más todo lo que ya existía y el
   MVP no mostraba todavía (comprador, destinatario, ocasión, tarjeta, dirección completa).

## 2. Sistema visual

**Revisado el 2026-09-12 — ver `docs/adr/0006-paleta-panel-separada-de-tienda.md` para el
razonamiento completo.** La versión original de esta sección (§2.1-§2.2, abajo) proponía una
superficie y un acento 100% genéricos, sin ninguna relación con la marca. El usuario pidió
explícitamente reutilizar la paleta de Crisálidas y Mariposas para los *detalles* del panel
sin tocar los colores de la tienda. Se probó con el validador de `dataviz` si la paleta de
marca completa (moss/violeta/ámbar) servía como color de **datos** — falló los pisos de
croma y separación en ambos modos — así que la decisión final separa dos usos:

- **Acento único de marca** (`--admin-accent`): reutiliza literalmente `--color-moss` /
  `--color-moss-soft` de `app/globals.css` — botones, focus rings, nav activo, y la única
  serie de la gráfica de tendencia (que al ser una sola línea no necesita separarse de nada).
- **Colores de datos** (gráficas categóricas, estados de cumplimiento): la paleta técnica de
  `dataviz` sin relación con la marca, exactamente como se valida en §2.1/§4 más abajo — ahí
  sí importa la separabilidad computable.

Los hex exactos de §2.2 quedaron desactualizados por este cambio; el archivo real
(`app/admin/globals.css`) es la fuente de verdad — §2.2 se corrigió para coincidir.

### 2.1 Paleta — `ui-ux-pro-max --design-system` + ajuste a "high-tech"

La búsqueda inicial con `ui-ux-pro-max` devolvió un patrón "Trust & Authority" genérico de
landing corporativa — no encaja con "high-tech". Se buscó explícitamente por estilo y color
de dashboards técnicos (`--domain style "high tech futuristic dark"`,
`--domain color "tech dashboard dark mode"`). Los estilos `cyberpunk-ui` y `hud-sci-fi-fui`
son literalmente lo que el usuario pidió **evitar** ("no exagerado"): neón, glitch, scanlines,
`risk:high` de accesibilidad. La búsqueda de paleta de color, en cambio, devolvió tres
paletas de "Dashboard financiero/tech" coherentes entre sí (slate/navy oscuro + un acento
verde o azul, sin neón) — esa es la base real de este plan.

**Decisión: superficie slate/navy, no la calidez del paquete por defecto de `dataviz`.**
`references/palette.md` de `dataviz` documenta un tono cálido neutro
(`#fcfcfb` claro / `#1a1a19` oscuro) como su instancia de referencia, pero permite
explícitamente sustituir superficies y re-validar. Se sustituyó por una superficie fría
slate — la que da la sensación "tech" — y **se corrió el validador contra ella**, no se
asumió que pasaría:

```
node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300,#4a3aa7,#e34948" \
  --mode light --surface "#F8FAFC"
→ ALL CHECKS PASS (3 slots en banda WARN de contraste — mitigado con etiquetas directas, obligatorias de todos modos)

node scripts/validate_palette.js "#3987e5,#d95926,#199e70,#c98500,#d55181,#008300,#9085e9,#e66767" \
  --mode dark --surface "#0F172A"
→ ALL CHECKS PASS (los 8 slots >= 3:1)
```

Las 8 hues categóricas **no se tocan** — el orden es el mecanismo de seguridad CVD, ya
validado en ambos modos; reordenar exige re-validar contra las 28 combinaciones, y no hay
motivo para hacerlo.

### 2.2 Tokens del panel

Nuevo archivo `app/admin/globals.css` (el panel **no** importa `app/globals.css` de la
tienda — decisión ya tomada en spec 002 §2 de mantener los dos sistemas separados):

```css
@import "tailwindcss";

:root {
  --admin-surface:        #f8fafc;  /* slate-50 */
  --admin-surface-raised: #ffffff;
  --admin-ink:            #0b1120;
  --admin-ink-secondary:  #4b5a52;  /* slate con sesgo sutil hacia el verde de marca */
  --admin-border:         #e1e8e2;
  --admin-accent:         #4b6b4e;  /* = --color-moss de app/globals.css (ADR 0006) */
  --admin-good:           #0ca30c;  /* estado — nunca la marca ni el acento */
  --admin-warning-fg:     #92650b;
  --admin-critical-fg:    #a2483f;
  --admin-series-blue:    #2a78d6;  /* paleta dataviz — solo para datos categóricos */
  --admin-series-orange:  #eb6834;
  --admin-series-aqua:    #1baf7a;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --admin-surface:        #0b1120;  /* slate-900 */
    --admin-surface-raised: #131c2e;
    --admin-ink:            #f3f7f4;
    --admin-ink-secondary:  #b9c7be;
    --admin-border:         #223047;
    --admin-accent:         #7c9a7e;  /* = --color-moss-soft de app/globals.css */
    --admin-good:           #34c759;
    --admin-warning-fg:     #fab219;
    --admin-critical-fg:    #f0857d;
    --admin-series-blue:    #3987e5;
    --admin-series-orange:  #d95926;
    --admin-series-aqua:    #199e70;
  }
}
:root[data-theme="dark"] {
  /* mismos valores que el bloque de arriba — el toggle manual gana en ambas direcciones */
}

@theme inline {
  --color-admin-surface: var(--admin-surface);
  --color-admin-accent:  var(--admin-accent);
  /* … el resto de roles, uno por variable — ver app/admin/globals.css para la lista completa */
}
```

Patrón de doble guardia (media query + atributo explícito) — el mismo que documenta
`dataviz/references/palette.md` para que el toggle manual gane sobre la preferencia del
sistema en ambas direcciones. Extracto abreviado; `app/admin/globals.css` tiene la lista
completa de tokens (superficie hundida, bordes fuertes, fondos de estado, etc.).

**Sobre `@custom-variant dark`, mencionado en la versión anterior de este plan: no hizo
falta.** Los componentes usan clases Tailwind normales (`bg-admin-surface`,
`text-admin-ink`) generadas por el bloque `@theme inline` de arriba — el valor de cada
variable CSS cambia según `data-theme`/`prefers-color-scheme`, así que la clase no necesita
saber en qué tema está. Es el mismo mecanismo que ya usa `app/globals.css` de la tienda (que
no tiene tema oscuro, pero sí usa `@theme inline` de la misma forma), aplicado con dos
bloques de override en vez de uno.

### 2.3 Tipografía — acento monoespaciado, no cyberpunk

`ui-ux-pro-max --domain typography "fintech dashboard data dense"` devolvió el pairing
**"Dashboard Data"**: `Fira Sans` para texto general + `Fira Code` reservado a datos
(números, códigos). Esto logra la sensación "high-tech" con una señal real (los datos se ven
distintos del texto, como en una terminal) sin adornos — cumple "profesional, no
exagerado" mejor que cualquier combinación con Orbitron/glitch.

Aplicación concreta:
- `Fira Sans` — toda la UI (labels, nav, prosa).
- `Fira Code` — el correlativo de pedido (`C0001`), montos en COP en la tabla y las tarjetas
  KPI, SKUs, teléfonos. Coincide con la propia regla de `dataviz` de reservar
  `font-variant-numeric: tabular-nums` para columnas que deben alinearse — aquí se refuerza
  con una familia monoespaciada real, no solo la variante numérica.

### 2.4 Toggle de tema

Persistido en `localStorage` (`admin-theme`), con `prefers-color-scheme` como valor inicial
si no hay preferencia guardada — patrón estándar, evita que el panel "olvide" la elección de
cada persona entre sesiones, que es lo esperable en una herramienta de trabajo diario.
Implementación: un pequeño script inline en `app/admin/layout.tsx` que lee `localStorage`
antes del primer paint (evita parpadeo de tema) y setea `data-theme` en `<html>`; un botón en
el shell (`(protected)/layout.tsx`) que alterna y persiste.

## 3. Cambios de esquema — para aprobación, no aplicados

Tres columnas nuevas en `orders`, ninguna toca `confirm_order` ni otra RPC del agente
(decisión de spec §5.1: descuento/recargo quedan fuera, así que `grand_total` no cambia de
fórmula).

**Revisión sobre la primera versión de este plan**, tras feedback directo del usuario
(2026-09-12): la versión anterior fijaba la letra `'C'` como literal dentro del `DEFAULT` de
la columna. El usuario aclaró que la letra cambia con el tiempo (el negocio usa una letra
distinta por año) y **quiere poder cambiarla él mismo** sin pedir otra migración cada vez —
y que en este ambiente de pruebas arranque en `TEST0001`, no en `C0001`. Eso exige mover la
letra y el contador a una fila de configuración editable con `UPDATE`, no a una constante en
SQL:

```sql
-- specs/003 — correlativo humano configurable, asesor y proveedor (texto libre por ahora)

create table public.order_number_settings (
  id integer primary key default 1,
  prefix text not null,
  next_number integer not null default 0,
  constraint order_number_settings_single_row check (id = 1)
);

comment on table public.order_number_settings is
  'Fila única (id=1) que controla el correlativo humano de pedidos (orders.human_number). '
  'Cambiar la letra del año es un UPDATE sobre esta tabla, no una migración: '
  'update order_number_settings set prefix = ''D'', next_number = 0 where id = 1;';

insert into public.order_number_settings (id, prefix, next_number) values (1, 'TEST', 0);

create function public.generate_order_human_number()
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_next integer;
begin
  -- El UPDATE bloquea la fila (igual que confirm_order bloquea variantes):
  -- dos pedidos creados a la vez no pueden recibir el mismo número.
  update public.order_number_settings
     set next_number = next_number + 1
   where id = 1
   returning prefix, next_number into v_prefix, v_next;

  return v_prefix || lpad(v_next::text, 4, '0');
end;
$$;

comment on function public.generate_order_human_number() is
  'Genera el siguiente correlativo humano (ej. TEST0001) leyendo la letra vigente de '
  'order_number_settings. Se invoca desde el DEFAULT de orders.human_number — nunca '
  'directamente por el agente ni por el panel.';

alter table public.orders
  add column human_number text not null default (public.generate_order_human_number()),
  add column advisor_name text,
  add column supplier_name text;

alter table public.orders
  add constraint orders_human_number_unique unique (human_number);

comment on column public.orders.human_number is
  'Correlativo humano tipo TEST0001, generado por generate_order_human_number() a partir '
  'de order_number_settings. No reemplaza orders.id (uuid, sigue siendo la PK real). '
  'La letra/prefijo se cambia con un UPDATE sobre order_number_settings, no con una '
  'migración (decisión: specs/003, feedback del usuario 2026-09-12).';
comment on column public.orders.advisor_name is
  'Texto libre: persona de Nacer Group que gestionó el pedido. Editable desde el panel. '
  'Sin tabla de asesores todavía (specs/003, spec.md §5.1) — se revisa si hace falta '
  'integridad referencial cuando haya volumen real.';
comment on column public.orders.supplier_name is
  'Texto libre: taller/proveedor que produce el pedido (hoy la registra la artesana). '
  'Editable desde el panel; vacío hasta que se llene. Sin tabla de proveedores todavía '
  '(specs/003, spec.md §5.1) — insumo directo del futuro tablero de producción.';
```

**Por qué una función en el `DEFAULT` y no un trigger:** los pedidos los crea hoy
`reserve_variant` (RPC del agente) o, potencialmente, un flujo futuro desde el panel
(`payment_source = 'panel'`). Un `DEFAULT` en la columna asigna el correlativo sin que
ninguna de esas rutas tenga que saber que la columna existe — cero cambios a `reserve_variant`
ni a ninguna función compartida con el agente. Esto es más seguro que un trigger `BEFORE
INSERT` (mismo resultado, una pieza menos que mantener).

**Cómo cambiar la letra el año que viene** (sin migración, sin tocar código):

```sql
update public.order_number_settings set prefix = 'D', next_number = 0 where id = 1;
```

La próxima llamada a `generate_order_human_number()` devuelve `D0001`. Este `UPDATE` puede
correrlo el usuario directamente en Supabase, o un ciclo futuro puede exponer un formulario
mínimo en el panel sobre esta misma tabla — no se construye esa UI en este ciclo porque no
se pidió, pero el diseño ya lo deja listo sin retrabajo.

**Migración adicional aplicada el 2026-09-12** (ver `docs/adr/0005-...md`), sobre la base ya
migrada arriba — `advisor_name` nace en `'Agente virtual'` en vez de vacío:

```sql
alter table public.orders alter column advisor_name set default 'Agente virtual';

comment on column public.orders.advisor_name is
  'Texto libre: quien gestionó el pedido. Nace en ''Agente virtual'' (el agente de '
  'WhatsApp cierra la venta por defecto); el panel lo sobreescribe cuando una persona '
  'del equipo interviene manualmente. Editable desde el panel. Sin tabla de asesores '
  'todavía (specs/003, spec.md §5.1).';

update public.orders set advisor_name = 'Agente virtual' where advisor_name is null;
```

**Riesgo aceptado y explícito:** las 3 filas reales que ya existen en `orders` recibirán un
`human_number` retroactivo (`TEST0001`–`TEST0003`) en el momento del `ALTER TABLE`, porque
Postgres debe reescribir la tabla para calcular un `DEFAULT` no constante (a diferencia de un
`nextval()` plano) sobre las filas existentes — trivial para 3 filas. El orden exacto entre
esas 3 filas no está garantizado por el estándar SQL (depende del orden físico de escaneo),
irrelevante en una base de pruebas de 3 pedidos. Ese correlativo retroactivo **no
correlaciona con nada real del Excel** — es simplemente el primer, segundo y tercer pedido
que existen en esta base de pruebas.

## 4. Dashboard de KPIs y gráficas

### 4.1 Librería

**Recharts** — recomendada de forma consistente por `dataviz --domain chart` para line/bar
en stacks React (`Library Recommendation: Chart.js, Recharts, ApexCharts` / `Recharts,
D3.js`), y es la que mejor encaja con Server/Client Components de Next.js: los datos se
calculan en el servidor (Server Component) y se le pasan como props a un wrapper de gráfica
marcado `"use client"` (Recharts depende de medir el DOM, no puede ser Server Component).

### 4.2 Las cuatro tarjetas KPI (stat tiles)

Por `dataviz/references/choosing-a-form.md`: un número aislado con contexto es un **stat
tile**, no una gráfica — se listan primero porque son la lectura más rápida del negocio:

| Tile | Cálculo |
|---|---|
| Ventas del periodo | `sum(grand_total) where status='pagado' and confirmed_at in periodo` |
| Pedidos vendidos | `count(*) where status='pagado' and confirmed_at in periodo` (ya existe, spec 002) |
| Ticket promedio | `avg(grand_total)` sobre el mismo conjunto |
| Pendientes de despacho | `count(*) where fulfillment_status in ('en_construccion','en_despacho')` |

Tipografía de la cifra: `Fira Code` (§2.3) — es exactamente el caso que `dataviz` describe
como "hero figure".

### 4.3 Las cinco gráficas — forma y color decididos por regla, no por gusto

| # | Métrica | Forma (`dataviz`) | Color |
|---|---|---|---|
| 1 | Tendencia de ventas por día | **Línea**, con área de relleno 20% opacidad (regla de marcas) | Un solo hue — slot 1 azul (`#2a78d6` / `#3987e5`) — coincide con la recomendación por defecto de "sequential hue" para series única |
| 2 | Ventas por marca (3 categorías) | **Barra horizontal**, ordenada descendente | Slots categóricos 1–3 (azul/naranja/aqua) — con solo 3 categorías caben dentro del subconjunto que valida *todas* las combinaciones entre sí (`dataviz` §Categorical: "los primeros tres slots validan all-pairs"), no solo adyacentes |
| 3 | Productos más vendidos (top 8) | **Barra horizontal**, ranking | **Un solo color** (slot 1), no 8 hues — es un ranking de la misma entidad por una métrica, no 8 identidades distintas a diferenciar; evita el problema de que el 8º slot ya no es CVD-seguro combinado con todos los anteriores |
| 4 | Métodos de pago | **Barra horizontal** (no dona) | Slots 1–3 |
| 5 | Pedidos por fase de cumplimiento | **Barra horizontal**, colores de **estado**, no categóricos | Ver §4.4 |

**Por qué barra y no dona para 4 y 5:** ninguna búsqueda de `dataviz --domain chart` devolvió
dona/pie como forma recomendada para comparar categorías — la guía validada es
"Compare Categories → Bar Chart (Horizontal or Vertical)". Un dona exige juzgar ángulos, una
barra exige comparar longitudes (más preciso, mismo espacio). Es un cambio de forma respecto
a lo que el usuario mencionó como opción ("dona o barras") — se documenta la razón para que
el usuario pueda vetarlo si prefiere la dona de todos modos; no es una decisión de datos, es
reversible.

### 4.4 Colores de estado para "fase de cumplimiento" — regla, no gusto

`dataviz`: *"Status colors are reserved (good/warning/serious/critical) and never reused for
'series 4'"*. `fulfillment_status` **es** literalmente un estado, no una identidad
categórica arbitraria — encaja con la regla, no con la paleta categórica:

| Valor | Rol de estado | Justificación |
|---|---|---|
| `entregado` | `good` (`#0ca30c` / `#0ca30c`) | Resultado positivo, cerrado bien |
| `en_despacho` | `warning` (`#fab219`) | En curso, necesita seguimiento activo |
| `en_construccion` | slot categórico 1 (azul) — **no** un color de estado | Es trabajo normal en curso, no una alerta; reservar `warning`/`serious` para cuando de verdad hay que prestar atención evita que la gráfica "grite" en el caso común |
| `perdido` | `critical` (`#d03b3b`) | Resultado negativo |

Cada barra lleva su etiqueta de texto directa (nombre de la fase + cifra) — la propia regla
de `dataviz` exige que un color de estado nunca cargue el significado solo por el color.

### 4.5 Umbral de stock bajo

`spec.md` §7 dejó esto como pregiunta menor no bloqueante. Propuesta para `tasks.md`:
`stock_qty - reserved_qty <= 3` como valor inicial razonable, configurable después si el
negocio lo pide — no hay ninguna fuente de verdad hoy que diga cuál es "bajo" para Nacer
Group, así que se elige un número conservador y se deja fácil de cambiar (constante en código,
no hardcodeado en la consulta).

## 5. Tabla operativa — columnas finales

Reescribe `app/admin/(protected)/pedidos/page.tsx` de una tabla de 5 columnas a la vista
operativa completa. Fuente: el mapeo de `spec.md` §4, con las decisiones de §5.1 aplicadas.

| Columna visible | Fuente |
|---|---|
| N° pedido | `orders.human_number` (nuevo) |
| Fecha | `orders.confirmed_at` |
| Asesor | `orders.advisor_name` (nuevo, editable inline) |
| Proveedor | `orders.supplier_name` (nuevo, editable inline) |
| Producto(s) | `reservations → product_variants → products.name`, concatenado si hay más de una línea |
| Cantidad | `sum(reservations.qty)` |
| Costo producto | `sum(reservations.total_price)` |
| KM | `orders.delivery_distance_km` |
| Costo domicilio | `orders.delivery_fee` |
| Tipo de envío | `orders.delivery_method` |
| Valor a pagar | `orders.grand_total` |
| Tipo de pago | `orders.payment_source` |
| Comprador | `sale_details.buyer_name` |
| Celular comprador | `orders.chat_id` (aproximación decidida en spec §5.1) |
| Correo | `sale_details.buyer_email` |
| Quien recibe | `sale_details.recipient_name` |
| Teléfono destinatario | `sale_details.recipient_phone` |
| Ciudad / Barrio / Dirección / Unidad | `sale_details.city` / `neighborhood` / `delivery_address_exact` / `delivery_unit` |
| Fecha de entrega | `orders.desired_delivery_date` |
| Ocasión | `orders.occasion` (cubre también "género de la experiencia", spec §5.1) |
| De: / Para: / Mensaje | `sale_details.card_from` / `card_to` / `card_message` |
| Observación especial | `sale_details.special_notes` |
| Canal de origen | `sale_details.referral_source` (aproximación decidida en spec §5.1) |
| Factura electrónica | `sale_details.wants_invoice` + datos si aplica |
| Fase de cumplimiento | `orders.fulfillment_status` (ya existía en el MVP) |

**Edición inline de Asesor/Proveedor**: dos campos de texto en la fila o en el detalle de
pedido, con una Server Action `setOrderStaffFields(orderId, {advisorName, supplierName})` —
mismo patrón que `setFulfillmentStatus` de spec 002.

**No incluidas en esta tabla** (decisión de spec §5.1): `REF`/`COMPROBANTE DE PAGO` (fuera de
ciclo), `DESCUENTO`/`RECARGO` (fuera de ciclo), `ZONA DE ENTREGA` con nombre (se muestra el
KM crudo, sin etiqueta de tramo).

**Densidad**: con ~24 columnas potenciales, mostrar todas a la vez en una tabla HTML rompe
cualquier pantalla. Se propone: columnas "siempre visibles" (pedido, fecha, asesor, producto,
valor, fase) + un botón "ver todo" que expande el detalle completo (ya existe como página de
detalle desde spec 002) en vez de intentar que la tabla principal las muestre todas a la vez.
Esto es coherente con la regla 5 de `.claude/agents/admin-panel.md` (densidad de información)
sin sacrificar que la tabla siga siendo usable en una pantalla normal.

## 6. Dependencias nuevas

| Paquete | Para |
|---|---|
| `recharts` | Las 5 gráficas (§4) |

No se agrega ninguna librería de UI de componentes (shadcn, MUI, etc.) — el panel ya usa
Tailwind directo desde spec 002 y no hay necesidad de un sistema de componentes más pesado
para lo que pide este ciclo.

## 7. Fuera de alcance de este plan

- Exportar la tabla operativa a CSV/Excel — el usuario pidió que la tabla del panel *se
  parezca* a la del Excel, no que la reemplace como archivo descargable. Queda anotado como
  fast-follow natural, no construido aquí salvo que el usuario lo pida explícitamente.
- Tabla `asesores`/`proveedores` con integridad referencial — decisión explícita de quedarse
  en texto libre por ahora (spec §5.1).
- El futuro "dashboard de la artesana" (tablero de producción) que el usuario mencionó como
  destino natural de estos campos — sigue fuera de alcance, es su propio ciclo.
- Descuento, recargo, comprobante de pago — fuera de ciclo (spec §5.1).

## 8. Próximo paso

`tasks.md`: desglose ejecutable — migración de §3 (mostrada para aprobación al momento de
ejecutarse), tokens de tema y toggle, instalación de `recharts`, las 5 gráficas + 4 tiles, y
la tabla operativa ampliada con edición inline de asesor/proveedor.

## 9. Adenda — decisiones posteriores a este plan (2026-09-12)

Todo lo de esta sección se decidió en conversación directa con el usuario después de la
primera versión de este documento. Se referencia aquí para que el plan siga siendo la fuente
de verdad del diseño; el detalle completo de cada decisión vive en su propio ADR.

- **Paleta con acento de marca** — `docs/adr/0006-paleta-panel-separada-de-tienda.md`. Ya
  incorporado en §2 arriba.
- **Correlativo humano configurable, no hardcodeado** —
  `docs/adr/0004-correlativo-humano-configurable.md`. Reemplaza por completo el diseño
  original de §3 (secuencia + literal `'C'`); §3 ya quedó reescrita con la versión final
  (tabla `order_number_settings` + función).
- **`advisor_name` nace en `'Agente virtual'`, no vacío** —
  `docs/adr/0005-asesor-proveedor-texto-libre.md`. Migración adicional a la de §3:
  `alter table orders alter column advisor_name set default 'Agente virtual'` + backfill de
  las filas existentes. El agente de WhatsApp cierra la venta sin intervención humana en el
  flujo normal actual; el campo debe reflejar ese hecho por defecto, no pedir que alguien lo
  llene para un caso que ya se sabe cuál es.
- **Dos páginas, no una.** El usuario pidió separar el dashboard de KPIs (§4) de la tabla
  operativa (§5) en rutas distintas — `/admin/estadisticas` (tiles + gráficas) y
  `/admin/pedidos` (solo la tabla), con un botón en `/admin/pedidos` para saltar a
  estadísticas. La landing de `/admin/pedidos` ya no muestra KPIs; ese contenido se movió tal
  cual a la página nueva.
- **Todas las columnas de §5, no un subconjunto "denso".** La propuesta original de §5
  sugería mostrar solo columnas "siempre visibles" y dejar el resto en la página de detalle,
  por densidad de información. El usuario pidió explícitamente el set completo de columnas
  derivables en la tabla de `/admin/pedidos` — se implementó como una tabla ancha con scroll
  horizontal propio (`overflow-x-auto`), config-driven (`app/admin/(protected)/pedidos/columns.tsx`)
  para no repetir treinta `<td>` a mano. La compresión "denso vs. completo" quedó resuelta a
  favor de completo; no se retomó la propuesta original.
