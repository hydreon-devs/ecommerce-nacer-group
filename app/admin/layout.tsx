import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

/**
 * Root layout independiente del storefront (spec 002 plan §2): sin
 * `MotionConfig` ni `SiteHeader`, sin la transición de
 * `app/(storefront)/template.tsx`. El sistema visual propio (tema
 * claro/oscuro, acentos) vive en `globals.css` — aprobado como maqueta en
 * specs/003_rediseno_panel_kpis_tabla_operativa antes de este código.
 *
 * `suppressHydrationWarning` en `<html>` es intencional: el script de abajo
 * escribe `data-theme` antes de que React hidrate, así que el DOM real no
 * coincide con el HTML renderizado en el servidor — es exactamente el caso
 * que ese prop está pensado para cubrir (un atributo de un nodo puntual, no
 * un subárbol distinto).
 */
export const metadata: Metadata = {
  title: "Panel — Nacer Group",
  description: "Panel de administración interno de Nacer Group.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("admin-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="es" className="admin-shell h-full" suppressHydrationWarning>
      <body className="admin-shell min-h-full antialiased">
        <Script id="admin-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
