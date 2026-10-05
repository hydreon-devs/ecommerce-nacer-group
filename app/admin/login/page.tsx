import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Panel Nacer Group",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-surface px-6">
      <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface-raised p-8 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_8px_24px_-12px_rgba(11,17,32,0.12)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="mb-4 h-7 w-7 text-admin-accent"
          aria-hidden="true"
        >
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
        <h1 className="mb-1 text-lg font-bold tracking-tight text-admin-ink">Panel de administración</h1>
        <p className="mb-6 text-sm text-admin-ink-muted">Nacer Group</p>
        <LoginForm />
      </div>
    </main>
  );
}
