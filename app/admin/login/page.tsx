import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Panel Nacer Group",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Panel de administración</h1>
        <p className="mb-6 text-sm text-slate-500">Nacer Group</p>
        <LoginForm />
      </div>
    </main>
  );
}
