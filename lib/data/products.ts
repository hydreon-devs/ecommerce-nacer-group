/**
 * ⚠️ DATOS DE EJEMPLO — NO ES EL CATÁLOGO REAL.
 *
 * El catálogo real de Crisálidas y Mariposas todavía no existe: nombres,
 * precios, stock, descripciones e imágenes de este archivo son ficticios,
 * creados solo para poder construir y probar el storefront de la Fase 1
 * (Home, Catálogo, Ficha) sin backend. Cuando exista Supabase, este archivo
 * se reemplaza por una consulta a la tabla `productos` — la forma de los
 * datos (`lib/domain/types.ts`) ya es la definitiva.
 *
 * Cobertura intencional de este mock (no reducir sin revisar la Fase 1):
 * - Las 3 categorías de la marca: Experiencia, Artesanía, Detalle.
 * - Al menos un producto `Bajo pedido` con `stock: 0` (CM-0005) — debe verse
 *   comprable, nunca agotado: es la prueba visual de `esVendible`.
 * - Al menos un producto `Agotado` (CM-0007) — debe verse bloqueado, sin CTA
 *   de WhatsApp en su ficha.
 * - Al menos un producto con ocasión `condolencias`/`acompañar`/`recordar`
 *   (CM-0006, CM-0007) — deben verse en el registro sobrio de animación.
 */

import type { Producto } from "../domain/types";
import { esVendible } from "../domain/esVendible";

