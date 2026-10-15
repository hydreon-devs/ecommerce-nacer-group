import { SKELETON_SURFACE, SkeletonBar, SkeletonShell } from "../ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonShell
      label="Cargando producción…"
      title="Producción"
      subtitle={
        <>
          <SkeletonBar className="mt-1 h-5 w-56" />
          <SkeletonBar className="mt-1 h-5 w-24" />
        </>
      }
      actions={
        <>
          <SkeletonBar className="h-[2.75rem] w-44" />
          <SkeletonBar className="h-[2.75rem] w-28" />
        </>
      }
    >
      {[0, 1].map((s) => (
        <section key={s} className="flex flex-col gap-3">
          <SkeletonBar className="h-5 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: s === 0 ? 3 : 2 }, (_, i) => (
              <div key={i} className={`${SKELETON_SURFACE} flex flex-col gap-3 p-4`}>
                <SkeletonBar className="h-5 w-32" />
                <SkeletonBar className="h-4 w-full" />
                <SkeletonBar className="h-4 w-2/3" />
                <SkeletonBar className="h-11 w-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SkeletonShell>
  );
}
