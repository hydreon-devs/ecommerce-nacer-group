# Especificación: Rediseño del Panel, KPIs con Gráficas y Tabla Operativa tipo Excel (003)

**Estado:** completa e implementada (2026-09-12). `plan.md` y `tasks.md` documentan la
ejecución real, incluidas las revisiones sobre esta spec que surgieron durante la
construcción (correlativo configurable, acento de marca, dos páginas, tabla completa,
"Agente virtual") — ver `docs/adr/` para el razonamiento de cada una.
**Fecha:** 2026-09-11
**Depende de:** `specs/001_linea_base_esquema_supabase/spec.md`,
`specs/002_mvp_panel_administracion/{spec,plan,tasks}.md` (el MVP ya construido y en
producción — esta spec lo evoluciona, no lo reemplaza).

## 1. Contexto y objetivo

El MVP (spec 002) entregó un panel funcional pero deliberadamente austero: tablas HTML sin
estilo propio, sin gráficas, con solo 5 campos de pedido visibles en el listado. El usuario
pide tres cosas a la vez, y las tres dependen de la misma base de datos real:

1. **Rediseño visual** — identidad propia del panel (distinta de la tienda), tema
   claro/oscuro, estética "high-tech" pero profesional.
2. **KPIs con gráficas** — visualizar métricas del negocio, no solo contarlas en texto.
3. **Tabla operativa equivalente al Excel real** que el equipo usa hoy para logística de
   pedidos — el documento que `.claude/agents/admin-panel.md` ya preveía como "vista
   consolidada exportable" y que spec 002 dejó fuera de su primer alcance.

Este documento resuelve primero el punto más riesgoso: **qué tan cerca puede estar la tabla
del panel de la tabla que el equipo usa hoy en Excel**, campo por campo, contra la base real.
El resultado no es una decisión de UI — es un diagnóstico de qué existe, qué es derivable, y
qué genuinamente no se ha modelado nunca. Ninguno de esos huecos se resuelve aquí por cuenta
propia (regla del proyecto): se documentan como preguntas para el usuario en §5.

## 2. Fuente de la comparación

El usuario compartió el encabezado y siete filas reales de exportación de su Excel operativo
(mensaje del 2026-09-11). Se tomó el encabezado como la lista definitiva de conceptos que el
negocio rastrea — **no se intentó alinear con certeza absoluta cada valor de cada fila con su
columna**, porque el pegado de texto separado por tabulaciones no garantiza que cada valor
haya caído bajo su encabezado correcto (hay columnas con datos que no coinciden con lo que su
nombre sugiere, p. ej. "NUMERO DE PRODUCTOS" con lo que parecen números de teléfono). Donde el
valor de ejemplo ayuda a interpretar el campo, se cita entre comillas; donde no, se trabaja
solo con el nombre del encabezado.

Se verificó el esquema real completo contra Supabase (`list_tables`, verbose) el 2026-09-11,
después de la migración `add_fulfillment_status_to_orders` de spec 002 — es la migración más
reciente aplicada, y esta spec parte de ese estado, no de memoria.

## 3. Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | Existe una columna real que corresponde 1:1 |
| 🟡 | Derivable por cálculo o `join`, no es una columna propia |
| ❌ | No existe en ningún lado de la base — hueco real |

## 4. Mapeo campo por campo

### 4.1 Identificación y referencia del pedido

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `ORDEN` / `# DE FACTURA` (ej. `C0758`) | ❌ | `orders.id` es un UUID, no un correlativo humano secuencial con prefijo. No existe ninguna secuencia ni columna de numeración de negocio. |
| `REF` (ej. `FE2329`) | 🟡 | `orders.payment_ref` existe pero es la llave de idempotencia técnica del webhook/transferencia (spec `rpc-contract.md` §4) — no es un campo libre editable por un operador para anotar una referencia de factura externa. Mismo dato, propósito distinto. |
| `COMPROBANTE DE PAGO` | 🟡 | La tabla `payment_proofs` existe exactamente para esto (`image_url`, `extracted` jsonb con OCR, `status`) — pero hoy tiene **0 filas** y el panel no tiene ninguna UI para subir/ver comprobantes. El dato tiene hogar; falta construir el CRUD sobre él. |

