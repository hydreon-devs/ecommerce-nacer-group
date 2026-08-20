# Nacer Group — Ecommerce + Agente IA

> Documento maestro de contexto del proyecto. Fuente única de verdad para definir agentes, skills y arquitectura.
> **Versión 2.1** · 19 de agosto de 2026 · Hydreon Studio
>
> Los bloques marcados `⬜ PENDIENTE` requieren información del cliente. Nada fuera de esos bloques fue inferido.

---

## Tabla de contenido

1. [Visión del negocio](#1-visión-del-negocio)
2. [Catálogo de productos](#2-catálogo-de-productos)
3. [Pagos](#3-pagos--mercado-pago)
4. [Panel de administración](#4-panel-de-administración)
5. [Modelo de datos](#5-modelo-de-datos)
6. [El agente de WhatsApp](#6-el-agente-de-whatsapp)
7. [Diseño y marca](#7-diseño-y-marca)
8. [Stack técnico](#8-stack-técnico)
9. [Estrategia de testing](#9-estrategia-de-testing)
10. [Fases y prioridades](#10-fases-y-prioridades)
11. [Bloqueantes](#11-bloqueantes)
12. [Mapa sugerido de agentes y skills](#12-mapa-sugerido-de-agentes-y-skills)

---

## 1. VISIÓN DEL NEGOCIO

### Qué se vende

Nacer Group agrupa tres marcas con un hilo conductor común: **naturaleza, transformación y momentos significativos**. El catálogo **no es solo producto físico** — mezcla bienes, experiencias y servicios agendables.

| Marca | Categorías | Naturaleza | En el sitio (v1) |
|---|---|---|---|
| **Crisálidas y Mariposas** | Experiencia, Artesanía, Detalle | Liberación de mariposas (individual y familiar), cerámica artesanal, detalles de acompañamiento | **Vende** |
| **Jagua** | Artesanía, Papelería, Regalo empresarial | Escultura en papel, tarjetería artesanal, kits corporativos | **Vende** |
| **Florea** | Colmena, Taller, Kit educativo | Meliponicultura — abejas sin aguijón, talleres, material educativo | **No vende — enlace externo** |

> **Alcance de Florea en la v1 (decisión del cliente, 19/08/2026):** Florea no comercializa
> en el sitio. Tendrá una sección informativa de marca que termina en un **enlace al sitio
> externo** que la marca ya opera. No se cargan sus productos ni existe camino de compra
> hacia ella. La integración de venta queda como fase futura sin fecha.
>
> Se modela con `marcas.vende_en_sitio = false` y `marcas.url_externa`, y sus categorías se
> conservan declaradas en el enum. Activarla después será carga de datos, no migración.

**Rango de precio observado:** $35.000 – $480.000 COP. Ticket medio-alto para el sector artesanal.
El tope de $480.000 corresponde a la colmena de Florea; **el rango vendible en la v1 llega hasta ≈$240.000** (experiencia familiar de Crisálidas).

**Implicación crítica de diseño:** los ítems tipo *Experiencia* no se despachan — se **agendan**. El modelo de datos y la máquina de estados deben soportar ambos caminos. (*Taller* y *Colmena* eran de Florea y salen de la v1, pero el flujo de agenda sigue siendo necesario por las experiencias de liberación de mariposas de Crisálidas.)

### Cliente final

- **B2C predominante**: consumidor final, venta principalmente por WhatsApp.
- **B2B presente y explícito**: la categoría *Regalo empresarial* (Jagua) y la ocasión *empresas* confirman un segmento corporativo.
- Existe un subconjunto que **solicita factura a su nombre** con documento de identificación.
- Operación: **Colombia**, con base en Medellín.

### Ocasiones — la dimensión semántica del catálogo

El catálogo está etiquetado por ocasión, no solo por categoría. Esta es **la dimensión principal de recuperación para el agente**:

`celebración` · `homenaje` · `regalo` · `familia` · `acompañar` · `recordar` · `condolencias` · `conservación` · `educación` · `naturaleza` · `experiencia` · `decoración` · `agradecer` · `celebrar` · `empresas`

> La presencia de `condolencias` y `acompañar` confirma que la regla de escalamiento a humano definida en la propuesta comercial no es teórica: hay producto explícitamente diseñado para momentos de duelo.

### Diferenciadores frente a la competencia

⬜ **PENDIENTE** — No se han definido diferenciadores competitivos del negocio frente a otros oferentes del mercado.

---

## 2. CATÁLOGO DE PRODUCTOS

### Origen de los datos

- **Producción**: base de datos propia en **Supabase (PostgreSQL)**.
- **Prototipo actual**: Google Sheets (hoja `Productos`), usado para pruebas del agente en n8n. **No es la fuente de producción.**
- **Carga inicial**: importación desde el archivo Excel entregado.
- **Descartado**: consultar Odoo por API (proveedor externo tarifa el consumo; Odoo se retira del ecosistema).
- **Fase posterior**: evaluar Aliaddo como maestro de inventario (módulo contratado, sin uso).

### Estructura confirmada

| Campo | Tipo | Uso |
|---|---|---|
| `sku` | texto | Identificador. Formato `XX-000` con prefijo por marca (CM, FL, JA) |
| `nombre` | texto | Nombre comercial mostrado al cliente |
| `nombre_busqueda` | texto | Normalizado sin tildes, para coincidencia exacta |
| `alias_busqueda` | texto | Sinónimos separados por coma, para búsqueda flexible |
| `marca` | enum | Crisálidas y Mariposas · Florea · Jagua |
| `categoria` | enum | Experiencia · Artesanía · Detalle · Colmena · Taller · Kit educativo · Papelería · Regalo empresarial |
| `ocasiones` | multi-valor | Etiquetas separadas por coma |
| `descripcion_corta` | texto | Descripción para el agente y la ficha |
| `precio_cop` | entero | Precio en pesos, sin decimales |
| `disponibilidad` | enum | Disponible · Bajo pedido · Agotado |
| `stock` | entero | Unidades. **Puede ser 0 y aun así ser vendible** |
| `tiempo_preparacion` | texto | 1 a 10 días según producto |
| `entrega` | enum | Medellín y área metropolitana · Entrega coordinada · Fecha coordinada |
| `imagen_placeholder` | url | Sustituir por imágenes reales |
| `activo` | booleano | Parte del filtro base del catálogo |

> **Filtro base actualizado:** toda consulta de catálogo — web y herramienta del agente —
> usa `activo = true AND marca.vende_en_sitio = true`. El segundo término es lo que
> mantiene a Florea fuera del catálogo vendible.

### Regla crítica: disponibilidad ≠ stock

Este es el punto más importante del modelo de catálogo y rompe el patrón estándar de ecommerce:

```
Disponible   → stock > 0        → venta inmediata, descuenta stock
Bajo pedido  → stock = 0        → SÍ se vende, se produce con tiempo_preparacion
Agotado      → stock = 0        → NO se vende
```

Un motor de inventario convencional trataría `stock = 0` como no vendible y **bloquearía las ventas de mayor valor del catálogo** (la colmena de $480.000 y la experiencia familiar de $240.000 están ambas en *Bajo pedido*).

### Modalidades de entrega

| Modalidad | Aplica a | Implicación |
|---|---|---|
| Medellín y área metropolitana | Producto físico | Requiere dirección y cálculo de domicilio |
| Entrega coordinada | Kit / regalo empresarial (Jagua) | Requiere contacto posterior, sin tarifa automática |
| Fecha coordinada | ⬜ **Ver decisión abierta** | Requiere **agenda**, no dirección |

> ⬜ **DECISIÓN ABIERTA:** esta modalidad estaba asignada únicamente a *Taller*, que era de
> Florea. Falta confirmar si las **Experiencias de Crisálidas** la usan. Mientras no se
> resuelva, `requiere_agenda` se define **por producto** para no cerrar ninguna de las dos
> opciones, y el checkout soporta el camino agendado desde el día uno.

### Pendientes del catálogo

- ⬜ **PENDIENTE** — Número real de referencias activas (el archivo entregado es demo con 10 filas).
- ⬜ **PENDIENTE** — Existencia de variantes (talla, color, tamaño). No aparecen en el demo.
- ⬜ **PENDIENTE** — Piezas únicas: qué referencias tienen tirada de 1. Afecta la política de reserva.
- ⬜ **PENDIENTE** — Imágenes reales: cantidad por producto, formato, resolución.
- ⬜ **PENDIENTE** — Si los precios incluyen IVA y si todas las referencias tienen la misma tarifa.
- ⬜ **PENDIENTE** — Combos, kits o descuentos por cantidad.
- ⬜ **PENDIENTE** — Responsable y frecuencia de actualización del catálogo.

> **Nota de normalización:** la marca aparece como `Florea` en el catálogo y como `florea` en la presentación comercial. Definir la grafía oficial antes de la carga.

---

## 3. PAGOS — MERCADO PAGO

### Modalidad

**Checkout Pro** mediante la **API de preferencias**. Se crea la preferencia, Mercado Pago devuelve el `init_point`, y ese enlace se envía por WhatsApp o se usa en el checkout web.

### Métodos de pago

Habilitar todos los que ofrece Mercado Pago Colombia: **tarjeta de crédito y débito, PSE, y efectivo** (Efecty, Baloto y similares).

Cada método tiene un comportamiento técnico distinto y esto **sí afecta la arquitectura**:

| Método | Comportamiento | Tiempo hasta confirmación |
|---|---|---|
| Tarjeta | Síncrono, aprobación inmediata | Segundos |
| PSE | Redirección al banco, asíncrono | Minutos |
| Efectivo | Genera cupón, el cliente paga después en punto físico | **Horas o días** |

> ⚠️ **Conflicto de diseño a resolver:** la política de reserva de stock de 30–60 minutos es incompatible con el pago en efectivo, que puede tardar días. Opciones: (a) no reservar stock en pagos en efectivo, (b) reservar por el plazo de vencimiento del cupón, (c) deshabilitar efectivo en referencias de stock limitado. **Decisión pendiente.**

### Tarifas vigentes (Colombia)

| Acreditación | Comisión |
|---|---|
| Inmediata | 3,29% + $800 + IVA |
| 7 días | 2,99% + $800 + IVA |
| 14 días | 2,79% + $800 + IVA |

El componente fijo de $800 pesa fuerte en el ticket bajo: sobre la tarjeta artesanal de $35.000 equivale a 2,3 puntos adicionales.

### Reglas de confirmación de pago

1. Mercado Pago notifica a un **webhook en n8n**.
2. **Validar la firma `x-signature`** del webhook.
3. **Nunca confiar en el cuerpo del webhook ni en la página de retorno.** Consultar la API de Mercado Pago para verificar el estado real antes de marcar el pedido como pagado.
4. **Idempotencia obligatoria**: enviar `external_reference` con el ID de pedido y verificar si ya fue procesado. Mercado Pago reintenta las notificaciones.

### Pendientes

- ⬜ **PENDIENTE (bloqueante)** — Titularidad de la cuenta a nombre de Nacer Group.
- ⬜ **PENDIENTE** — Plazo de acreditación configurado.
- ⬜ **PENDIENTE** — Otros medios fuera de Mercado Pago (Nequi, transferencia, contra entrega) y su proporción.
- ⬜ **PENDIENTE** — Pagos parciales, anticipos y abonos para pedidos por encargo.
- ⬜ **PENDIENTE** — Política de devoluciones y reembolsos.

---

## 4. PANEL DE ADMINISTRACIÓN

### Roles

| Rol | Tablero | Restricciones |
|---|---|---|
| `admin` | Todos | Acceso completo |
| `ventas` | Ventas y pedidos | Ve clientes y márgenes |
| `inventario` | Inventario | Sin acceso a datos financieros de cliente |
| `produccion` | Producción | **Sin acceso a márgenes ni datos de contacto del cliente** |

Autenticación mediante **Supabase Auth + Row Level Security**.

⬜ **PENDIENTE** — Número de usuarios por rol y nombres de las personas responsables.

### Tablero 1 — Ventas y pedidos
- Total de pedidos y ventas del periodo
- Productos más vendidos por marca
- Estado de cada pedido y su pago
- Comportamiento de clientes recurrentes
- Embudo de conversión de conversaciones a venta

### Tablero 2 — Inventario
- Existencias por producto y por marca
- Actualización directa desde el tablero
- Alertas sobre referencias comprometidas
- Productos sin movimiento
- Gestión de la disponibilidad (Disponible / Bajo pedido / Agotado)

### Tablero 3 — Producción
- Pedidos pendientes por fabricar, con su `tiempo_preparacion`
- Prioridad por fecha comprometida de entrega
- Marcado de avance por pieza
- Historial de lo producido
- **Agenda de experiencias y talleres** con fecha coordinada

### Vista consolidada exportable
Equivalente al archivo de Excel que se lleva hoy, generada automáticamente, para los procesos posteriores de contabilidad y validación de facturas.

### Notificaciones

| Evento | Canal | Destinatario | Estado |
|---|---|---|---|
| Confirmación de pedido | WhatsApp | Cliente | Confirmado |
| Confirmación de pago | WhatsApp | Cliente | Confirmado |
| Recordatorio de compra abandonada | WhatsApp | Cliente | Confirmado |
| Ofertas y reactivación | WhatsApp | Cliente | Confirmado |
| Nuevo pedido pagado | ⬜ PENDIENTE | Equipo | Sin definir |
| Stock bajo | ⬜ PENDIENTE | Inventario | Sin definir |
| Pago fallido | ⬜ PENDIENTE | Ventas | Sin definir |
| Correo electrónico | ⬜ PENDIENTE | — | Sin definir si se requiere |

---

## 5. MODELO DE DATOS

### Máquina de estados

Se separan **tres dimensiones independientes**. Un solo campo de estado no alcanza, porque un pedido puede estar pagado y sin producir, o producido y sin facturar.

#### `estado_pago`

| Estado | Descripción |
|---|---|
| `pendiente` | Enlace generado, sin pagar |
| `en_proceso` | PSE o efectivo iniciado, sin acreditar |
| `pagado` | Verificado contra la API de Mercado Pago |
| `fallido` | Rechazado por la pasarela |
| `expirado` | El enlace o cupón venció |
| `reembolsado` | Devolución total |
| `reembolsado_parcial` | Devolución parcial |

#### `estado_pedido`

| Estado | Descripción | Aplica a |
|---|---|---|
| `borrador` | Carrito o conversación en curso | Todos |
| `confirmado` | Pago acreditado, pendiente de procesar | Todos |
| `en_preparacion` | En fabricación | Bajo pedido y con `tiempo_preparacion` |
| `agendado` | Fecha coordinada con el cliente | Experiencias y talleres |
| `listo` | Fabricado, pendiente de despacho | Producto físico |
| `despachado` | Entregado a transportadora o mensajero | Producto físico |
| `entregado` | Recibido por el cliente | Producto físico |
| `realizado` | Experiencia o taller ejecutado | Experiencias y talleres |
| `cancelado` | Anulado antes de completarse | Todos |
| `devuelto` | Retornado por el cliente | Producto físico |

#### `estado_facturacion`

| Estado | Descripción |
|---|---|
| `no_requiere` | Cliente no solicitó factura a su nombre |
| `pendiente` | Requiere emisión |
| `emitida` | Facturada en Aliaddo, con CUFE registrado |
| `fallida` | Error en la emisión, requiere gestión manual |

> `estado_facturacion` se implementa desde el MVP aunque la emisión sea manual. Evita migración de datos cuando entre la fase 2.

### Entidades principales

```
marcas            id · nombre · slug · logo · color_primario · url_externa ·
                  vende_en_sitio · activo
productos         id · sku · nombre · nombre_busqueda · alias_busqueda · marca_id ·
                  categoria · descripcion_corta · descripcion_larga · precio_cop ·
                  disponibilidad · stock · tiempo_preparacion_dias · modalidad_entrega ·
                  es_pieza_unica · requiere_agenda · activo
producto_ocasion  producto_id · ocasion_id            (relación N:N)
ocasiones         id · nombre · slug
imagenes          id · producto_id · url · orden · alt
clientes          id · telefono · nombre · email · documento_tipo · documento_numero ·
                  direccion · ciudad · requiere_factura · origen · creado_en
pedidos           id · numero · cliente_id · canal · estado_pago · estado_pedido ·
                  estado_facturacion · subtotal · valor_envio · total ·
                  fecha_agendada · fecha_comprometida · creado_en
pedido_items      id · pedido_id · producto_id · cantidad · precio_unitario · subtotal
pagos             id · pedido_id · mp_payment_id · mp_preference_id · external_reference ·
                  metodo · monto · estado · procesado_en · payload_crudo
reservas_stock    id · producto_id · pedido_id · cantidad · expira_en · liberada
conversaciones    id · cliente_id · canal · estado · escalada_a_humano · creado_en
mensajes          id · conversacion_id · rol · contenido · creado_en
zonas_envio       id · nombre · ciudad · valor · tiempo_estimado
```

**Notas de modelado:**
- `canal` en `pedidos` distingue `whatsapp` de `web`. Ambos comparten el mismo flujo desde la generación del cobro.
- `reservas_stock` con `expira_en` implementa el bloqueo temporal. Requiere un job de liberación.
- `payload_crudo` en `pagos` guarda la respuesta completa de Mercado Pago para auditoría y depuración.
- `requiere_agenda` separa experiencias y talleres del flujo de despacho.

---

## 6. EL AGENTE DE WHATSAPP

### Reglas de negocio

1. Responder amablemente con información de la marca correspondiente
2. Diagnosticar la necesidad del cliente con datos iniciales
3. Consultar el catálogo y ofrecer productos alineados a la ocasión
4. Capturar información del cliente para el pedido
5. Calcular el valor del envío según la dirección
6. **Preguntar si requiere factura a su nombre** y capturar documento, nombre y correo
7. Realizar resumen de la compra
8. Enviar enlace de pago

### Herramienta `buscar_productos`

Especificación derivada del archivo entregado:

| Parámetro | Valor |
|---|---|
| Descripción para el agente | Busca productos reales del catálogo por nombre, alias, marca, categoría u ocasión. Usar solo cuando el usuario pregunte por productos, precios, disponibilidad o recomendaciones. |
| Campos devueltos | `sku`, `nombre`, `marca`, `categoria`, `descripcion_corta`, `precio_cop`, `disponibilidad`, `stock`, `tiempo_preparacion`, `entrega` |
| Máximo de resultados | 5 |
| Filtro base | `activo = true` |
| Coincidencia exacta prioritaria | `sku` o `nombre_busqueda` |
| Coincidencia flexible | `alias_busqueda`, `marca`, `categoria`, `ocasiones` |

### Restricciones del agente

- **Nunca inventar** precios, stock ni disponibilidad. Si no hay coincidencias, pedir reformulación o transferir a una persona.
- Formato de respuesta: `Nombre — $precio COP — disponibilidad`. Máximo **3 opciones** y una pregunta breve para continuar.
- Memoria: conservar solo las **últimas 4 a 6 interacciones** por conversación.
- Nunca comprometer disponibilidad que no pueda verificar. Ante duda, responder que confirmará.

### Escalamiento a humano

Transferir con resumen completo de la conversación cuando se detecte:

- **Condolencias** — requiere empatía humana
- **Reclamos** — requiere resolución
- **Envíos fuera de la ciudad** — logística especial
- **Clientes listos para cerrar de alto valor** — ⬜ **PENDIENTE definir el umbral en COP.** El ejemplo original (la colmena de $480.000) era de Florea y sale de la v1. El techo vendible actual es la experiencia familiar de $240.000. El umbral debe ser numérico, no un producto concreto.
- **Solicitudes de agenda** para talleres y experiencias con fecha coordinada

### Modelo de lenguaje

**Recomendación: GPT-5.6 Luna** (`$0.20 / $1.20` por millón de tokens).

Es el nivel económico de la generación más reciente de OpenAI. El 30 de julio de 2026 recibió un recorte de precio del 80%, dejándolo al mismo costo de entrada que GPT-5.4 Nano pero con arquitectura de una generación posterior. Comparte el contexto de 1,05M tokens de toda la familia GPT-5.6.

**Por qué es suficiente para este caso:** la tarea no es razonamiento complejo. Es seguir instrucciones, invocar una herramienta de búsqueda, no alucinar precios y capturar datos. Eso lo resuelve un modelo económico. Lo que sí necesita es fiabilidad en tool calling, y ahí la generación importa más que el tamaño.

**Estimación de costo mensual:**

```
Por turno:   ~2.200 tokens en caché  +  ~800 frescos  +  ~250 de salida
Con caché al 90% de descuento:       ≈ $0,0005 USD por turno
Conversación de 12 turnos:            ≈ $0,006 USD
1.000 conversaciones al mes:          ≈ $6 USD    ≈ $19.000 COP
3.000 conversaciones al mes:          ≈ $18 USD   ≈ $56.000 COP
```

> **Corrección al estimado anterior:** en el comparativo de costos se había proyectado el modelo de IA entre $80.000 y $350.000 mensuales, calculado sobre supuestos más conservadores y precios anteriores al recorte de julio. Con GPT-5.6 Luna y caché de prompt activo, el rango realista es **$30.000 a $150.000 COP**, incluso con crecimiento. Actualizar el comparativo.

**Palancas de costo obligatorias:**
- **Caché de prompt**: mantener el system prompt y las definiciones de herramientas en un prefijo estable. Se factura al 10% del precio de entrada.
- **Ventana de memoria corta**: 4 a 6 interacciones, ya definido arriba.
- **No inyectar el catálogo completo** en el prompt. Solo los resultados de la herramienta.

**Escalamiento de modelo:** si Luna falla en tool calling o en seguimiento de instrucciones durante las pruebas, el siguiente escalón es **GPT-5.4 Mini** (`$0,75 / $4,50`) y luego **GPT-5.6 Terra** (`$2 / $12`). Definir el modelo por variable de entorno para poder cambiarlo sin desplegar.

---

## 7. DISEÑO Y MARCA

### Identidad — Hydreon Studio (agencia)

| Color | Hex | Uso |
|---|---|---|
| Naranja | `#EF850B` | Acento principal |
| Naranja profundo | `#CF5C1D` | Degradados |
| Púrpura | `#6B1C7A` | Acento secundario |
| Negro | `#0A090D` | Fondo oscuro |

### Identidad — Nacer Group

⬜ **PENDIENTE — COMPLETAR**

```
Marca general Nacer Group
  Color primario:        #______
  Color secundario:      #______
  Color de acento:       #______
  Tipografía titulares:  ______________
  Tipografía cuerpo:     ______________
  Logo:                  ⬜ archivo pendiente

Crisálidas y Mariposas
  Color primario:        #______
  Color secundario:      #______
  Logo:                  ⬜ archivo pendiente

Florea   (v1: solo sección de enlace externo — no requiere paleta completa)
  Logo:                  ⬜ archivo pendiente
  URL del sitio externo: ⬜ pendiente

Jagua
  Color primario:        #______
  Color secundario:      #______
  Logo:                  ⬜ archivo pendiente
```

**Decisión pendiente:** ⬜ definir si **Crisálidas y Jagua** conservan identidad propia dentro del sitio unificado (paleta por sección) o si se unifican bajo una sola identidad de Nacer Group con diferenciación sutil. Florea queda fuera de esta decisión en la v1: solo aporta logo y enlace.

### Referencias visuales

⬜ **PENDIENTE** — Sitios de referencia que le gusten al cliente.

### Tono de marca

⬜ **PENDIENTE** — Sin definir formalmente. Único insumo disponible: la propuesta comercial menciona responder *amablemente* y que la solución debe *fluir con la naturaleza de las marcas*.

> Consideración: el catálogo incluye producto para condolencias y acompañamiento en duelo. El tono debe poder sostener registros muy distintos — celebración y luto — sin sonar inadecuado en ninguno.

### Animaciones — Framer Motion

**Confirmado como parte del stack.** Zonas de aplicación propuestas:

| Zona | Animación | Prioridad |
|---|---|---|
| Hero de portada | Entrada escalonada de texto e imagen | Alta |
| Tarjetas de producto | Elevación y escala sutil en hover | Alta |
| Transiciones de página | Fundido con desplazamiento corto | Media |
| Carrito | Panel lateral con deslizamiento + confirmación al agregar | Alta |
| Filtros de catálogo | Reordenamiento animado de la grilla | Media |
| Galería de producto | Transición entre imágenes | Media |
| Estados de carga | Skeletons con pulso | Alta |
| Checkout | Avance entre pasos | Media |

**Reglas no negociables:**
- Respetar `prefers-reduced-motion` en todas las animaciones.
- No animar contenido sobre la línea de flotación de forma que retrase el LCP.
- Duraciones entre 150 y 400 ms. Nada más lento en interacciones.
- Las animaciones no deben bloquear la interacción: el usuario puede hacer clic durante la transición.

---

## 8. STACK TÉCNICO

| Capa | Herramienta | Estado |
|---|---|---|
| Frontend | Next.js (App Router) | Confirmado |
| Estilos | ⬜ PENDIENTE (asumido Tailwind, sin confirmar) | Por confirmar |
| Animaciones | Framer Motion | Confirmado |
| Hosting frontend | Railway | Confirmado |
| Orquestación y agente | n8n Community autoalojado | Confirmado |
| Hosting n8n | Railway plan Pro, región US East | Confirmado |
| Caché y colas | Redis en Railway | Confirmado |
| Base de datos | Supabase (PostgreSQL) | Confirmado |
| Autenticación | Supabase Auth + RLS | Confirmado |
| APIs de datos | Supabase autogeneradas | Confirmado |
| Almacenamiento de imágenes | Supabase Storage o Cloudflare R2 | Por decidir |
| Mensajería | WhatsApp Cloud API (Meta oficial) | Confirmado |
| Pasarela | Mercado Pago Checkout Pro | Confirmado |
| Modelo de lenguaje | OpenAI GPT-5.6 Luna | Recomendado |
| Facturación | Aliaddo (fase 2) | Fuera del MVP |

### Descartados explícitamente

Kubernetes · VPS autoadministrado · Vercel · Odoo · OpenWA y librerías no oficiales de WhatsApp · Siigo o cualquier ERP adicional · Construir un ERP propio · CMS externo (Sanity, Strapi)

### Configuración crítica de n8n

```bash
N8N_ENCRYPTION_KEY=<fijar explícitamente y respaldar fuera de la plataforma>
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=336   # 14 días
```

- La base de datos de n8n debe estar **separada** de la base de datos del negocio.
- Desactivar el *app sleeping* en el servicio de n8n: un webhook de WhatsApp con arranque en frío degrada la promesa de respuesta.
- Configurar límite de gasto duro en Railway con alertas al 50% y 75%.

### Requisitos no funcionales

- **SEO** — ⬜ PENDIENTE. Relevante para producto artesanal con búsqueda por ocasión.
- **Rendimiento** — ⬜ PENDIENTE definir objetivos. Recomendado: LCP < 2,5 s en 4G.
- **Multi-idioma** — ⬜ PENDIENTE. Se asume solo español.
- **Accesibilidad** — ⬜ PENDIENTE definir nivel objetivo.
- **Datos personales** — Aplica la Ley 1581 de 2012. Requiere política de tratamiento publicada, autorización del titular capturada en el flujo (web y WhatsApp), y evaluación de inscripción en el RNBD ante la SIC. ⬜ PENDIENTE el estado actual de cumplimiento del cliente.
- **Región** — US East, por latencia (~45 ms desde Medellín).

---

## 9. ESTRATEGIA DE TESTING

Enfoque proporcional al proyecto: **no se busca cobertura amplia, se busca cubrir lo que cuesta dinero si falla.**

### Prioridad por riesgo

| Área | Riesgo si falla | Prioridad |
|---|---|---|
| Webhook de pago e idempotencia | Pedidos duplicados o ventas cobradas sin registrar | **Crítica** |
| Reserva y liberación de stock | Sobreventa de referencias limitadas | **Crítica** |
| Cálculo de precio y envío | Vender por debajo del costo | **Crítica** |
| Transiciones de estado del pedido | Pedidos perdidos entre tableros | Alta |
| Respuestas del agente | Alucinación de precio o disponibilidad | Alta |
| Control de acceso por rol | Producción ve datos de cliente | Alta |
| Interfaz visual | Molestia, no pérdida | Media |

### Capas

**1. Vitest — lógica de negocio**
Sin base de datos, rápido, se ejecuta en cada commit.
- Cálculo de subtotal, envío y total
- Máquina de transiciones de estado (qué transición es válida y cuál no)
- Idempotencia del procesamiento de pagos
- Lógica de reserva y expiración de stock
- Regla de disponibilidad (`Disponible` / `Bajo pedido` / `Agotado`)
- Normalización de búsqueda (tildes, alias)

**2. Playwright — flujos extremo a extremo**
Cinco recorridos, no más:
1. Navegar catálogo → filtrar por ocasión → ficha de producto → agregar al carrito → checkout → pago en sandbox → confirmación
2. Producto *Bajo pedido*: verificar que se puede comprar con `stock = 0`
3. Producto *Agotado*: verificar que no se puede comprar
4. Acceso por rol: cada perfil ve su tablero y **no** ve los ajenos
5. Actualización de stock desde el tablero de inventario

**3. Pruebas de integración con Mercado Pago**
- Usar el **sandbox de Mercado Pago** con las tarjetas de prueba oficiales.
- Probar los tres métodos: tarjeta aprobada, tarjeta rechazada, PSE.
- Simular reintento de webhook y verificar que no se duplica el pedido.
- Simular webhook con firma inválida y verificar que se rechaza.

**4. Evaluación del agente — la capa que más se olvida**
n8n no tiene framework de pruebas nativo. La alternativa es un **conjunto de conversaciones de referencia**:
- 30 a 40 conversaciones tipo, con resultado esperado documentado.
- Cubrir: consulta de precio, búsqueda por ocasión, producto inexistente, producto agotado, solicitud de condolencias (debe escalar), cliente que pide factura, cliente que no la pide, intento de negociar precio, pregunta fuera de alcance.
- Ejecutar el conjunto completo **antes de cada cambio del prompt del sistema**.
- Verificar específicamente que **nunca inventa precio, stock ni disponibilidad**.
- Registrar el resultado en una hoja de seguimiento. Es la única forma de detectar regresiones al ajustar el prompt.

**5. Prueba de humo en producción**
Tras cada despliegue: un pedido real de bajo valor, pagado y verificado extremo a extremo.

### Lo que no se prueba en el MVP
Cobertura de componentes visuales, pruebas de regresión visual, pruebas de carga. No lo justifica el volumen esperado ni el cronograma.

---

## 10. FASES Y PRIORIDADES

### MVP — v1 (9 a 10 semanas)

- Sitio unificado para las tres marcas
- Catálogo en línea con filtro por marca, categoría y **ocasión**
- Carrito y checkout con Mercado Pago
- Soporte para las tres modalidades de entrega (domicilio, coordinada, agendada)
- Agente de IA en WhatsApp operando 24/7, con las 8 reglas de negocio
- Escalamiento a humano en los 5 casos definidos
- Base de datos de clientes, pedidos y conversaciones
- Tres tableros de gestión con acceso por rol
- Vista consolidada exportable
- Captura de datos de facturación en la conversación
- Capacitación y 15 días de estabilización

### Fuera del MVP

| Elemento | Fase |
|---|---|
| Emisión automática de factura vía API de Aliaddo | Fase 2 |
| Generación automática de guías de envío | Fase 3 |
| Costeo de producción por pieza | Fase 4 |
| Portal de cliente con cuentas e historial | Sin fecha |
| Órdenes de compra a proveedores | Sin fecha |
| Migración contable o cambio de proveedor DIAN | Descartado |
| Revisión de herramientas con datos reales | Mes 4 |

---

## 11. BLOQUEANTES

| # | Punto | Depende de | Impacto |
|---|---|---|---|
| 1 | Titularidad de la cuenta de Mercado Pago | Cliente | No se puede integrar el cobro |
| 2 | Verificación de Meta Business | Trámite con Meta | No hay canal de WhatsApp |
| 3 | Catálogo real completo con imágenes | Cliente | No hay contenido que publicar |
| 4 | Identidad visual de Crisálidas y Jagua | Cliente | No se puede iniciar el diseño. Florea solo requiere **logo y URL** para la sección de enlace, no paleta completa |
| 5 | Credenciales de la API de Aliaddo | Cliente / Aliaddo | Condiciona la fase 2 |
| 6 | Fecha de renovación anual de Odoo | Cliente | Define el plazo de lanzamiento |
| 7 | Tabla de zonas y tarifas de envío | Cliente | El agente no puede cotizar domicilio |
| 8 | Política de reserva para pagos en efectivo | Decisión conjunta | Riesgo de sobreventa |
| 9 | Titularidad del dominio | Cliente | No se puede publicar |

---

## 12. MAPA SUGERIDO DE AGENTES Y SKILLS

Propuesta de división para Claude Code, derivada del alcance anterior.

**Estado: implementado.** Los archivos viven en `.claude/` y `CLAUDE.md`.

El principio de división: las **skills** guardan las reglas que deben aplicarse igual sin
importar quién escriba el código; los **agentes** son unidades de trabajo que las cargan. Así
"disponibilidad ≠ stock" se escribe una sola vez y no depende de que el agente correcto esté
activo.

### Skills del proyecto

| Skill | Archivo | Contenido |
|---|---|---|
| `nacer-dominio` | `.claude/skills/nacer-dominio/SKILL.md` | Marcas, disponibilidad≠stock, máquina de tres estados, reservas, entregas, ocasiones, esquema, roles/RLS |
| `nacer-pagos` | `.claude/skills/nacer-pagos/SKILL.md` | Checkout Pro, `x-signature`, idempotencia, métodos asíncronos, tarifas, sandbox |
| `nacer-motion` | `.claude/skills/nacer-motion/SKILL.md` | Zonas de animación, `prefers-reduced-motion`, 150–400 ms, LCP y CLS |

Se apoyan en las skills instaladas `ui-ux-pro-max` (sistema visual) y `dataviz` (gráficas).

### Agentes

| Agente | Modelo | Responsabilidad | Skills que carga |
|---|---|---|---|
| **data-model** | opus | Esquema Supabase, migraciones, RLS por rol, tabla de transiciones válidas | `nacer-dominio` |
| **catalog** | sonnet | Importación del Excel, normalización de búsqueda, disponibilidad, reservas | `nacer-dominio` |
| **payments** | opus | Preferencias, webhook, firma, idempotencia, conciliación | `nacer-pagos`, `nacer-dominio` |
| **storefront** | sonnet | Catálogo, filtros por ocasión, ficha, carrito, checkout, sección de Florea | `ui-ux-pro-max`, `nacer-motion`, `nacer-dominio` |
| **admin-panel** | sonnet | Tres tableros, auth por rol, vista exportable | `ui-ux-pro-max`, `dataviz`, `nacer-dominio` |
| **agent-flows** | opus | Flujos n8n, prompt del sistema, `buscar_productos`, escalamiento | `nacer-dominio` |
| **qa** | opus | Vitest, Playwright, sandbox de Mercado Pago, conversaciones de referencia | `nacer-dominio`, `nacer-pagos` |
| **catalog-sync** | — | Sincronización con Aliaddo | **Fase 2, no creado** |

Criterio de modelo: `opus` donde un error cuesta dinero o corrompe datos (esquema, cobro,
pruebas, conversación con el cliente); `sonnet` en el trabajo de interfaz y de carga de datos.

**Notas de secuencia:**
- `data-model` bloquea a todos los demás. Empezar por ahí.
- `payments` y `catalog` pueden avanzar en paralelo una vez exista el esquema.
- `storefront` y `admin-panel` requieren la identidad visual resuelta (bloqueante 4).
- `agent-flows` puede prototiparse contra Google Sheets mientras Supabase se termina, tal como está planteado en el archivo de catálogo entregado.

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 19/08/2026 | Extracción inicial del diagnóstico |
| 2.0 | 19/08/2026 | Incorpora catálogo real, modelo de datos, máquina de estados, modelo de IA, estrategia de testing y zonas de animación |
| 2.1 | 19/08/2026 | Florea sale del alcance de venta en la v1 (solo enlace externo). Agrega `vende_en_sitio` y `url_externa`, actualiza filtro base, modalidades de entrega, escalamiento por valor y bloqueante 4 |
