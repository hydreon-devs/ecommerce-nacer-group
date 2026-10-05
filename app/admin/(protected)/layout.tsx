import type { ReactNode } from "react";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { signOut } from "../actions";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";

function initials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  const chars = parts.length >= 2 ? [parts[0][0], parts[1][0]] : [local[0], local[1] ?? ""];
  return chars.join("").toUpperCase();
}

/**
 * Shell autenticado (nav + tema + salir). No es root layout — cuelga de
 * `app/admin/layout.tsx`. `proxy.ts` ya garantiza que si se llegó hasta acá
 * hay sesión; este layout no vuelve a verificarla.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-admin-surface text-admin-ink">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-6 border-b border-admin-border bg-admin-surface-raised px-5">
        <span className="flex items-center gap-2 whitespace-nowrap text-[14.5px] font-bold tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px] text-admin-accent" aria-hidden="true">
            <path
              d="M12 3c0 3-3.5 3.2-3.5 6.2 0 1.7 1.5 3.1 3.5 3.1s3.5-1.4 3.5-3.1C15.5 6.2 12 6 12 3Z"
              fill="currentColor"
              opacity={0.9}
            />
            <path
              d="M12 12.3c-3.4 0-7 1.6-7 5.4 0 2 1.7 3.3 3.6 2.6 1.5-.6 2.6-2.2 3.4-4M12 12.3c3.4 0 7 1.6 7 5.4 0 2-1.7 3.3-3.6 2.6-1.5-.6-2.6-2.2-3.4-4"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <line x1="12" y1="12.3" x2="12" y2="21" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
          </svg>
          Nacer Group
        </span>

        <nav aria-label="Secciones del panel" className="flex gap-0.5">
          <NavLink href="/admin/estadisticas">Estadísticas</NavLink>
          <NavLink href="/admin/pedidos">Pedidos</NavLink>
          <NavLink href="/admin/carritos">Carritos</NavLink>
          <NavLink href="/admin/produccion">Producción</NavLink>
          <NavLink href="/admin/productos">Productos</NavLink>
        </nav>

        <span className="flex-1" />

        <ThemeToggle />

        <div className="flex items-center gap-2 rounded-full border border-admin-border py-1 pl-1 pr-2.5 text-xs text-admin-ink-secondary">
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-admin-accent text-[10px] font-bold text-admin-accent-ink">
            {initials(email) || "?"}
          </span>
          <span className="max-w-[140px] truncate">{email}</span>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-admin-ink-muted transition-colors duration-200 hover:bg-admin-surface-sunken hover:text-admin-ink"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-6">{children}</main>
    </div>
  );
}
