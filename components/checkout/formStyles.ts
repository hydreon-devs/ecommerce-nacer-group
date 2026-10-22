/**
 * Shared class names for the checkout forms (kept in one place so the Entrega
 * and Tus datos steps look the same). Colors come from the theme tokens.
 */
export const FIELD =
  "min-h-11 w-full rounded-xl border border-ink/20 bg-cream px-4 py-2.5 font-body text-base text-ink placeholder:text-ink-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss aria-[invalid=true]:border-danger";
export const LABEL = "block font-body text-sm font-medium text-ink";
export const HINT = "mt-1 font-body text-xs text-ink-muted";
export const ERROR = "mt-1 font-body text-sm text-danger";
export const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-moss px-6 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";
export const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ink/20 px-6 font-body text-sm text-ink transition-colors duration-150 hover:border-moss hover:bg-moss/8 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";
export const CHOICE =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink/20 px-4 py-2.5 font-body text-base text-ink transition-colors duration-150 has-[:checked]:border-moss has-[:checked]:bg-moss/8 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss motion-reduce:transition-none";