### 4.2 Operación interna (quién gestiona)

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `ASESOR` (ej. `Dayana`, `Sara`) | ❌ | No existe ningún concepto de "persona del equipo que gestionó este pedido" en ninguna tabla. Ni en `orders` ni en `conversations`. |
| `PROVEEDOR` (ej. `MANUEL(MONARCA)`, `LUIS(MONARCA)`) | ❌ | No existe ningún concepto de proveedor/taller externo que produce el arreglo. No hay tabla `proveedores` ni columna en `orders` ni en `products`. |
| `TIPO DE ENVIO` (`ENVÍO` vs `DOMICILIO`) | 🟡 | `orders.delivery_method` solo acepta `domicilio` / `tienda` (`CHECK` real). El Excel distingue un tercer caso — envío nacional por transportadora, con proveedor propio — que **no tiene valor válido hoy** en el enum real. |
| `ZONA DE ENTREGA` (ej. `rango 4`, `Rango 2`) | 🟡 | `delivery_tariffs` tiene tramos por `km_from`/`km_to` con precio, pero **sin nombre de tramo** (ninguna columna tipo "Rango 1", "Rango 2"). El KM sí existe (`orders.delivery_distance_km`) y de ahí se puede calcular a qué tramo pertenece, pero la etiqueta textual que usa el equipo no está en la base. |

### 4.3 Producto y monto

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `NOMBRE DE PRODUCTO` | ✅ | `products.name`, vía `reservations → product_variants → products`. |
| `N° DE CRISALIDAS` (cantidad) | ✅ | `reservations.qty`. |
| `NUMERO DE PRODUCTOS` (líneas del pedido) | 🟡 | No es una columna; se deriva contando filas de `reservations` por `order_id`. |
| `COSTO DE PRODUCTO` | ✅ | `reservations.unit_price` / `reservations.total_price`. |
| `KM` | ✅ | `orders.delivery_distance_km`. |
| `COSTO DE DOMICILIO` | ✅ | `orders.delivery_fee`. |
| `COSTO ADICIONAL` | 🟡 | Podría corresponder al precio de `product_options` (agregados con precio propio) sumado desde `reservations.options` (jsonb) — existe el dato pero no una columna "costo adicional" agregada al pedido. |
| `DESCUENTO` | ❌ | No existe ninguna columna de descuento en `orders` ni en `reservations`. |
| `RECARGO` | ❌ | No existe ninguna columna de recargo/sobrecosto (ej. el ~9% que se ve en los pagos con Mercado Pago de la muestra). `paid_amount` vs `grand_total` podría insinuar una diferencia, pero no hay campo que declare la tasa o el motivo. |
| `VALOR A PAGAR` | ✅ | `orders.grand_total` (columna generada: `total_price + delivery_fee`) — aunque hoy no contempla descuento/recargo porque esas columnas no existen. |
| `Marca temporal` (fecha de creación) | ✅ | `orders.created_at`. |
| `TIPO DE PAGO` | ✅ | `orders.payment_source` (`mercadopago` / `transferencia` / `panel`). |

### 4.4 Comprador

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `NOMBRE DE QUIEN COMPRA` | ✅ | `sale_details.buyer_name`. |
| `Correo Electrónico` | ✅ | `sale_details.buyer_email`. |
| `Celular` (del comprador) | 🟡 / ❌ | En pedidos que vienen de WhatsApp, `orders.chat_id` **es** el número del comprador — pero no hay una columna explícita "celular del comprador" en `sale_details`, y para pedidos que se originen desde el panel (`payment_source = 'panel'`) no habría ningún `chat_id` real que sirva como celular. Hueco parcial. |
| `POR DONDE HIZO EL PEDIDO` | ❌ | No hay ninguna columna de "canal específico de este pedido" (web / WhatsApp / Instagram / voz a voz) distinta de `referral_source`. Ver §5 para la duda sobre si esto es lo mismo que "¿por qué medio nos conoció?" o un concepto operativo distinto. |
| `¿Por qué medio nos conoció?` | ✅ | `sale_details.referral_source`. |
| `¿Desea Factura Electrónica?` + datos de facturación | ✅ | `sale_details.wants_invoice`, `invoice_legal_name`, `invoice_tax_id`, `invoice_email`. |

