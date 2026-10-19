import type { Disponibilidad } from "@/lib/domain/types";

interface DisponibilidadBadgeProps {
  disponibilidad: Disponibilidad;
}

/**
 * Tono por disponibilidad. El texto siempre lleva la información (el punto es
 * refuerzo, no el único canal) y todos los pares texto/fondo superan 4.5:1.
 */
const TONES: Record<Disponibilidad, string> = {
  Disponible: "bg-moss/12 text-moss-deep",
  // `Bajo pedido` se vende: tono cálido y activo, nunca el gris de "Agotado".
  "Bajo pedido": "bg-amber/20 text-ink",
  Agotado: "bg-ink/8 text-ink-muted",
};

/**
 * Refleja `disponibilidad`, nunca stock. `Bajo pedido` se muestra como
 * comprable, no como agotado (hoy la DB no tiene ese estado ni tiempo de
 * preparación; si aparece, se agrega el dato aquí).
 */
export function DisponibilidadBadge({ disponibilidad }: DisponibilidadBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-xs font-medium whitespace-nowrap ${TONES[disponibilidad]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full bg-current ${disponibilidad === "Agotado" ? "opacity-50" : ""}`}
      />
      {disponibilidad}
    </span>
  );
}
