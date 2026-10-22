/** Área Metropolitana del Valle de Aburrá: the only municipalities we deliver to. */
export const MUNICIPALITIES = [
  "Medellín",
  "Bello",
  "Itagüí",
  "Envigado",
  "Sabaneta",
  "La Estrella",
  "Caldas",
  "Copacabana",
  "Girardota",
  "Barbosa",
] as const;

export type Municipality = (typeof MUNICIPALITIES)[number];

export function isMunicipality(value: unknown): value is Municipality {
  return (MUNICIPALITIES as readonly unknown[]).includes(value);
}