### 4.5 Destinatario y entrega

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `NOMBRE DE QUIEN RECIBE O RECOGE` | ✅ | `sale_details.recipient_name`. |
| `TELÉFONO DE QUIEN RECIBE O RECOGE` | ✅ | `sale_details.recipient_phone`. |
| `¿Podemos llamar al destinatario...?` | ✅ | `sale_details.may_call_recipient`. |
| `CIUDAD` | ✅ | `sale_details.city`. |
| `BARRIO` | ✅ | `sale_details.neighborhood`. |
| `DIRECCIÓN` | ✅ | `sale_details.delivery_address_exact` (y `orders.delivery_address`, más genérica). |
| `*NOMBRE URBANIZACIÓN O EDIFICIO` | ✅ | `sale_details.building_name`. |
| `NÚMERO DE APTO, CASA ó PISO` | ✅ | `sale_details.delivery_unit`. |
| `FECHA DE ENTREGA` | ✅ | `orders.desired_delivery_date`. |

### 4.6 Ocasión y mensaje

| Campo del Excel | Estado | Fuente / nota |
|---|---|---|
| `OCASIÓN` | ✅ | `orders.occasion` (copia congelada de `conversations.occasion`). |
| `GÉNERO DE LA EXPERIENCIA` | 🟡 | En la muestra tiene el mismo valor que `OCASIÓN` (`CONDOLENCIA`) en cada fila — probablemente un campo heredado/duplicado del propio Excel del cliente, no un concepto adicional. A confirmar con el usuario, no asumido como hueco real. |
| `De:` / `Para:` / `Mensaje:` | ✅ | `sale_details.card_from` / `card_to` / `card_message`. |
| `OBSERVACION ESPECIAL` | ✅ | `sale_details.special_notes`. |

## 5. Preguntas abiertas — decisiones de modelo de datos

No se resuelve ninguna por cuenta propia. Cada una bloquea que la tabla del panel iguale a la
del Excel en ese campo específico:

1. **Asesor y proveedor.** ¿Se agregan como columnas de texto libre en `orders` (simple, sin
   integridad referencial), o como tablas propias `asesores`/`proveedores` con FK (permite
   filtrar/reportar por asesor o proveedor de forma confiable, pero es más migración)? Si son
   tablas propias, ¿el usuario tiene ya una lista cerrada de asesores y proveedores actuales,
   o debe quedar abierto a agregar nuevos desde el panel?
2. **Correlativo humano de pedido** (`C0758`). ¿Se genera con un prefijo fijo + secuencia
   (`sequence` de Postgres), o el usuario quiere continuar la numeración donde la dejó el
   Excel (es decir, arrancar en un número específico, no en 1)?
3. **`TIPO DE ENVIO` con un tercer valor `envio` (nacional, distinto de `domicilio` local).**
   ¿Se amplía el `CHECK` de `orders.delivery_method`, y si es así, ese tercer tipo también
   necesita su propio `PROVEEDOR` (transportadora) y posiblemente su propio costo, distinto
   de `delivery_fee` que hoy solo lo calcula `quote_delivery` para domicilios locales?
4. **Descuento y recargo.** ¿Son porcentajes o valores fijos en pesos? ¿Se aplican por línea
   de producto o sobre el total del pedido? Esto determina si `orders.grand_total` (columna
   **generada**, no editable a mano) necesita cambiar su fórmula, lo cual afecta directamente
   `confirm_order` — la función más sensible del sistema compartido con el agente de
   WhatsApp. Un cambio aquí no es solo del panel.
