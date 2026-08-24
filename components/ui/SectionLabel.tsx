interface SectionLabelProps {
  children: string;
}

/** Eyebrow label consistente para encabezar secciones y bloques. */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="font-body text-xs md:text-sm uppercase tracking-[0.2em] text-moss">
      {children}
    </p>
  );
}
