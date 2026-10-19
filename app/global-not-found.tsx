import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { NotFoundView } from "@/components/ui/NotFoundView";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { fraunces, manrope } from "@/lib/fonts";
import "./globals.css";

/**
 * 404 para URLs que no coinciden con ninguna ruta. Hace falta porque la app
 * tiene dos root layouts (`(storefront)` y `admin`) y no hay uno solo desde el
 * que componer la 404 global. Next la sirve sin pasar por ningún layout, así
 * que repite aquí el esqueleto del storefront (fuentes, estilos, header).
 * Requiere `experimental.globalNotFound` en `next.config.ts`.
 */
export const metadata: Metadata = {
  title: "Página no encontrada — Crisálidas y Mariposas",
};

export default function GlobalNotFound() {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <MotionConfig reducedMotion="user">
          <SiteHeader />
          <NotFoundView />
        </MotionConfig>
      </body>
    </html>
  );
}