export const PRODUCTS: Producto[] = [
  {
    id: "cm-0001",
    sku: "CM-0001",
    slug: "liberacion-mariposas-jardin-botanico",
    nombre: "Liberación de mariposas — Jardín Botánico",
    categoria: "Experiencia",
    descripcionCorta:
      "Una liberación guiada de mariposas monarca en el Jardín Botánico, para celebrar un momento que merece alas.",
    descripcionLarga:
      "Ceremonia de 45 minutos con guía especializado en un espacio natural protegido. Incluye la cría certificada de las mariposas, una breve introducción sobre su ciclo de vida y el momento de liberación colectiva. Ideal para cumpleaños, aniversarios o cualquier celebración que busque un gesto simbólico y vivo.",
    precioCop: 120000,
    disponibilidad: "Disponible",
    stock: 8,
    requiereAgenda: true,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["celebración", "experiencia", "naturaleza"],
    imagenes: ["Ceremonia al aire libre", "Detalle de mariposa monarca", "Grupo en el momento de liberación"],
  },
  {
    id: "cm-0002",
    sku: "CM-0002",
    slug: "liberacion-mariposas-ceremonia-intima",
    nombre: "Liberación de mariposas — Ceremonia íntima",
    categoria: "Experiencia",
    descripcionCorta:
      "Una liberación privada, pensada para homenajear a alguien en un círculo reducido.",
    descripcionLarga:
      "Ceremonia privada para hasta 12 personas, con guía dedicado y un espacio reservado. Se prepara con antelación para coincidir con una fecha significativa: un homenaje, un aniversario de vida, o cualquier ocasión que pida un gesto más recogido que una liberación grupal.",
    precioCop: 180000,
    disponibilidad: "Bajo pedido",
    stock: 0,
    tiempoPreparacionDias: 15,
    requiereAgenda: true,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["homenaje", "experiencia", "recordar"],
    imagenes: ["Espacio reservado", "Guía preparando la cría", "Momento íntimo de liberación"],
  },
  {
    id: "cm-0003",
    sku: "CM-0003",
    slug: "cupula-cristal-mariposa-monarca-preservada",
    nombre: "Cúpula de cristal con mariposa monarca preservada",
    categoria: "Artesanía",
    descripcionCorta:
      "Pieza única de exhibición: una mariposa monarca preservada bajo una cúpula de cristal soplado a mano.",
    descripcionLarga:
      "Cada cúpula es soplada a mano por un artesano local y contiene un único ejemplar preservado con técnica de conservación de largo plazo. Al ser pieza única, no hay dos exactamente iguales. Pensada como objeto de decoración permanente o como regalo de alto significado.",
    precioCop: 240000,
    disponibilidad: "Disponible",
    stock: 2,
    requiereAgenda: false,
    esPiezaUnica: true,
    activo: true,
    ocasiones: ["decoración", "naturaleza", "regalo"],
    imagenes: ["Cúpula de cristal soplado", "Detalle de las alas", "Sobre una mesa de madera"],
  },
  {
    id: "cm-0004",
    sku: "CM-0004",
    slug: "vasija-ceramica-alas-de-mariposa",
    nombre: "Vasija de cerámica alas de mariposa",
    categoria: "Artesanía",
    descripcionCorta:
      "Vasija torneada a mano con relieve inspirado en el patrón alar de la mariposa monarca.",
    descripcionLarga:
      "Cerámica de alta temperatura, torneada y esmaltada a mano en taller local. El relieve reproduce el patrón de las alas de la monarca en tonos tierra. Funciona como florero o pieza de exhibición sola.",
    precioCop: 95000,
    disponibilidad: "Disponible",
    stock: 12,
    requiereAgenda: false,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["decoración", "regalo", "celebrar"],
    imagenes: ["Vasija completa", "Detalle del relieve", "En contexto de mesa"],
  },
  {
    id: "cm-0005",
    sku: "CM-0005",
    slug: "set-te-ceremonial-ceramica-artesanal",
    nombre: "Set de té ceremonial en cerámica artesanal",
    categoria: "Artesanía",
    descripcionCorta:
      "Set de 4 piezas para compartir en familia o agradecer a un equipo — se produce bajo pedido.",
    descripcionLarga:
      "Tetera y tres tazas torneadas en el mismo taller, esmaltadas en un tono ámbar cálido. Por ser una pieza que se produce por lote, este set está disponible bajo pedido: se elabora especialmente al confirmar la compra y se entrega dentro del tiempo de preparación indicado, sin necesidad de que haya unidades en bodega.",
    precioCop: 150000,
    disponibilidad: "Bajo pedido",
    stock: 0,
    tiempoPreparacionDias: 10,
    requiereAgenda: false,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["familia", "agradecer", "empresas"],
    imagenes: ["Set completo sobre bandeja", "Detalle del esmaltado", "En uso durante una reunión"],
  },
  {
    id: "cm-0006",
    sku: "CM-0006",
    slug: "caja-acompanamiento-mariposa-de-la-memoria",
    nombre: "Caja de acompañamiento — Mariposa de la memoria",
    categoria: "Detalle",
    descripcionCorta:
      "Un detalle sencillo para acompañar a alguien que está atravesando una pérdida.",
    descripcionLarga:
      "Una caja de acompañamiento pensada para quien no sabe qué decir, pero quiere estar presente: una mariposa de cerámica pequeña, una tarjeta escrita a mano y una vela de cera natural. No busca celebrar, busca acompañar en silencio.",
    precioCop: 65000,
    disponibilidad: "Disponible",
    stock: 20,
    requiereAgenda: false,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["condolencias", "acompañar", "recordar"],
    imagenes: ["Caja cerrada con listón", "Contenido de la caja", "Tarjeta escrita a mano"],
  },
  {
    id: "cm-0007",
    sku: "CM-0007",
    slug: "vela-ritual-tarjeta-condolencias",
    nombre: "Vela ritual + tarjeta de condolencias artesanal",
    categoria: "Detalle",
    descripcionCorta: "Vela de cera natural y tarjeta artesanal para un mensaje de condolencia.",
    descripcionLarga:
      "Vela de cera de soya con mecha de madera, pensada para acompañar un momento de recogimiento, junto a una tarjeta de condolencias hecha a mano por el taller. Este producto está agotado por el momento.",
    precioCop: 45000,
    disponibilidad: "Agotado",
    stock: 0,
    requiereAgenda: false,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["condolencias", "acompañar"],
    imagenes: ["Vela encendida", "Tarjeta artesanal", "Presentación conjunta"],
  },
  {
    id: "cm-0008",
    sku: "CM-0008",
    slug: "kit-regalo-empresarial-mariposas-del-bosque",
    nombre: "Kit de regalo empresarial — Mariposas del bosque",
    categoria: "Detalle",
    descripcionCorta:
      "Kit corporativo para agradecer a clientes o equipos, con empaque personalizable.",
    descripcionLarga:
      "Incluye una pieza de cerámica pequeña de la línea Artesanía, una nota impresa personalizable con el logo de tu empresa y empaque en caja kraft. Pensado para agradecimientos de fin de año o cierres de proyecto.",
    precioCop: 210000,
    disponibilidad: "Disponible",
    stock: 15,
    requiereAgenda: false,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["empresas", "agradecer", "regalo"],
    imagenes: ["Kit completo", "Empaque personalizado", "Detalle de la pieza incluida"],
  },
  {
    id: "cm-0009",
    sku: "CM-0009",
    slug: "mariposario-de-mesa-follaje-preservado",
    nombre: "Mariposario de mesa con follaje preservado",
    categoria: "Artesanía",
    descripcionCorta:
      "Terrario cerrado con follaje preservado y una figura de mariposa suspendida — pieza única.",
    descripcionLarga:
      "Cada terrario se compone a mano con musgo y follaje preservado (no requiere riego) y una figura de mariposa suspendida en el interior. Al armarse pieza por pieza, cada unidad tiene una composición distinta.",
    precioCop: 135000,
    disponibilidad: "Disponible",
    stock: 3,
    requiereAgenda: false,
    esPiezaUnica: true,
    activo: true,
    ocasiones: ["decoración", "naturaleza", "celebración"],
    imagenes: ["Terrario cerrado", "Vista superior del follaje", "En repisa junto a luz natural"],
  },
  {
    id: "cm-0010",
    sku: "CM-0010",
    slug: "experiencia-familiar-cria-liberacion-guiada",
    nombre: "Experiencia familiar: cría y liberación guiada",
    categoria: "Experiencia",
    descripcionCorta:
      "Un recorrido educativo para familias, desde la oruga hasta la liberación de la mariposa.",
    descripcionLarga:
      "Programa de dos sesiones: la primera para observar el proceso de metamorfosis de cerca con guía educativo, y la segunda para liberar juntos las mariposas ya adultas. Pensado para hacer con niños, sin edad mínima.",
    precioCop: 200000,
    disponibilidad: "Disponible",
    stock: 6,
    requiereAgenda: true,
    esPiezaUnica: false,
    activo: true,
    ocasiones: ["familia", "educación", "experiencia"],
    imagenes: ["Familia observando el proceso", "Detalle de la crisálida", "Liberación conjunta"],
  },
];

