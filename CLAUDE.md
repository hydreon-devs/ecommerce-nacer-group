# Nacer Group — Ecommerce + Agente IA

Documento maestro de contexto: `README.md`. Este archivo contiene solo lo que no se
puede violar nunca.

## Marcas — estado en el sitio

| Marca | En el sitio |
|---|---|
| Crisálidas y Mariposas | **Vende.** Catálogo, carrito, checkout. |
| Jagua | **Vende.** Catálogo, carrito, checkout. |
| Florea | **NO vende.** Solo sección informativa con enlace al sitio externo. |

Florea no tiene productos, precios, stock ni carrito en el sitio. Es una sección de
marca con un enlace saliente. La integración de venta es futura y sin fecha: se
modela desde ya con `vende_en_sitio` para que activarla sea un cambio de dato, no una
migración.

**El filtro base de todo el catálogo es `activo = true AND marca.vende_en_sitio = true`.**

## Invariantes que no se negocian

1. **`disponibilidad` manda sobre `stock`.** `Bajo pedido` con `stock = 0` **sí se vende**.
   Tratar `stock = 0` como no vendible bloquea las ventas de mayor valor del catálogo.
2. **Nunca marcar un pedido como pagado desde el cuerpo del webhook** ni desde la página
   de retorno. Validar `x-signature`, consultar la API de Mercado Pago, y aplicar
   idempotencia por `external_reference`.
3. **Tres dimensiones de estado independientes**: `estado_pago`, `estado_pedido`,
   `estado_facturacion`. Nunca colapsarlas en un solo campo.
4. **El agente de WhatsApp nunca inventa** precio, stock ni disponibilidad. Si no hay
   coincidencia en el catálogo, pide reformulación o escala a una persona.
5. **El rol `produccion` no ve** márgenes ni datos de contacto del cliente. Se aplica con
   Row Level Security en Supabase, no en el frontend.
6. **Toda animación respeta `prefers-reduced-motion`** y dura entre 150 y 400 ms.

## Stack

Next.js (App Router) · Supabase (PostgreSQL + Auth + RLS) · Framer Motion ·
Mercado Pago Checkout Pro · n8n Community autoalojado · Redis · Railway ·
WhatsApp Cloud API · OpenAI GPT-5.6 Luna

Descartados explícitamente: Vercel · Kubernetes · VPS autoadministrado · Odoo ·
CMS externo (Sanity, Strapi) · librerías no oficiales de WhatsApp · ERP propio.

## Convenciones

- **Dominio y base de datos en español**: `pedidos`, `estado_pago`, `precio_cop`,
  `disponibilidad`. El vocabulario del negocio no se traduce.
- **Código, componentes y variables en inglés**.
- Precios en **enteros COP**, sin decimales. Nunca float para dinero.
- Fechas y horas en `America/Bogota`.

## Skills del proyecto

| Skill | Cargar cuando |
|---|---|
| `nacer-dominio` | Modelo de datos, estados, disponibilidad, reservas, entregas |
| `nacer-pagos` | Cualquier cosa que toque Mercado Pago |
| `nacer-motion` | Animaciones e interacción de la tienda |

## Agentes

`data-model` → `catalog` · `payments` → `storefront` · `admin-panel` · `agent-flows` → `qa`

`data-model` bloquea a todos los demás. Empezar por ahí.
