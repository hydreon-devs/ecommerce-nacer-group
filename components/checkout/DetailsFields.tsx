"use client";

import type { ReactNode } from "react";
import { charLength } from "@/lib/domain/checkout/saleDetails";
import { CHOICE, ERROR, FIELD, HINT, LABEL } from "./formStyles";

/**
 * Accessible field primitives of the "Tus datos" step: a label bound to the
 * control, hint and error linked with `aria-describedby`, `aria-invalid` on
 * error, and radios inside a fieldset/legend. Controls are at least 44px tall.
 */

interface BaseProps {
  /** Wrapper id prefix (unique per form instance). */
  uid: string;
  name: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}

const idOf = (uid: string, name: string, part = "") => `${uid}-${name}${part ? `-${part}` : ""}`;

function describedBy(uid: string, name: string, hint?: string, error?: string, extra?: string) {
  const ids = [hint ? idOf(uid, name, "hint") : null, extra ?? null, error ? idOf(uid, name, "error") : null];
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

export function TextField({
  uid,
  name,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
}) {
  return (
    <div data-field={name}>
      <label htmlFor={idOf(uid, name)} className={LABEL}>
        {label}
      </label>
      <input
        id={idOf(uid, name)}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(uid, name, hint, error)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={FIELD}
      />
      {hint && (
        <p id={idOf(uid, name, "hint")} className={HINT}>
          {hint}
        </p>
      )}
      {error && (
        <p id={idOf(uid, name, "error")} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  uid,
  name,
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  placeholder,
  limit,
  rows = 3,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Character limit, shown as a counter (counted like the database does). */
  limit: number;
  rows?: number;
}) {
  const count = charLength(value);
  const over = count > limit;
  const counterId = idOf(uid, name, "count");
  return (
    <div data-field={name}>
      <label htmlFor={idOf(uid, name)} className={LABEL}>
        {label}
      </label>
      <textarea
        id={idOf(uid, name)}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={error || over ? true : undefined}
        aria-describedby={describedBy(uid, name, hint, error, counterId)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${FIELD} resize-y`}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {hint && (
            <p id={idOf(uid, name, "hint")} className="font-body text-xs text-ink-muted">
              {hint}
            </p>
          )}
          {error && (
            <p id={idOf(uid, name, "error")} className="font-body text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <p
          id={counterId}
          className={`shrink-0 font-body text-xs tabular-nums ${over ? "text-danger" : "text-ink-muted"}`}
        >
          <span className="sr-only">Caracteres: </span>
          {count}/{limit}
        </p>
      </div>
    </div>
  );
}

export function SelectField({
  uid,
  name,
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  placeholder,
  options,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div data-field={name}>
      <label htmlFor={idOf(uid, name)} className={LABEL}>
        {label}
      </label>
      <select
        id={idOf(uid, name)}
        name={name}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(uid, name, hint, error)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={FIELD}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={idOf(uid, name, "hint")} className={HINT}>
          {hint}
        </p>
      )}
      {error && (
        <p id={idOf(uid, name, "error")} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Radio buttons in a fieldset with a legend (never free text for a fixed choice). */
export function ChoiceGroup({
  uid,
  name,
  label,
  hint,
  error,
  value,
  onChange,
  options,
  columns = 2,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  columns?: 2 | 3;
}) {
  return (
    <fieldset
      data-field={name}
      aria-describedby={describedBy(uid, name, hint, error)}
    >
      <legend className={LABEL}>{label}</legend>
      {hint && (
        <p id={idOf(uid, name, "hint")} className={HINT}>
          {hint}
        </p>
      )}
      <div className={`mt-2 grid gap-2 ${columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => (
          <label key={option} className={CHOICE}>
            <input
              type="radio"
              name={idOf(uid, name)}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-5 w-5 shrink-0 accent-moss"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={idOf(uid, name, "error")} className={ERROR}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
