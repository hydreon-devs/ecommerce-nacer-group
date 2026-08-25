import type { RevealType } from "@/components/motion/variants";

/**
 * Bloque de entrada, ARRIBA de la banda de video y en flujo normal de
 * documento — no superpuesto al canvas. Es lo que se ve sin scrollear junto
 * con el header, así que carga el titular de marca y el camino a la compra.
 */
export const HERO_INTRO = {
  eyebrow: "Crisálidas y Mariposas",
  title: "Un regalo único, innovador y sostenible. Genera experiencias inolvidables",
  body: "Liberaciones guiadas, cerámica torneada a mano y detalles para acompañar. Elige por el momento que estás viviendo, y vive una experiencia única que siempre recordarás.",
  primaryCta: { label: "Ver catálogo", href: "/catalogo" },
  secondaryCta: { label: "Conoce el taller", href: "/nosotros" },
} as const;

export interface ValueProp {
  id: string;
  /** Numeral visible de la franja (01–04), no un índice del array. */
  numeral: string;
  title: string;
  body: string;
}

/**
 * Franja de propuesta de valor, justo después de la banda de video. Cuatro
 * promesas concretas y verificables — nada de adjetivos sueltos: cada una
 * corresponde a algo que el catálogo realmente hace (cría certificada, lotes
 * pequeños, filtro por ocasión, `Bajo pedido` con tiempo de preparación
 * visible).
 */
export const VALUE_PROPS: ValueProp[] = [
  {
    id: "criadas",
    numeral: "01",
    title: "Criadas, no capturadas",
    body: "Las monarcas vienen de cría certificada y se liberan en espacios naturales protegidos. Ninguna pieza viva sale de un ecosistema silvestre.",
  },
  {
    id: "taller",
    numeral: "02",
    title: "Hecho a mano, en lotes pequeños",
    body: "Cada objeto se tornea y se esmalta en taller local. Por eso hay piezas únicas, y por eso no todas están listas en bodega.",
  },
  {
    id: "ocasion",
    numeral: "03",
    title: "Pensado para un momento",
    body: "Celebrar, agradecer, acompañar una pérdida. El catálogo se filtra por la ocasión, que es como uno busca de verdad.",
  },
  {
    id: "tiempo",
    numeral: "04",
    title: "A tu tiempo, sin inventar bodega",
    body: "Si una pieza se hace bajo pedido, lo decimos y mostramos cuántos días toma prepararla. Preferimos el dato real a la promesa rápida.",
  },
];

export interface HomeSectionImage {
  src: string;
  /**
   * Texto alternativo en español, como el resto del copy del sitio. Describe lo
   * que se ve, no la sección: quien navega con lector de pantalla ya recibe el
   * titular y el cuerpo por separado, así que repetirlos aquí sería ruido.
   */
  alt: string;
}

export interface HomeSection {
  id: string;
  type: RevealType;
  /**
   * De qué lado queda el texto en escritorio. En las secciones con imagen es
   * también lo que decide el lado contrario para la foto, así que la
   * alternancia del recorrido se lee como una sola columna en zigzag.
   */
  align: "left" | "right" | "center";
  /** Forzado a true en la sección que habla de acompañamiento/duelo. */
  sober?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  /**
   * Imagen de apoyo. Opcional a propósito: el cierre (`cta-final`) no lleva
   * ninguna porque es una llamada a la acción, no un momento del relato, y
   * meterle una foto competiría con el botón.
   *
   * ⚠️ Las imágenes actuales son generadas, no fotografía real de la marca.
   * Sirven para validar la demo; hay que reemplazarlas por producción propia
   * antes de publicar.
   */
  image?: HomeSectionImage;
}

/**
 * Secciones narrativas del Home, después de la propuesta de valor y del
 * carrusel de destacados. Alternan `align` izquierda/derecha y nunca repiten
 * el mismo `type` de animación de forma consecutiva —
 * `assertNoConsecutiveRepeats` lo valida al cargar el módulo, así una edición
 * futura no puede romperlo en silencio.
 *
 * Parte de este copy viene de los captions que antes se superponían al video
 * del hero (`heroCaptions.ts`, eliminado): al sacar todo el texto de encima
 * del canvas, los momentos "experiencias", "artesanía" y "acompañar" se
 * reubicaron aquí, en las secciones que ya trataban esos mismos temas, en vez
 * de duplicarse.
 */
