"use client";

import { useActionState, useState } from "react";
import { ActionStatus } from "../(protected)/ui/ActionStatus";
import { inputClass, labelClass, primaryButtonClass } from "../(protected)/ui/formClasses";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  // Controlado: React reinicia los campos sin estado tras la acción aunque falle.
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorId = "login-error";
  const invalid = state.error ? true : undefined;
  const describedBy = state.error ? errorId : undefined;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={labelClass}>
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={labelClass}>
          Contraseña
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
            className="min-h-11 shrink-0 rounded-lg border border-admin-border px-3 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
          >
            {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          </button>
        </div>
      </div>
      <ActionStatus id={errorId} message={state.error ? { tone: "error", text: state.error } : null} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