5. **Celular del comprador para pedidos que no vienen de WhatsApp.** ¿Se agrega
   `sale_details.buyer_phone` explícito (independiente de `chat_id`), para no depender de que
   el pedido haya nacido en un chat?
6. **`POR DONDE HIZO EL PEDIDO` vs. `referral_source`.** ¿Son el mismo dato (y el Excel solo
   lo repite en dos columnas por costumbre), o el primero es "canal operativo de esta venta
   puntual" (ej. quién de logística la registró manualmente) y el segundo es "atribución de
   marketing"? La respuesta decide si hace falta un campo nuevo o si ya está cubierto.
7. **Nombre de zona de entrega** (`rango 4`). ¿Se agrega una columna `label` a
   `delivery_tariffs` (ej. "Rango 4"), y se calcula en el panel a partir del KM real del
   pedido, o el usuario prefiere que el panel simplemente muestre el KM sin la etiqueta?
8. **Comprobante de pago.** `payment_proofs` ya existe pero sin uso — ¿el panel debe permitir
   subir/ver el comprobante ahí mismo desde la vista de pedido (ampliando el alcance de esta
   spec), o es un ciclo aparte?
9. **`GÉNERO DE LA EXPERIENCIA`** — ¿confirma el usuario que es un duplicado de `OCASIÓN` en
   su propio Excel, o representa algo distinto que no se ha capturado?

### 5.1 Decisiones (2026-09-11)

**Asesor y proveedor — texto libre, no tablas propias, por ahora.** La artesana es quien
registra el proveedor; el llenado real de ambos campos eventualmente vivirá en un futuro
"dashboard de la artesana" (el tablero de producción que spec 002 §4 ya dejó fuera de este
MVP — sigue fuera de esta spec, es un ciclo aparte). Para este ciclo: dos columnas de texto
libre en `orders` (`advisor_name`, `supplier_name`), editables desde la vista de pedidos del
panel, mostradas vacías si nadie las ha llenado. Sin tabla `asesores`/`proveedores` con FK
todavía — se revisa si hace falta esa integridad más adelante, cuando haya volumen real que
lo justifique.

**Correlativo humano — letra + secuencia, arrancando desde cero en este ambiente.** El
negocio usa una letra que cambia por año más un número secuencial (de ahí `C0758`). No se
intenta continuar la numeración real del Excel (que iba en `C0758`+) porque este es un
ambiente de pruebas: la secuencia del panel arranca en `C0001`. El mecanismo concreto
(secuencia de Postgres + configuración de la letra vigente) se diseña en `plan.md`.

**Descuento y recargo — fuera de este ciclo.** Confirmado: no se modifica `grand_total` ni
`confirm_order` en esta spec. El panel sigue mostrando el valor a pagar actual, sin esas dos
columnas, hasta un ciclo aparte que diseñe ese cambio con el cuidado que amerita tocar la
función de pago compartida con el agente de WhatsApp.

**Comprobante de pago — fuera de este ciclo.** `payment_proofs` sigue sin UI en el panel.

**Huecos menores restantes — manejo simple, no bloqueante.** Siguiendo la instrucción del
usuario de avanzar con lo que ya existe y revisar el resto después, estos cuatro campos se
resuelven así para este ciclo, sin nueva columna:

- `CELULAR DEL COMPRADOR` → se muestra `orders.chat_id` cuando el pedido viene de WhatsApp
  (la mayoría hoy); vacío si no aplica. Sin columna nueva.
- `POR DONDE HIZO EL PEDIDO` → se muestra `sale_details.referral_source` como aproximación,
  sin resolver todavía si son conceptos distintos (pregunta 6 de §5 queda abierta para el
  usuario, no bloqueante).
- `ZONA DE ENTREGA` con nombre (`rango 4`) → se muestra el KM real (`orders.delivery_distance_km`)
  sin la etiqueta textual del tramo; agregar el nombre a `delivery_tariffs` queda para
  cuando el usuario lo confirme.