export const HOME_SECTIONS: HomeSection[] = [
  {
    id: "intro",
    type: "fade-up",
    align: "left",
    eyebrow: "Naturaleza y transformación",
    title: "Un ciclo completo antes de llegar a tus manos",
    body: "Lo que se ve arriba no es una metáfora: así emerge una monarca. Ese mismo ritmo — lento, exacto, imposible de apurar — es el que seguimos para preparar cada experiencia y cada pieza que sale del taller.",
    image: {
      src: "/images/recorrido/intro.webp",
      alt: "Una mariposa monarca emergiendo de su crisálida translúcida, colgada de un hilo de seda sobre fondo oscuro.",
    },
  },
  {
    id: "categorias",
    type: "scale-up",
    align: "right",
    eyebrow: "Qué encuentras",
    title: "Experiencias, artesanía y detalles de acompañamiento",
    body: "Liberaciones guiadas para celebrar en vivo, cerámica torneada a mano para decorar y regalar, y detalles pequeños para los momentos que no necesitan grandeza — solo presencia.",
    cta: { label: "Ver el catálogo", href: "/catalogo" },
    image: {
      src: "/images/recorrido/categorias.webp",
      alt: "Tres piezas de cerámica artesanal en tonos crema y verde musgo sobre madera, con una monarca posada en el borde de una de ellas.",
    },
  },
  {
    id: "taller",
    type: "blur-up",
    align: "left",
    eyebrow: "El taller",
    title: "Cerámica que pasa por manos, no por una línea de producción",
    body: "Nuestros artesanos tornean, esmaltan y curan cada objeto por lotes. Algunas piezas salen únicas sin que nadie lo planee; otras se hacen solo cuando alguien las pide. En los dos casos, el tiempo es parte del producto.",
    image: {
      src: "/images/recorrido/taller.webp",
      alt: "Manos cubiertas de barro dando forma a una vasija en el torno de alfarero, bajo luz cálida de taller.",
    },
  },
  {
    id: "ocasion-experiencia",
    type: "rotate-in",
    align: "right",
    eyebrow: "Para celebrar",
    title: "Liberaciones guiadas, en el momento exacto",
    body: "Cumpleaños, aniversarios, cierres de ciclo. Un guía especializado acompaña todo el proceso, desde la cría certificada hasta el instante en que las mariposas toman el aire.",
    cta: { label: "Ver experiencias", href: "/catalogo?ocasion=experiencia" },
    image: {
      src: "/images/recorrido/experiencia.webp",
      alt: "Unas manos abiertas liberando varias mariposas monarca a contraluz en un jardín tropical.",
    },
  },
  {
    id: "acompanar",
    type: "sober",
    sober: true,
    align: "left",
    eyebrow: "Para acompañar",
    title: "También hay espacio para lo difícil",
    body: "No todo lo que hacemos es para celebrar. Hay detalles pensados para acompañar una pérdida, sin necesidad de encontrar las palabras correctas — a veces basta con estar presente.",
    cta: { label: "Ver detalles de acompañamiento", href: "/catalogo?ocasion=acompañar" },
    image: {
      src: "/images/recorrido/acompanar.webp",
      alt: "Un cuenco pequeño de cerámica sin esmaltar junto a un ala de monarca, sobre lino claro y luz difusa.",
    },
  },
  {
    id: "cta-final",
    type: "stagger-up",
    align: "center",
    eyebrow: "Todo en un solo lugar",
    title: "El catálogo completo te espera",
    body: "Filtra por lo que estás buscando — la ocasión, no la categoría — y encuentra la pieza correcta para ese momento.",
    cta: { label: "Explorar catálogo", href: "/catalogo" },
  },
];

export interface HomePrinciple {
  id: string;
  numeral: string;
  title: string;
  body: string;
}

/**
 * Principios verificables que sustituyen las cifras ficticias del prototipo.
 * El bloque explica cómo funciona la experiencia de compra sin atribuir a la
 * marca volumen, certificaciones o resultados que todavía no estén validados.
 */
export const HOME_PRINCIPLES: HomePrinciple[] = [
  {
    id: "momento",
    numeral: "01",
    title: "El momento primero",
    body: "Explora por celebración, familia, agradecimiento o acompañamiento. Empiezas por lo que quieres expresar, no por una categoría comercial.",
  },
  {
    id: "disponibilidad",
    numeral: "02",
    title: "Disponibilidad sin promesas falsas",
    body: "Si una pieza está lista, lo indicamos. Si se produce bajo pedido, mostramos su tiempo de preparación y sigue siendo posible solicitarla.",
  },
  {
    id: "coordinacion",
    numeral: "03",
    title: "Coordinación humana",
    body: "Las experiencias, las fechas especiales y los detalles particulares se coordinan directamente por WhatsApp antes de confirmar.",
  },
];

function assertNoConsecutiveRepeats(sections: HomeSection[]): void {
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].type === sections[i - 1].type) {
      throw new Error(
        `HOME_SECTIONS: "${sections[i].id}" repite el tipo de animación "${sections[i].type}" de la sección anterior ("${sections[i - 1].id}"). Cambia el type de una de las dos.`,
      );
    }
  }
}

assertNoConsecutiveRepeats(HOME_SECTIONS);
