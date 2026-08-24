import type { Producto } from "@/lib/domain/types";
import { esVendible } from "@/lib/domain/esVendible";

interface DisponibilidadBadgeProps {
  producto: Producto;
}

/**
 * Refleja `disponibilidad`, nunca `stock` directamente. Un producto
 * `Bajo pedido` se muestra como comprable con su tiempo de preparación — no
 * como agotado — sin importar que `stock` sea 0.
 */
export function DisponibilidadBadge({ producto }: DisponibilidadBadgeProps) {
  const vendible = esVendible(producto);

  if (producto.disponibilidad === "Agotado" || !vendible) {
    return (
      <span className="inline-flex items-center rounded-full bg-ink/8 px-3 py-1 font-body text-xs text-ink/60">
        Agotado
      </span>
    );
  }

  if (producto.disponibilidad === "Bajo pedido") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber/15 px-3 py-1 font-body text-xs text-ink">
        Bajo pedido
        {producto.tiempoPreparacionDias
          ? ` · ${producto.tiempoPreparacionDias} días de preparación`
          : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-moss/15 px-3 py-1 font-body text-xs text-moss">
      Disponible
    </span>
  );
}
