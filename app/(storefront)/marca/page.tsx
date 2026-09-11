import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Crisálidas y Mariposas — la marca",
};

/** Ruta placeholder: el nav del header la enlaza. Ver `components/ui/ComingSoon`. */
export default function MarcaPage() {
  return (
    <ComingSoon
      eyebrow="La marca"
      title="Crisálidas y Mariposas"
      body="El universo de la marca dentro de Nacer Group — su origen, su propósito y su relación con las otras marcas de la casa. Estamos armando esta sección."
    />
  );
}
