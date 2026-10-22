import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buildWhatsAppUrl, WHATSAPP_GENERAL_MESSAGE } from "@/lib/whatsapp";

type IconName = "instagram" | "facebook" | "whatsapp";

interface FooterLink {
  href: string;
  label: string;
  /** Enlace saliente: se abre en pestaña nueva y puede llevar icono. */
  external?: boolean;
  icon?: IconName;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/**
 * Las URLs legales y `/about-us` conservan los slugs del sitio Odoo al que
 * reemplaza esta tienda; no renombrarlas sin añadir un redirect.
 */
const COLUMNS: FooterColumn[] = [
  {
    title: "Tienda",
    links: [
      { href: "/catalogo", label: "Catálogo" },
      { href: "/marca", label: "Crisálidas y Mariposas" },
      { href: "/about-us", label: "Sobre nosotros" },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        href: "/politica-de-privacidad-y-datos",
        label: "Política de privacidad",
      },
      { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
    ],
  },
  {
    title: "Redes",
    links: [
      {
        href: "https://www.instagram.com/crisalidasymariposas/",
        label: "Instagram",
        external: true,
        icon: "instagram",
      },
      {
        href: "https://www.facebook.com/crisalidasymariposas",
        label: "Facebook",
        external: true,
        icon: "facebook",
      },
      {
        href: buildWhatsAppUrl(WHATSAPP_GENERAL_MESSAGE),
        label: "WhatsApp",
        external: true,
        icon: "whatsapp",
      },
    ],
  },
];

const LINK_CLASS =
  "inline-flex items-center gap-2 font-body text-sm text-cream/80 transition-colors duration-200 hover:text-amber";

/**
 * Pie de página oscuro, común a toda la tienda. Server component: es solo
 * enlaces, no necesita JS en el cliente.
 *
 * En móvil/tablet las columnas de enlaces van PRIMERO y el bloque
 * logo + copyright baja (`order`): quien llega al final de la página busca
 * enlaces, no la marca. Desde `lg` el logo vuelve a la izquierda.
 *
 * Sin animaciones: solo transición de color en hover. No choca con el pill
 * flotante del carrito, que vive arriba a la derecha.
 */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[30px] px-5 py-[60px] md:gap-[60px] md:px-[60px] lg:flex-row lg:justify-between lg:gap-10">
        <div className="order-2 flex flex-col justify-between gap-6 lg:order-1 lg:w-[43%]">
          <Logo className="h-10 w-auto self-start" priority={false} />
          <p className="font-body text-sm text-cream/60">
            © {new Date().getFullYear()} Nacer Group SAS. Todos los derechos
            reservados.
          </p>
        </div>

        <nav
          aria-label="Pie de página"
          className="order-1 grid grid-cols-2 gap-x-5 gap-y-10 lg:order-2 lg:flex lg:flex-1 lg:justify-end lg:gap-5"
        >
          {COLUMNS.map((column) => (
            <div key={column.title} className="lg:w-1/3 lg:max-w-48">
              <h2 className="font-body text-xs uppercase tracking-[0.14em] text-cream/55">
                {column.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-1.5 md:mt-[18px]">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={LINK_CLASS}
                      >
                        {link.icon && <SocialIcon name={link.icon} />}
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={LINK_CLASS}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (name === "facebook") {
    return (
      <svg {...common}>
        <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5A.5.5 0 0 1 14 8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
    </svg>
  );
}
