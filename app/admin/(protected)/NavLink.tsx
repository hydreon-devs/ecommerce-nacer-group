"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
        active
          ? "bg-admin-accent-wash text-admin-accent"
          : "text-admin-ink-secondary hover:bg-admin-surface-sunken hover:text-admin-ink"
      }`}
    >
      {children}
    </Link>
  );
}
