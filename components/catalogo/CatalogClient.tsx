"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Ocasion, Producto } from "@/lib/domain/types";
import { OcasionChips } from "./OcasionChips";
import { ProductCard } from "./ProductCard";

interface CatalogClientProps {
  productos: Producto[];
  ocasiones: string[];
  initialOcasion?: string | null;
}

/**
 * Filtro de catálogo. `AnimatePresence` + `layout`, keyed por `producto.id`
 * (estable entre renders), reordena la grilla sin remontar las tarjetas que
 * permanecen visibles.
 */
export function CatalogClient({
  productos,
  ocasiones,
  initialOcasion = null,
}: CatalogClientProps) {
  const [selected, setSelected] = useState<string | null>(initialOcasion);

  const filtered = useMemo(() => {
    if (!selected) return productos;
    return productos.filter((p) => p.ocasiones.includes(selected as Ocasion));
  }, [productos, selected]);

  return (
    <div className="flex flex-col gap-8">
      <OcasionChips ocasiones={ocasiones} selected={selected} onSelect={setSelected} />

      {filtered.length === 0 ? (
        <p className="font-body text-ink/60">
          No hay piezas para esta ocasión todavía. Prueba con otro filtro.
        </p>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
