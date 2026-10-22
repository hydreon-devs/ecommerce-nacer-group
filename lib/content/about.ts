export interface AboutBlock {
  heading: string;
  body: string;
}

/**
 * Copy de `/about-us` tomado del sitio anterior (Odoo). Se conserva la
 * redacción del cliente; solo se corrigieron erratas evidentes ("colemnas",
 * "mariposasy", punto doble al final).
 */
export const ABOUT_INTRO: AboutBlock[] = [
  {
    heading: "¿Quiénes somos?",
    body: "Somos una empresa innovadora que ofrece regalos diferentes, únicos y llenos de vida, acompañadas por crisálidas de mariposas para que puedas vivir la transformación de este magnífico ser y ver su hermoso vuelo. Nos inspiramos en la naturaleza para ser y hacer parte del cambio de la existencia, por esto creamos experiencias que transforman positivamente la vida de las personas logrando que se conecten a su ser espiritual, el ecosistema, la naturaleza y la vida.",
  },
  {
    heading: "Nuestra Misión",
    body: "Queremos acompañarlos en todo momento y ser parte de la transformación de cada individuo, que les genere sentimientos positivos e inolvidables y que queden como un lindo recuerdo en sus memorias. Por esto hemos creado una serie de productos y servicios ideales para fechas como cumpleaños, matrimonios, aniversarios, felicitaciones, bautizos, recuperaciones, agradecimientos, condolencias, eventos empresariales entre otras.",
  },
];

export const ABOUT_BENEFITS_TITLE = "¿Qué beneficios tenemos?";

export const ABOUT_BENEFITS: AboutBlock[] = [
  {
    heading: "Símbolo de Libertad y Amor",
    body: "Las mariposas simbolizan libertad, transformación y fortaleza puesto que tienen que pasar tres etapas hasta tener sus alas. Simbolizan alegría y un cambio positivo en la vida. Las abejas son símbolo de amor, de entrega y dedicación.",
  },
  {
    heading: "Repoblación",
    body: "Al liberar mariposas o tener colmenas de abejas nativas en tu casa, ayudas a la repoblación de estas especies, das un impacto positivo al medio ambiente, reduces tu huella de carbono debido a que las mariposas y abejas son importantes polinizadoras necesarias para expandir la flora en el mundo, además son indicadoras de un ambiente sano.",
  },
  {
    heading: "Impacto emocional",
    body: "Generamos un impacto positivo sobre nuestros clientes y sus familias, hemos visto que las mariposas y las abejas son una fuente de inspiración y de libertad, vivir anhelos nuevos, darle más luz a esos momentos especiales.",
  },
  {
    heading: "Reconectar",
    body: "Llevamos una parte de la naturaleza a los hogares de nuestros clientes, para generarles bienestar, creando a la vez conciencia y una conexión entre las personas y el medio ambiente.",
  },
  {
    heading: "Regalos únicos",
    body: "Regalos diferentes, únicos y simbólicos, de alto impacto de recordación que sorprende y genera emociones positivas, creando momentos inolvidables.",
  },
  {
    heading: "Garantía",
    body: "Nuestro propósito es que todas las personas se sorprendan al ver emerger la mariposa, por esto damos una garantía sobre las crisálidas que no logran emerger o las mariposas que no logran extender sus alas.",
  },
  {
    heading: "Apoyo a productores nacionales",
    body: "Apoyamos a diferentes productores de la región y cabezas de familia, comprando insumos nacionales.",
  },
  {
    heading: "Concientizar",
    body: "Creamos experiencias educativas y artísticas que fomentan el conocimiento y el compromiso con el cuidado de los recursos de la Tierra y nuestra humanidad. A través de nuestros productos, educamos sobre la fauna y flora de Colombia y cómo ayudar a conservarlas, aportando nuestro granito de arena para un futuro sostenible y amigable con el medio ambiente.",
  },
];

export const ABOUT_TEAM = {
  title: "Nuestro equipo",
  paragraphs: [
    "Somos un gran equipo de trabajo con una fuerza imparable unidos en armonía para lograr que puedas vivir las maravillosas experiencias que tenemos para ti. Todos y cada uno de los miembros del equipo aportan un granito de arena y sus habilidad únicas.",
    "Tenemos todo un equipo apasionado por lo que hacemos y esperamos que disfrutes de tu experiencia con nosotros.",
  ],
} as const;
