"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";
import { Logo } from "@/components/ui/Logo";
import { SITE_NAME } from "@/lib/config";
import { buildWhatsAppUrl, WHATSAPP_GENERAL_MESSAGE } from "@/lib/whatsapp";

/** Altura aproximada del pill flotante; margen para que el cambio de variante
 * ocurra justo antes de que el header pise fondo claro. */
const HEADER_CLEARANCE = 88;

interface NavItem {
  href: string;
  label: string;
  /** Ítem prioritario del ecommerce: se pinta como botón, no como enlace. */
  featured?: boolean;
}

/**
 * `Catálogo` va primero y destacado a propósito: es la única ruta de este nav
 * que lleva a comprar. `Nosotros` y `Crisálidas y Mariposas` son páginas de
 * marca todavía en preparación (ver `app/nosotros` y `app/marca`) — existen
 * como rutas reales para que el nav no lleve a un 404.
 */
const NAV_ITEMS: NavItem[] = [
  { href: "/catalogo", label: "Catálogo", featured: true },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/marca", label: "Crisálidas y Mariposas" },
];

const WHATSAPP_HREF = buildWhatsAppUrl(WHATSAPP_GENERAL_MESSAGE);

/**
 * Header flotante, fijo, centrado como un único grupo: marca gráfica + nav +
 * botón de contacto. Vive fuera del flujo (`fixed`) para que la zona del hero
 * arranque en `y: 0` real, sin padding de compensación.
 *
 * Dos variantes del mismo componente (nunca duplicar el header):
 * - Transparente, texto crema: mientras se está sobre la zona oscura del hero
 *   del Home, para no romper la continuidad de color con el video.
 * - Sólida (crema + blur): en el resto de la página y en todas las demás
 *   rutas, donde el fondo es claro y el texto crema sería ilegible.
 *
 * El cambio de variante NO usa un umbral fijo de scroll: mide el alto real de
 * `#hero-zone` (lo renderiza `HeroSection`). Un umbral fijo se disparaba a los
 * 64px, en plena zona oscura, y dejaba un pill crema flotando sobre el video
 * durante casi todo el hero. Si el elemento no existe (cualquier ruta que no
 * sea Home), la variante sólida es la única.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const heroHeightRef = useRef<number | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Home es la única ruta con zona de hero. Se deriva del pathname y no de la
  // medición para que el servidor y el primer render de cliente coincidan: si
  // dependiera del efecto, el pill se pintaría sólido un frame y saltaría a
  // transparente al hidratar.
  const isHome = pathname === "/";

  // Mide la zona del hero para saber dónde cambia la variante. El alto va en
  // un ref y no en estado: solo lo lee el manejador de scroll, no hay nada que
  // re-renderizar cuando cambia. El recálculo de la variante se hace dentro
  // del callback del ResizeObserver (que además dispara una vez al observar),
  // no en el cuerpo del efecto — así también queda cubierto el caso de entrar
  // a la página con el scroll ya restaurado a mitad del documento.
  useEffect(() => {
    const zone = document.getElementById("hero-zone");
    if (!zone) {
      heroHeightRef.current = null;
      return;
    }
    const ro = new ResizeObserver(() => {
      const height = zone.offsetHeight;
      heroHeightRef.current = height;
      setScrolledPastHero(window.scrollY > height - HEADER_CLEARANCE);
    });
    ro.observe(zone);
    return () => ro.disconnect();
  }, [pathname]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const heroHeight = heroHeightRef.current;
    if (heroHeight === null) return;
    setScrolledPastHero(latest > heroHeight - HEADER_CLEARANCE);
  });

  // El menú móvil se cierra al navegar (los enlaces llaman a `closeMenu`) y
  // con Escape. No hay un efecto que lo cierre por cambio de ruta: eso sería
  // un setState en el cuerpo de un efecto para algo que el propio evento de
  // clic ya sabe.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Bloquea el scroll del documento mientras el panel móvil está abierto: sin
  // esto, el panel (fixed) se queda flotando en su sitio mientras el fondo se
  // desplaza detrás, lo cual confunde más de lo que ahorra un cierre extra.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const overHero = isHome && !scrolledPastHero;
  const solid = !overHero;

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-col items-center">
      {overHero && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent"
        />
      )}

      <div
        className={`relative mt-4 flex items-center gap-3 rounded-full px-4 py-2.5 transition-colors duration-300 md:mt-6 md:gap-5 md:px-6 md:py-3 ${
          solid
            ? "bg-cream/90 text-ink shadow-sm shadow-ink/5 backdrop-blur-md"
            : "bg-black/10 text-cream backdrop-blur-sm"
        }`}
      >
        <Link
          href="/"
          onClick={closeMenu}
          aria-label={`${SITE_NAME} — ir al inicio`}
          className="transition-opacity duration-200 hover:opacity-80"
        >
          <Logo />
        </Link>

        <span
          aria-hidden="true"
          className={`h-5 w-px transition-colors duration-300 ${
            solid ? "bg-ink/15" : "bg-cream/25"
          }`}
        />

        {/* Nav completo desde md. Debajo, solo el ítem destacado + el menú. */}
        <nav aria-label="Principal" className="flex items-center gap-3 md:gap-5">
          {NAV_ITEMS.map((item) =>
            item.featured ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="inline-flex items-center rounded-full bg-amber px-4 py-2 font-body text-xs font-medium uppercase tracking-[0.12em] text-ink transition-colors duration-200 hover:bg-amber-soft md:px-5 md:text-sm md:tracking-[0.1em]"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`hidden font-body text-xs uppercase tracking-[0.14em] transition-colors duration-200 md:inline lg:text-sm ${
                  solid
                    ? "text-ink/65 hover:text-moss"
                    : "text-cream/75 hover:text-amber"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <span
          aria-hidden="true"
          className={`hidden h-5 w-px transition-colors duration-300 md:block ${
            solid ? "bg-ink/15" : "bg-cream/25"
          }`}
        />

        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className={`hidden items-center gap-2 rounded-full border px-4 py-2 font-body text-xs transition-colors duration-200 md:inline-flex lg:text-sm ${
            solid
              ? "border-ink/15 text-ink/75 hover:border-moss hover:text-moss"
              : "border-cream/25 text-cream/85 hover:border-cream/60 hover:text-cream"
          }`}
        >
          <ChatIcon />
          Contacto
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 md:hidden ${
            solid
              ? "border-ink/15 text-ink/75"
              : "border-cream/25 text-cream/85"
          }`}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="site-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION_UI, ease: EASE_UI }}
            className="mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-cream/95 p-2 shadow-lg shadow-ink/10 backdrop-blur-md md:hidden"
          >
            {NAV_ITEMS.filter((item) => !item.featured).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block rounded-xl px-4 py-3 font-body text-sm text-ink/80 transition-colors duration-200 hover:bg-ink/5 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl px-4 py-3 font-body text-sm text-moss transition-colors duration-200 hover:bg-moss/10"
            >
              <ChatIcon />
              Escribir por WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
    </svg>
  );
}

/** Hamburguesa que se cruza al abrir. Solo `transform`, 200ms. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-4">
      <span
        className={`absolute left-0 block h-px w-4 bg-current transition-transform duration-200 ${
          open ? "top-1.5 rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 block h-px w-4 bg-current transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-px w-4 bg-current transition-transform duration-200 ${
          open ? "top-1.5 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}
