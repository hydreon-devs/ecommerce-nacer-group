import { z } from "zod";
import { MUNICIPALITIES, type Municipality } from "./municipalities.ts";
import { ADDRESS_MAX_LENGTH, ADDRESS_MIN_LENGTH } from "./quoteDelivery.ts";

/**
 * Checkout step 1 (Entrega). Two shapes:
 *
 *  - `DeliveryDraft`: the form in progress, kept in `sessionStorage` so a
 *    reload does not lose it. It is NEVER a source of truth: every read is
 *    validated, anything odd starts over, and slice 4 re-validates and
 *    re-prices server-side (fee and distance included).
 *  - `DeliveryStep`: the validated result the later steps consume, produced by
 *    `toDeliveryStep` against the calendar. The date must be one the calendar
 *    offers; `is_delivery_date` stays the authority at order creation.
 */

export const BUILDING_MAX_LENGTH = 120;

// ---- Final, validated step ------------------------------------------------------

const MESSAGES = {
  date: "Elige una fecha disponible del calendario.",
  address: `Escribe la dirección completa (mínimo ${ADDRESS_MIN_LENGTH} caracteres).`,
  neighborhood: "Cuéntanos el barrio.",
  municipality: "Elige un municipio del área metropolitana.",
  building: "Máximo 120 caracteres.",
  quote: "Calcula el domicilio para continuar.",
  confirmed: "Confirma que la dirección es correcta para continuar.",
};

/** Schema factory: the date check needs the calendar the server built. */
export function createDeliveryStepSchema(calendar: readonly string[]) {
  const dates = new Set(calendar);
  const date = z.string().refine((d) => dates.has(d), { error: MESSAGES.date });

  const tienda = z.object({ method: z.literal("tienda"), date });

  const domicilio = z.object({
    method: z.literal("domicilio"),
    address: z
      .string()
      .trim()
      .min(ADDRESS_MIN_LENGTH, { error: MESSAGES.address })
      .max(ADDRESS_MAX_LENGTH, { error: MESSAGES.address }),
    municipality: z.enum(MUNICIPALITIES, { error: MESSAGES.municipality }),
    neighborhood: z
      .string()
      .trim()
      .min(2, { error: MESSAGES.neighborhood })
      .max(100, { error: MESSAGES.neighborhood }),
    unit: z.string().trim().max(100).optional(),
    /** Urbanización o edificio (`building_name`). Optional, up to 120 like the database. */
    building: z
      .string()
      .trim()
      .max(BUILDING_MAX_LENGTH, { error: MESSAGES.building })
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    resolvedAddress: z.string().trim().min(1, { error: MESSAGES.quote }),
    meters: z.number({ error: MESSAGES.quote }).int({ error: MESSAGES.quote }).nonnegative({ error: MESSAGES.quote }),
    /** DISPLAY ONLY: slice 4 recomputes the fee server-side. */
    feeCop: z.number({ error: MESSAGES.quote }).int({ error: MESSAGES.quote }).nonnegative({ error: MESSAGES.quote }),
    confirmed: z.literal(true, { error: MESSAGES.confirmed }),
    date,
  });

  return z.discriminatedUnion("method", [tienda, domicilio]);
}

export type DeliveryStep = z.infer<ReturnType<typeof createDeliveryStepSchema>>;

// ---- Draft -----------------------------------------------------------------------

export interface DraftQuote {
  /** The input this quote was computed for; a different input makes it stale. */
  address: string;
  municipality: Municipality;
  resolvedAddress: string;
  meters: number;
  feeCop: number;
  /** The customer answered "Sí, es aquí". */
  confirmed: boolean;
}

export interface DeliveryDraft {
  method: "tienda" | "domicilio" | null;
  address: string;
  municipality: Municipality | "";
  neighborhood: string;
  unit: string;
  /** Urbanización o edificio; optional. */
  building: string;
  quote: DraftQuote | null;
  /** `YYYY-MM-DD`, or "" when not chosen. */
  date: string;
}

export function emptyDraft(): DeliveryDraft {
  return { method: null, address: "", municipality: "", neighborhood: "", unit: "", building: "", quote: null, date: "" };
}

export const DRAFT_VERSION = 1;
export const DRAFT_STORAGE_KEY = "nacer.checkout.delivery";

const municipalityField = z.enum(MUNICIPALITIES);

const quoteSchema = z.object({
  address: z.string().max(ADDRESS_MAX_LENGTH),
  municipality: municipalityField,
  resolvedAddress: z.string().min(1).max(500),
  meters: z.number().int().nonnegative(),
  feeCop: z.number().int().nonnegative(),
  confirmed: z.boolean(),
});

const draftSchema = z.object({
  method: z.enum(["tienda", "domicilio"]).nullable(),
  address: z.string().max(ADDRESS_MAX_LENGTH),
  municipality: z.union([municipalityField, z.literal("")]),
  neighborhood: z.string().max(100),
  unit: z.string().max(100),
  // Drafts stored before this field existed read as empty.
  building: z.string().max(BUILDING_MAX_LENGTH).default(""),
  quote: quoteSchema.nullable(),
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
});

const storedDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  draft: draftSchema,
});

export function serializeDraft(draft: DeliveryDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, draft });
}

/** Safe read of `sessionStorage` content: anything unexpected yields an empty draft. */
export function parseStoredDraft(raw: string | null): DeliveryDraft {
  if (!raw) return emptyDraft();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyDraft();
  }
  const parsed = storedDraftSchema.safeParse(json);
  return parsed.success ? parsed.data.draft : emptyDraft();
}

/** Drops a stored date the calendar no longer offers (a day passed, hours changed). */
export function reconcileDraft(draft: DeliveryDraft, calendar: readonly string[]): DeliveryDraft {
  return calendar.includes(draft.date) ? draft : { ...draft, date: "" };
}

/** The quote, but only while the address and municipality still match what it was computed for. */
export function currentQuote(draft: DeliveryDraft): DraftQuote | null {
  const q = draft.quote;
  if (!q) return null;
  return q.address === draft.address.trim() && q.municipality === draft.municipality ? q : null;
}

export type ToDeliveryStepResult =
  | { ok: true; step: DeliveryStep }
  | { ok: false; errors: Record<string, string> };

/** Validates the draft into a `DeliveryStep`; on failure, one message per field. */
export function toDeliveryStep(
  draft: DeliveryDraft,
  calendar: readonly string[],
): ToDeliveryStepResult {
  if (draft.method === null) {
    return { ok: false, errors: { method: "Elige cómo quieres recibir tu pedido." } };
  }
  const q = currentQuote(draft);
  const candidate =
    draft.method === "tienda"
      ? { method: "tienda", date: draft.date }
      : {
          method: "domicilio",
          address: draft.address,
          municipality: draft.municipality,
          neighborhood: draft.neighborhood,
          unit: draft.unit || undefined,
          building: draft.building || undefined,
          resolvedAddress: q?.resolvedAddress ?? "",
          meters: q?.meters,
          feeCop: q?.feeCop,
          confirmed: q?.confirmed ?? false,
          date: draft.date,
        };
  const parsed = createDeliveryStepSchema(calendar).safeParse(candidate);
  if (parsed.success) return { ok: true, step: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "method");
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