- `GÉNERO DE LA EXPERIENCIA` → se trata como el mismo dato que `OCASIÓN` (spec §4.6 ya
  documentó que en la muestra tienen el mismo valor); no se agrega columna nueva.
- `TIPO DE ENVIO` con el tercer valor `envío` (nacional) → el `CHECK` de `delivery_method`
  no se amplía en este ciclo; el panel refleja fielmente `domicilio`/`tienda`, sin opción de
  envío nacional todavía.

## 6. Rediseño visual — alcance y preguntas

El pedido es: identidad propia para `/admin` (ya tiene su propio root layout desde spec 002),
tema claro/oscuro con toggle, estética "high-tech" sin perder profesionalismo — más denso en
información que decorado, como ya establece la regla 5 de `.claude/agents/admin-panel.md`
("los tableros son de trabajo diario: densidad de información sobre decoración").

Antes de construir, `plan.md` debe cargar `ui-ux-pro-max` para la dirección de sistema visual
(paleta, tipografía, componentes) y `dataviz` para las gráficas del §7 — ambas exigidas por
`.claude/agents/admin-panel.md`. Esta spec no elige la paleta ni el estilo de componente por
su cuenta: eso se decide con el usuario en `plan.md`, apoyado en esas skills, no aquí.

Preguntas que si convienen resolverse antes de `plan.md`:

- ¿El toggle claro/oscuro debe recordar la preferencia del usuario (localStorage/cookie), o
  basta con seguir la preferencia del sistema operativo (`prefers-color-scheme`) sin
  selector manual?
- ¿"High-tech" apunta a algo concreto como referencia (algún panel/dashboard que le guste al
  usuario), o se interpreta libremente dentro de la regla de "profesional, no exagerado"?

## 7. KPIs y gráficas — alcance

A diferencia de la tabla operativa, este pilar tiene pocos huecos de datos: casi toda métrica
razonable de ventas ya es derivable de `orders`/`reservations`/`product_variants` reales. Se
listan aquí las métricas candidatas, sin comprometer todavía qué tipo de gráfica usa cada una
— eso lo decide `plan.md` con la skill `dataviz` cargada.

| Métrica | Derivable de |
|---|---|
| Ventas totales por periodo | `sum(grand_total) where status = 'pagado'`, filtrado por `confirmed_at` (ya establecido en spec 002 §4.1) |
| Pedidos por fase de cumplimiento | `orders.fulfillment_status` (ya construido en el MVP como tiles; se pediría como gráfica de barras/dona) |
| Productos más vendidos | `sum(reservations.qty) group by product_id`, join a `products.name` |
| Ventas por marca | `sum(grand_total) group by products.brand` vía `reservations → product_variants → products` |
| Tendencia de ventas en el tiempo | `sum(grand_total) group by date_trunc('day', confirmed_at)` |
| Métodos de pago | `count(*) group by payment_source` |
| Métodos de entrega | `count(*) group by delivery_method` |
| Stock bajo / próximo a agotarse | `product_variants` donde `stock_qty - reserved_qty` esté bajo un umbral — **el umbral no está definido en ningún lado** (pregunta menor, no bloqueante: se puede fijar un valor razonable en `plan.md` y dejarlo configurable) |

No se identifican huecos de modelo de datos bloqueantes para este pilar. La única decisión
pendiente es de alcance/priorización: cuáles de estas métricas entran en la primera versión
del dashboard vs. cuáles quedan para después — eso también se resuelve en `plan.md`.

## 8. Fuera de alcance de esta spec

- Resolver por cuenta propia cualquiera de las preguntas de §5 — todas requieren respuesta
  del usuario antes de `plan.md`.
- Cualquier migración a Supabase — ninguna se aplica desde este documento.
- Tocar `confirm_order` u otra función del agente de WhatsApp, aunque §5.4 identifique que
  descuento/recargo podría requerirlo eventualmente — eso se evalúa con cuidado en `plan.md`
  una vez el usuario decida si ese campo entra en este ciclo.
- Rediseñar el storefront público — esta spec es exclusiva de `/admin`.
