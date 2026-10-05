"use client";

/**
 * Componente sin estado de React a propósito: ambos íconos viven siempre en
 * el DOM y `globals.css` decide cuál se ve según `data-theme` (mismo patrón
 * que la maqueta aprobada). Un swap de SVG condicionado a un `useState`
 * causaba un mismatch real de hidratación — `suppressHydrationWarning` solo
 * cubre texto/atributos de un nodo, no un subárbol distinto.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    const isDark =
      current === "dark" ||
      (current !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("admin-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      className="grid h-8 w-8 place-items-center rounded-lg border border-admin-border bg-admin-surface-raised text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="theme-icon-sun h-4 w-4"
        aria-hidden="true"
      >
        <path d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        className="theme-icon-moon h-4 w-4"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
