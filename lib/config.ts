import type { HeroId } from "@/lib/content/heroes";

/**
 * Configuración global del storefront.
 *
 * WHATSAPP_NUMBER es un placeholder obviamente falso: no hay número real
 * documentado en el proyecto todavía. Es la única constante que hay que
 * tocar cuando exista — no está repetida en ningún componente.
 */
export const WHATSAPP_NUMBER = "573000000000"; // TODO(cliente): reemplazar por el número real de Crisálidas y Mariposas

/**
 * Hero activo del Home. Único punto de la app que decide cuál de los videos
 * registrados en `lib/content/heroes.ts` se muestra — cambiarlo es editar
 * esta línea, no tocar `HeroSection` ni `useCanvasScrub`.
 *
 * Al cambiarlo hay que revisar también el token `--color-hero-ambient` en
 * `app/globals.css`: es el color de fondo de servidor de la banda y está
 * medido de los frames del video activo.
 */
export const ACTIVE_HERO: HeroId = "emergencia";

export const SITE_NAME = "Crisálidas y Mariposas";

export const SITE_DESCRIPTION =
  "Experiencias, cerámica y detalles de acompañamiento — Nacer Group.";
