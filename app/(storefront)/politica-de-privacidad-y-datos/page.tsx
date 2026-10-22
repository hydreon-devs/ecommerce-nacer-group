import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Política de Privacidad y Datos — Crisálidas y Mariposas",
};

/** Slug heredado del sitio Odoo anterior: no renombrar, hay enlaces externos. */
export default function PrivacyPolicyPage() {
  return <LegalDocument document={PRIVACY_POLICY} />;
}
