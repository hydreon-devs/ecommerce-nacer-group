import { SKELETON_SURFACE, SkeletonBar, SkeletonShell } from "../ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonShell
      label="Cargando despachos…"
      title="Despachos"
      subtitle={
        <p className="text-sm text-admin-ink-muted">
          Lo que sale hoy y lo que va en camino, por fecha de entrega más próxima.
        </p>
      }
      actions={
        <>
          <SkeletonBar className="h-11 w-44" />
          <SkeletonBar className="h-11 w-28" />
        </>
      }
    >
      {[0, 1].map((s) => (
        <section key={s} className="flex flex-col gap-3">
          <SkeletonBar className="h-5 w-48" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`${SKELETON_SURFACE} flex flex-col gap-3 p-4`}>
                <SkeletonBar className="h-5 w-40" />
                <SkeletonBar className="h-4 w-full" />
                <SkeletonBar className="h-4 w-3/4" />
                <SkeletonBar className="h-4 w-1/2" />
                <SkeletonBar className="h-11 w-28" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SkeletonShell>
  );
}
