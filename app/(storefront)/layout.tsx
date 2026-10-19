import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";
import { fraunces, manrope } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Nacer Group`,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <MotionConfig reducedMotion="user">
          <SiteHeader />
          {children}
        </MotionConfig>
      </body>
    </html>
  );
}
