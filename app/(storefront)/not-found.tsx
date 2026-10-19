import type { Metadata } from "next";
import { NotFoundView } from "@/components/ui/NotFoundView";

export const metadata: Metadata = {
  title: "Página no encontrada — Crisálidas y Mariposas",
};

/** 404 dentro del storefront: lo dispara `notFound()` (p. ej. un slug de producto inexistente). */
export default function StorefrontNotFound() {
  return <NotFoundView />;
}
