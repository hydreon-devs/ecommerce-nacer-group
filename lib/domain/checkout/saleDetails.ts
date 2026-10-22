import { z } from "zod";

/**
 * Checkout step 2 ("Tus datos"): the customer details the WhatsApp assistant
 * collects after payment (spec 015 RF-14, §3.6), rebuilt here BEFORE payment.
 *
 * The database is the authority: `create_web_order` runs `normalize_sale_details`
 * and the table CHECKs. Everything below mirrors those rules so the customer
 * rarely meets a database error, and the server action re-validates with the
 * same schemas. If a rule here and the SQL ever differ, the SQL wins.
 *
 * The draft keeps the database field names (`buyer_name`, ...) because the
 * form maps 1:1 to the RPC payload; the yes/no answers are the strings the
 * database expects ("Sí"/"No").
 */

// ---- Closed lists ----------------------------------------------------------------

/** Same list as `orders_occasion_check` (spec 019). */
export const OCCASIONS = [
  "cumpleaños",
  "condolencias",
  "grados",
  "felicitaciones",
  "nacimiento/bautizo",
  "boda",
  "aniversario",
  "recuperación",
  "fecha especial",
  "navidad",
  "laboral",
  "otro",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const OCCASION_LABELS: Record<Occasion, string> = {
  cumpleaños: "Cumpleaños",
  condolencias: "Condolencias",
  grados: "Grados",
  felicitaciones: "Felicitaciones",
  "nacimiento/bautizo": "Nacimiento o bautizo",
  boda: "Boda",
  aniversario: "Aniversario",
  recuperación: "Recuperación",
  "fecha especial": "Fecha especial",
  navidad: "Navidad",
  laboral: "Laboral",
  otro: "Otra ocasión",
};

/** Occasions that call for the sober register (`nacer-motion` §2.6). */
export function isSoberOccasion(value: string): boolean {
  return value === "condolencias";
}

export const REFERRAL_SOURCES = ["Instagram", "Facebook", "Un conocido", "Google", "Otro"] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const YES_NO = ["Sí", "No"] as const;
export type YesNo = (typeof YES_NO)[number];

/** Character limits, identical to the CHECKs on `sale_details`. */
export const LIMITS = {
  name: 150,
  card: 100,
  longText: 1000,
  email: 254,
} as const;

// ---- Normalizers (mirror normalize_phone and normalize_sale_details) -------------

/**
 * `normalize_phone`: strip `+ space - . ( )`, a leading `00` means `+`, a `+`
 * number loses the sign, and a 10-digit Colombian mobile (starts with 3) gets
 * `57`. Anything else is returned as is, so letters fail the digits check.
 * Blank input returns "".
 */
export function normalizePhone(raw: string): string {
  let v = raw.trim().replace(/[\s\-.()]/g, "");
  if (v === "") return "";
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (v.startsWith("+")) return v.slice(1);
  if (/^3[0-9]{9}$/.test(v)) return `57${v}`;
  return v;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeTaxId(raw: string): string {
  return raw.trim().replace(/[\s.]/g, "");
}

const PHONE_FORMAT = /^[0-9]{7,15}$/;
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TAX_ID_FORMAT = /^[0-9]{5,15}(-[0-9])?$/;

/** Postgres `char_length` counts characters (code points), not UTF-16 units. */
export function charLength(value: string): number {
  return Array.from(value).length;
}

// ---- Field schemas ---------------------------------------------------------------

const MESSAGES = {
  buyerName: "Escribe tu nombre completo.",
  recipientName: "Escribe el nombre de quien recibe o recoge.",
  phoneRequired: "Escribe un número de celular.",
  phoneFormat: "Revisa el número: solo dígitos; si no es de Colombia, empieza con + y el indicativo.",
  email: "Revisa que el correo esté completo, por ejemplo ana@correo.com.",
  yesNo: "Elige Sí o No.",
  occasion: "Elige una de las ocasiones de la lista.",
  referral: "Elige una de las opciones.",
  taxId: "Solo números; si es NIT, con el guion y el dígito de verificación.",
  legalName: "Escribe el nombre completo o la razón social para la factura.",
  invoiceEmail: "Escribe el correo donde enviaremos la factura.",
  max: (n: number) => `Máximo ${n} caracteres.`,
};

const requiredText = (max: number, requiredMessage: string) =>
  z
    .string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage })
    .refine((v) => charLength(v) <= max, { error: MESSAGES.max(max) });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .refine((v) => charLength(v) <= max, { error: MESSAGES.max(max) })
    .transform((v) => (v === "" ? null : v));

const phone = (requiredMessage: string) =>
  z
    .string({ error: requiredMessage })
    .min(1, { error: requiredMessage })
    .transform(normalizePhone)
    .pipe(z.string().min(1, { error: requiredMessage }).regex(PHONE_FORMAT, { error: MESSAGES.phoneFormat }));

const validEmail = (v: string) => charLength(v) <= LIMITS.email && EMAIL_FORMAT.test(v);

