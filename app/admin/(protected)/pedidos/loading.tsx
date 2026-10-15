import { SKELETON_SURFACE, SkeletonBar, SkeletonShell } from "../ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonShell
      label="Cargando pedidos…"
      title="Pedidos"
      actions={
        <>
          <SkeletonBar className="h-[2.75rem] w-48" />
          <SkeletonBar className="h-[2.75rem] w-36" />
          <SkeletonBar className="h-[2.75rem] w-40" />
          <SkeletonBar className="h-[2.75rem] w-32" />
        </>
      }
    >
      <div className={`${SKELETON_SURFACE} overflow-hidden`}>
        <div className="flex flex-col divide-y divide-admin-border">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <SkeletonBar className="h-5 w-20" />
              <SkeletonBar className="h-5 w-40 max-w-[40%]" />
              <span className="flex-1" />
              <SkeletonBar className="h-5 w-24" />
              <SkeletonBar className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