export function getProductBySlug(slug: string): Producto | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/**
 * Selección editorial para el carrusel de destacados del Home. Es una lista de
 * SKU escrita a mano, no un `slice`: cuando exista Supabase, se reemplaza por
 * una columna `destacado` en `productos` sin cambiar la firma.
 *
 * Dos criterios de cobertura que no se deben perder al editarla:
 * - Incluye `CM-0005` (`Bajo pedido`, `stock: 0`): un destacado debe poder
 *   mostrarse comprable con su tiempo de preparación, nunca como agotado.
 * - Incluye `CM-0006` (`condolencias`/`acompañar`): la marca sí vende para
 *   duelo y esconderlo del Home sería falsear el catálogo. Su tarjeta ya usa
 *   el registro sobrio por `esOcasionSobria`.
 *
 * El filtro `esVendible` es el que decide qué entra de verdad: un producto que
 * pase a `Agotado` desaparece del carrusel solo, sin editar esta lista.
 */
const FEATURED_SKUS = [
  "CM-0001",
  "CM-0003",
  "CM-0005",
  "CM-0009",
  "CM-0006",
  "CM-0010",
] as const;

export function getFeaturedProducts(): Producto[] {
  return FEATURED_SKUS.map((sku) => PRODUCTS.find((p) => p.sku === sku)).filter(
    (p): p is Producto => p !== undefined && esVendible(p),
  );
}

export function getAllOcasiones(): string[] {
  const set = new Set<string>();
  PRODUCTS.forEach((p) => p.ocasiones.forEach((o) => set.add(o)));
  return Array.from(set).sort();
}