const optionalEmail = z
  .string()
  .transform(normalizeEmail)
  .refine((v) => v === "" || validEmail(v), { error: MESSAGES.email })
  .transform((v) => (v === "" ? null : v));

const yesNo = z.enum(YES_NO, { error: MESSAGES.yesNo });

const optionalOccasion = z
  .union([z.literal(""), z.enum(OCCASIONS)], { error: MESSAGES.occasion })
  .transform((v) => (v === "" ? null : v));

const optionalReferral = z
  .union([z.literal(""), z.enum(REFERRAL_SOURCES)], { error: MESSAGES.referral })
  .transform((v) => (v === "" ? null : v));

// ---- Page schemas ----------------------------------------------------------------

export const buyerPageSchema = z.object({
  buyer_name: requiredText(LIMITS.name, MESSAGES.buyerName),
  buyer_phone: phone(MESSAGES.phoneRequired),
  buyer_email: optionalEmail,
});

export const recipientPageSchema = z.object({
  recipient_name: requiredText(LIMITS.name, MESSAGES.recipientName),
  recipient_phone: phone(MESSAGES.phoneRequired),
  may_call_recipient: yesNo,
  /** Owned by this page only for pickup; see `fieldPage`. */
  special_notes: optionalText(LIMITS.longText),
});

export const cardPageSchema = z.object({
  occasion: optionalOccasion,
  card_from: optionalText(LIMITS.card),
  card_to: optionalText(LIMITS.card),
  card_message: optionalText(LIMITS.longText),
  /** Owned by this page only for home delivery; see `fieldPage`. */
  special_notes: optionalText(LIMITS.longText),
});

const invoiceShape = {
  wants_invoice: yesNo,
  // Lenient here: they only matter when the answer is Sí (see `finishInvoice`).
  invoice_legal_name: z.string(),
  invoice_tax_id: z.string(),
  invoice_email: z.string(),
  referral_source: optionalReferral,
};

interface InvoiceInput {
  wants_invoice: YesNo;
  invoice_legal_name: string;
  invoice_tax_id: string;
  invoice_email: string;
  referral_source: ReferralSource | null;
}

/**
 * Conditional invoice rule: on Sí the three fields are required and
 * normalized; on No they are cleared (the database does the same) and never
 * produce errors.
 */
function finishInvoice<T extends InvoiceInput>(v: T, ctx: z.core.$RefinementCtx<T>) {
  if (v.wants_invoice === "No") {
    return {
      ...v,
      wants_invoice: v.wants_invoice,
      invoice_legal_name: null,
      invoice_tax_id: null,
      invoice_email: null,
      referral_source: v.referral_source,
    };
  }
  const fail = (path: keyof InvoiceInput, message: string) =>
    ctx.issues.push({ code: "custom", message, input: v[path], path: [path] });

  const legalName = v.invoice_legal_name.trim();
  if (legalName === "") fail("invoice_legal_name", MESSAGES.legalName);
  else if (charLength(legalName) > LIMITS.name) fail("invoice_legal_name", MESSAGES.max(LIMITS.name));

  const taxId = normalizeTaxId(v.invoice_tax_id);
  if (!TAX_ID_FORMAT.test(taxId)) fail("invoice_tax_id", MESSAGES.taxId);

  const email = normalizeEmail(v.invoice_email);
  if (email === "") fail("invoice_email", MESSAGES.invoiceEmail);
  else if (!validEmail(email)) fail("invoice_email", MESSAGES.email);

  return {
    ...v,
    wants_invoice: v.wants_invoice,
    invoice_legal_name: legalName,
    invoice_tax_id: taxId,
    invoice_email: email,
    referral_source: v.referral_source,
  };
}

export const invoicePageSchema = z.object(invoiceShape).transform(finishInvoice);

// ---- Full schema -----------------------------------------------------------------

/**
 * Every field at once, for the server action (untrusted input). Home delivery
 * and pickup share it: `special_notes` is one optional field either way.
 */
export function createDetailsSchema() {
  return z
    .object({
      ...buyerPageSchema.shape,
      ...recipientPageSchema.shape,
      ...cardPageSchema.shape,
      ...invoiceShape,
    })
    .transform(finishInvoice) as unknown as z.ZodType<SaleDetails, DetailsDraft>;
}

export interface SaleDetails {
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  recipient_name: string;
  recipient_phone: string;
  may_call_recipient: YesNo;
  occasion: Occasion | null;
  card_from: string | null;
  card_to: string | null;
  card_message: string | null;
  special_notes: string | null;
  wants_invoice: YesNo;
  invoice_legal_name: string | null;
  invoice_tax_id: string | null;
  invoice_email: string | null;
  referral_source: ReferralSource | null;
}

// ---- Draft -----------------------------------------------------------------------

