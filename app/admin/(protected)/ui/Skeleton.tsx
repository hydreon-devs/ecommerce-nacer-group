/** Piezas de los esqueletos de carga: estáticos (sin pulso), con el tamaño final para no desplazar nada. */
export const SKELETON_SURFACE =
  "rounded-xl border border-transparent bg-admin-surface-raised shadow-admin-card";

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-admin-surface-sunken ${className}`} />;
}

export function SkeletonShell({
  label,
  title,
  subtitle,
  actions,
  children,
}: {
  /** Texto anunciado por lectores de pantalla. */
  label: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {label}
      </span>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">{title}</h1>
          {subtitle ?? <SkeletonBar className="mt-1 h-5 w-48" />}
        </div>
        {actions ? <div className="flex flex-wrap items-end gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
