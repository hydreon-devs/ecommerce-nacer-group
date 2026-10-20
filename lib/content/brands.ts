/**
 * Marcas de Nacer Group para la sección "Nuestras marcas" del Home.
 *
 * Es contenido de PRESENTACIÓN, no modelo de datos: `jagua` no existe en
 * `products.brand` (sus productos viven en Complementos, dentro de Crisálidas)
 * y no debe agregarse a ningún enum. Florea no vende aquí: solo enlaza a su
 * sitio.
 *
 * ⚠️ Textos PROVISIONALES: pendientes de aprobación del cliente.
 * Para cambiar una foto, completar `image` de la marca; sin ella se pinta un
 * panel de color con el token de `tone`.
 */

export type BrandTone = "moss" | "violet" | "amber";

export interface BrandImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface BrandLink {
  label: string;
  href: string;
  /** Externo = nueva pestaña con `rel="noopener noreferrer"`. */
  external: boolean;
}

export interface Brand {
  id: "crisalidas" | "florea" | "jagua";
  name: string;
  /** Frase corta bajo el nombre en el panel. */
  tagline: string;
  description: string;
  /** Token de color (ver `app/globals.css`); el componente lo traduce a clases. */
  tone: BrandTone;
  /** Foto opcional: al completarla se usa `next/image` en lugar del panel de color. */
  image?: BrandImage;
  /** Ausente = la marca solo se presenta (Jagua). */
  link?: BrandLink;
}

/** Introducción de la sección. ⚠️ Texto provisional, pendiente de aprobación. */
export const NACER_GROUP_INTRO =
  "Nacer Group es la casa detrás de tres marcas que comparten un mismo espíritu: acompañar los momentos importantes y cuidar la naturaleza. Aquí las conoces: Crisálidas y Mariposas, Florea y Jagua.";

export const BRANDS: readonly Brand[] = [
  {
    id: "crisalidas",
    name: "Crisálidas y Mariposas",
    tagline: "La marca que encuentras en esta tienda",
    description:
      "Liberaciones de mariposas, cerámica hecha a mano y detalles para acompañar. Cada pieza y cada experiencia está pensada para celebrar, agradecer o recordar un momento importante.",
    tone: "moss",
    link: { label: "Ver catálogo", href: "/catalogo", external: false },
  },
  {
    id: "florea",
    name: "Florea",
    tagline: "Meliponicultura y educación",
    description:
      "Florea cuida abejas sin aguijón y comparte ese conocimiento con talleres y material educativo. Tiene su propio sitio, donde puedes conocer su trabajo; aquí no se vende.",
    tone: "amber",
    link: {
      label: "Visitar universoflorea.com",
      href: "https://universoflorea.com/",
      external: true,
    },
  },
  {
    id: "jagua",
    name: "Jagua",
    tagline: "Hoy vive dentro de Crisálidas",
    description:
      "Jagua es una marca familiar que nace del mundo natural y del deseo de crear productos que inspiren a través del arte y reduzcan el impacto ambiental. Su espíritu es compartir conocimiento para enseñar a cuidar el planeta: hacer consciente el inconsciente. Hoy sus productos están disponibles en la tienda, dentro de la línea Complementos de Crisálidas y Mariposas.",
    tone: "violet",
  },
];
