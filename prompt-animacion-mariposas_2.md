# Prompt para Claude — Animación de mariposas y abejas voladoras

Copia y pega el siguiente prompt en una conversación con Claude (idealmente con acceso a herramientas de archivo/código) para que construya la animación:

---

Quiero que construyas un componente de React (mi sitio usa Next.js) que anime mariposas — y opcionalmente abejas — volando de forma decorativa. El sitio vende artesanías hechas con crisálidas y mariposas reales, y también productos de abejas — es una marca conectada con la naturaleza.

Lo voy a usar primero en el Hero de la home, pero eventualmente en más secciones/páginas del sitio, así que constrúyelo como un componente reutilizable y configurable (por ejemplo `<FlyingCreatures />`), no como un bloque de código pegado una sola vez. Debe aceptar props para: cantidad de especímenes, variante (`"butterfly"` | `"bee"`), y las rutas de las imágenes a usar (ver más abajo). Usa CSS Modules (o dime si prefieres styled-jsx/Tailwind — pregúntame si no tienes claro cuál uso) para no depender de librerías externas de animación; no hace falta Framer Motion, esto se resuelve bien con `@keyframes` y `transform` puro.

**Referencia técnica de base (adaptar, no copiar tal cual):**
Quiero que uses una técnica de 3 capas de transformación CSS anidadas para simular vuelo realista:

1. Capa exterior: desplazamiento vertical/direccional global de la mariposa a través de la sección (con fade-in/fade-out de opacidad en los extremos para que no aparezca/desaparezca abruptamente).
2. Capa intermedia ("turn"): bamboleo horizontal errático combinando `translateX` oscilante con `rotateZ` (inclinación de vuelo), usando `perspective` y un `cubic-bezier` con ligero rebote — esto simula el vuelo inestable y no lineal real de una mariposa (no tiene cola estabilizadora, así que nunca vuela en línea recta).
3. Capa interior ("flutter"): aleteo de las alas usando dos pseudo-elementos (`::before` y `::after`) con imágenes planas de cada ala, animando `rotateY` para simular apertura/cierre del ala en 3D. Frecuencia de aleteo realista: 4-8 ciclos por segundo (más lento que una abeja).

Quiero varias mariposas (3-5) con `animation-delay` escalonado, tamaños ligeramente distintos y velocidades distintas, para dar sensación de profundidad y evitar que se vean sincronizadas.

**Variante abeja (opcional, para la sección de productos de abeja):**
Aplica la misma estructura de capas pero con: aleteo mucho más rápido (visualmente casi un blur/vibración en vez de aleteo marcado), trayectoria más directa y estable (menos bamboleo lateral), y capacidad de "hover" (quedarse suspendida un momento antes de seguir).

**Assets:**
Voy a usar mis propias imágenes (fotos/ilustraciones de mis productos — mariposas y crisálidas reales, y abejas) en vez de imágenes de stock. Cada espécimen necesita 3 imágenes recortadas con fondo transparente: cuerpo, ala derecha y ala izquierda. Las imágenes viven en la carpeta `public/` de mi proyecto Next.js, así que las rutas se referencian desde la raíz (ej. `/images/animations/butterfly-1-body.png`).

**Rutas de las imágenes (completar antes de enviar el prompt):**

```
Mariposa 1:
- Cuerpo: /images/animations/____
- Ala derecha: /images/animations/____
- Ala izquierda: /images/animations/____

Mariposa 2:
- Cuerpo: /images/animations/____
- Ala derecha: /images/animations/____
- Ala izquierda: /images/animations/____

Mariposa 3:
- Cuerpo: /images/animations/____
- Ala derecha: /images/animations/____
- Ala izquierda: /images/animations/____

Abeja 1 (si aplica en esta primera entrega):
- Cuerpo: /images/animations/____
- Ala derecha: /images/animations/____
- Ala izquierda: /images/animations/____
```

Si aún no tengo las imágenes recortadas, dímelo y ayúdame a prepararlas (quitar fondo) a partir de las fotos originales antes de construir el componente.

**Restricciones de UX muy importantes (no negociables):**
- La animación NO debe cubrir ni interferir con el texto ni con las fotos de producto ni con los botones de compra. Debe ir detrás del contenido (z-index bajo) o confinada a una zona decorativa (ej. el hero, o los márgenes), nunca en `position: fixed` cubriendo toda la pantalla con contenido encima.
- Todo el contenedor de la animación debe tener `pointer-events: none` para no bloquear clics.
- Debe respetar `prefers-reduced-motion: reduce` (desactivar o reducir drásticamente el movimiento para usuarios sensibles).
- Solo animar `transform` y `opacity` (no `top`/`left`/`width` directamente) para que sea performante.
- Debe verse bien y no sobrecargar el rendimiento en móvil — considera reducir la cantidad de mariposas o desactivar la animación en pantallas pequeñas.
- Debe ser un componente de React/Next.js autocontenido, con su propio archivo de estilos (CSS Module), pensado para insertarse dentro de un contenedor con `position: relative` en la sección donde lo use (empezando por el Hero) — no debe depender de `position: fixed` sobre todo el viewport.

Para esta primera entrega, impleméntalo en el Hero de la home. Empieza preguntándome cualquier duda sobre las rutas de imagen que te doy abajo, si uso TypeScript o JavaScript en el proyecto, y si tengo ya las imágenes recortadas (cuerpo + ala derecha + ala izquierda por separado) o si necesito ayuda preparándolas.

---

## Qué más compartir junto con el prompt

El prompt describe la técnica, pero para que Claude la ejecute de verdad (y no con imágenes genéricas de mariposa monarca) conviene adjuntar también:

1. **Los recortes de tus propias mariposas y abejas** — cuerpo y cada ala por separado, en PNG o SVG con fondo transparente, ya colocados en `public/images/animations/` (o la carpeta que prefieras) de tu proyecto Next.js. Es lo único que Claude no puede generar por ti. Si no los tienes recortados aún, sube las fotos originales y pide ayuda para aislarlos antes de animarlos.
2. **Las rutas exactas** de esas imágenes, rellenando la tabla del prompt.
3. **El componente/código actual de tu Hero** (o al menos una captura de pantalla), para integrar la animación sin romper el layout, respetar tus colores/tipografía y saber en qué z-index insertarla respecto al contenido existente.
4. **Si usas TypeScript o JavaScript** en el proyecto, y qué solución de estilos usas si no es CSS Modules (Tailwind, styled-components, styled-jsx).
5. **Referencias visuales**, si tienes algún sitio o efecto que te guste como punto de comparación, para calibrar qué tan sutil o llamativo debe quedar.

### Notas para ti (no parte del prompt)

- Si tus fotos de mariposas/crisálidas no vienen ya separadas en cuerpo + ala izquierda + ala derecha con fondo transparente, vas a necesitar recortarlas así (herramienta de remove-background + edición) antes de que la animación funcione bien — el truco de `rotateY` en las alas solo luce bien si cada ala es una imagen plana independiente.
- Si quieres poner esto en producción, pide explícitamente que se pruebe con `prefers-reduced-motion` activado y en un viewport móvil antes de darlo por terminado.
