import type { ReactNode } from "react";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { signOut } from "../actions";
import { AccountMenu } from "./AccountMenu";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { secondaryButtonClass } from "./ui/formClasses";

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
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-30 focus:rounded-lg focus:bg-admin-accent focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-admin-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 border-b border-admin-border bg-admin-surface-raised px-5 md:h-14 md:flex-nowrap md:gap-6">
        <span className="flex min-h-14 items-center gap-2 whitespace-nowrap text-[14.5px] font-bold tracking-tight">
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

        <span className="flex-1 md:order-2" />

        <AccountMenu email={email} initials={initials(email)} />

        {/* Móvil: enlaces en una segunda fila con scroll horizontal y degradado en los bordes. */}
        <nav
          aria-label="Secciones del panel"
          className="-mx-5 flex w-[calc(100%+2.5rem)] snap-x gap-2 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)] [scrollbar-width:none] md:order-1 md:mx-0 md:w-auto md:overflow-visible md:px-0 md:pb-0 md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        >
          <NavLink href="/admin/estadisticas">Estadísticas</NavLink>
          <NavLink href="/admin/pedidos">Pedidos</NavLink>
          <NavLink href="/admin/produccion">Producción</NavLink>
          <NavLink href="/admin/despachos">Despachos</NavLink>
          <NavLink href="/admin/productos">Productos</NavLink>
        </nav>

        <div className="hidden items-center gap-3 md:order-3 md:flex">
          <ThemeToggle />

          <div className="flex items-center gap-2 rounded-full border border-admin-border py-1 pl-1 pr-2.5 text-xs text-admin-ink-secondary">
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-admin-accent text-xs font-bold text-admin-accent-ink">
            {initials(email) || "?"}
          </span>
          <span className="max-w-[140px] truncate">{email}</span>
        </div>

          <form action={signOut}>
            <button type="submit" className={secondaryButtonClass}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-6 outline-none">{children}</main>
    </div>
  );
}
