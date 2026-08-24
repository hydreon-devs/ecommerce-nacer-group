import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

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
