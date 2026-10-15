"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const ref = useRef<HTMLAnchorElement>(null);

  // En móvil la fila de enlaces hace scroll horizontal: el activo debe quedar a la vista.
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
  }, [active]);

  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 snap-center items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent ${
        active
          ? "bg-admin-accent-wash text-admin-accent"
          : "text-admin-ink-secondary hover:bg-admin-surface-sunken hover:text-admin-ink"
      }`}
    >
      {children}
    </Link>
  );
}