/** The form in progress: everything is a string, "" when empty. */
export interface DetailsDraft {
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  recipient_name: string;
  recipient_phone: string;
  may_call_recipient: "" | YesNo;
  occasion: "" | Occasion;
  card_from: string;
  card_to: string;
  card_message: string;
  special_notes: string;
  wants_invoice: "" | YesNo;
  invoice_legal_name: string;
  invoice_tax_id: string;
  invoice_email: string;
  referral_source: "" | ReferralSource;
}

export function emptyDetailsDraft(): DetailsDraft {
  return {
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    recipient_name: "",
    recipient_phone: "",
    may_call_recipient: "",
    occasion: "",
    card_from: "",
    card_to: "",
    card_message: "",
    special_notes: "",
    wants_invoice: "",
    invoice_legal_name: "",
    invoice_tax_id: "",
    invoice_email: "",
    referral_source: "",
  };
}

// ---- Pages -----------------------------------------------------------------------

export type DeliveryMethod = "tienda" | "domicilio";
export type DetailsPageNumber = 1 | 2 | 3 | 4;
export const DETAILS_PAGE_COUNT = 4;

export interface DetailsPage {
  number: DetailsPageNumber;
  id: "buyer" | "recipient" | "card" | "billing";
  title: string;
  fields: readonly (keyof DetailsDraft)[];
}

/** Sub-pages of step 2. Titles and the `special_notes` placement depend on the method. */
export function detailsPages(method: DeliveryMethod): DetailsPage[] {
  const notesOnRecipient = method === "tienda";
  return [
    { number: 1, id: "buyer", title: "Tus datos", fields: ["buyer_name", "buyer_phone", "buyer_email"] },
    {
      number: 2,
      id: "recipient",
      title: method === "tienda" ? "Quién recoge" : "Quién recibe",
      fields: [
        "recipient_name",
        "recipient_phone",
        "may_call_recipient",
        ...(notesOnRecipient ? (["special_notes"] as const) : []),
      ],
    },
    {
      number: 3,
      id: "card",
      title: "La tarjeta",
      fields: [
        "occasion",
        "card_from",
        "card_to",
        "card_message",
        ...(notesOnRecipient ? [] : (["special_notes"] as const)),
      ],
    },
    {
      number: 4,
      id: "billing",
      title: "Facturación",
      fields: ["wants_invoice", "invoice_legal_name", "invoice_tax_id", "invoice_email", "referral_source"],
    },
  ];
}

/** The sub-page a field is asked on, or null for fields not asked in step 2. */
export function fieldPage(field: string, method: DeliveryMethod): DetailsPageNumber | null {
  const page = detailsPages(method).find((p) => (p.fields as readonly string[]).includes(field));
  return page?.number ?? null;
}

export type PageResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

function collectErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field) errors[field] ??= issue.message;
  }
  return errors;
}

function pageSchema(number: DetailsPageNumber, method: DeliveryMethod) {
  const notesHere = (number === 2 && method === "tienda") || (number === 3 && method === "domicilio");
  switch (number) {
    case 1:
      return buyerPageSchema;
    case 2:
      return notesHere ? recipientPageSchema : recipientPageSchema.omit({ special_notes: true });
    case 3:
      return notesHere ? cardPageSchema : cardPageSchema.omit({ special_notes: true });
    case 4:
      return invoicePageSchema;
  }
}

/** Validates one sub-page of the draft; on failure, one message per field. */
export function validateDetailsPage(
  number: DetailsPageNumber,
  draft: DetailsDraft,
  method: DeliveryMethod,
): PageResult<Partial<SaleDetails>> {
  const parsed = (pageSchema(number, method) as z.ZodType<Partial<SaleDetails>>).safeParse(draft);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, errors: collectErrors(parsed.error) };
}

/** Validates all four sub-pages; the errors of every page are reported together. */
export function validateDetails(draft: DetailsDraft, method: DeliveryMethod): PageResult<SaleDetails> {
  const errors: Record<string, string> = {};
  let value: Partial<SaleDetails> = { special_notes: null };
  for (const number of [1, 2, 3, 4] as const) {
    const r = validateDetailsPage(number, draft, method);
    if (r.ok) value = { ...value, ...r.value };
    else Object.assign(errors, r.errors);
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: value as SaleDetails };
}

/**
 * Message for a field the database flagged (`DATOS_INVALIDOS.campos`) that the
 * client validation did not catch. Mirrors the problems list of the n8n form.
 */
export function serverFieldMessage(field: string): string {
  switch (field) {
    case "buyer_phone":
    case "recipient_phone":
      return MESSAGES.phoneFormat;
    case "buyer_email":
    case "invoice_email":
      return MESSAGES.email;
    case "invoice_tax_id":
      return MESSAGES.taxId;
    case "referral_source":
      return MESSAGES.referral;
    case "occasion":
      return MESSAGES.occasion;
    case "may_call_recipient":
    case "wants_invoice":
      return MESSAGES.yesNo;
    case "buyer_name":
    case "recipient_name":
    case "invoice_legal_name":
      return "Revisa este dato: es obligatorio y admite hasta 150 caracteres.";
    default:
      return "Revisa este dato.";
  }
}
