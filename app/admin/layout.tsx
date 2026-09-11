import type { Metadata } from "next";
import "../globals.css";

/**
 * Root layout independiente del storefront (plan §2): sin `MotionConfig` ni
 * `SiteHeader`, sin la transición de `app/(storefront)/template.tsx`. El
 * panel es una herramienta de trabajo diario, no la tienda.
 */
export const metadata: Metadata = {
  title: "Panel — Nacer Group",
  description: "Panel de administración interno de Nacer Group.",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
