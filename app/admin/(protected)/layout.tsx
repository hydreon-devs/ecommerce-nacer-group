import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "../actions";

/**
 * Shell autenticado (nav + salir). No es root layout — cuelga de
 * `app/admin/layout.tsx`. `proxy.ts` ya garantiza que si se llegó hasta acá
 * hay sesión; este layout no vuelve a verificarla.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6">
        <nav className="flex flex-col gap-1">
          <p className="mb-4 px-2 text-sm font-semibold text-slate-900">Nacer Group</p>
          <Link
            href="/admin/pedidos"
            className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Pedidos
          </Link>
          <Link
            href="/admin/productos"
            className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Productos
          </Link>
        </nav>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
