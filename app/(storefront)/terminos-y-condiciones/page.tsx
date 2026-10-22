import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { TERMS_AND_CONDITIONS } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones — Crisálidas y Mariposas",
};

/** Slug heredado del sitio Odoo anterior: no renombrar, hay enlaces externos. */
export default function TermsPage() {
  return <LegalDocument document={TERMS_AND_CONDITIONS} />;
}
