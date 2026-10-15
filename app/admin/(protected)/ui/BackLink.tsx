import Link from "next/link";
import { focusRingClass } from "./formClasses";

/** Enlace "volver" con flecha: objetivo táctil de 44px y anillo de foco. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:text-admin-ink ${focusRingClass}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}
