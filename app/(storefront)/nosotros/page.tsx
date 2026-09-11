import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Nosotros — Crisálidas y Mariposas",
};

/** Ruta placeholder: el nav del header la enlaza. Ver `components/ui/ComingSoon`. */
export default function NosotrosPage() {
  return (
    <ComingSoon
      eyebrow="Nosotros"
      title="La historia del taller, en camino"
      body="Quiénes somos, cómo criamos las monarcas y cómo trabajamos la cerámica: esta página está en preparación con el equipo."
    />
  );
}
