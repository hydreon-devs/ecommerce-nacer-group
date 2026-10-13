const SURFACE = "rounded-xl border border-transparent bg-admin-surface-raised shadow-admin-card";
const BAR = "rounded bg-admin-surface-sunken";

/** Esqueleto estático (sin pulso) que replica el layout final para no desplazar nada. */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Cargando estadísticas…
      </span>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-admin-ink">Estadísticas</h1>
          <div className={`${BAR} mt-1 h-5 w-48`} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className={`${BAR} h-[3.25rem] w-40`} />
          <div className={`${BAR} h-[3.25rem] w-36`} />
          <div className={`${BAR} h-[2.375rem] w-32`} />
          <div className={`${BAR} h-[2.375rem] w-28`} />
        </div>
      </div>

      <div className={`${SURFACE} overflow-hidden`}>
        <div className="grid grid-cols-2 gap-px bg-admin-border lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-admin-surface-raised p-4 lg:p-5">
              <div className={`${BAR} mb-2 h-4 w-24`} />
              <div className={`${BAR} h-7 w-28`} />
              {i >= 2 ? <div className={`${BAR} mt-2 h-4 w-36`} /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${SURFACE} flex flex-col p-5 lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1`}>
          <div className={`${BAR} mb-1 h-5 w-40`} />
          <div className={`${BAR} mb-4 h-4 w-64 max-w-full`} />
          <div className={`${BAR} min-h-60 w-full flex-1`} />
        </div>
        <div className={`${SURFACE} p-5 lg:col-start-1 lg:row-start-1`}>
          <div className={`${BAR} mb-1 h-5 w-40`} />
          <div className={`${BAR} mb-4 h-4 w-28`} />
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
              <div key={j} className={`${BAR} h-8 w-full`} />
            ))}
          </div>
        </div>
        <div className={`${SURFACE} p-5 lg:col-start-1 lg:row-start-2`}>
          <div className={`${BAR} mb-1 h-5 w-40`} />
          <div className={`${BAR} mb-4 h-4 w-28`} />
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className={`${BAR} h-5 w-full`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
