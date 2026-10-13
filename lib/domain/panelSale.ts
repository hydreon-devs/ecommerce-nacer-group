/**
 * Venta manual desde el panel (`/admin/pedidos/nuevo`): validación, payload de
 * `create_panel_sale`, mensajes de error por código y totales en vivo. Módulo
 * puro y probado; el contrato de la función está en
 * `docs/plans/2026-10-13-nuevo-pedido-manual-design.md`.
 */

export type Paso = "productos" | "entrega" | "pago" | "datos";

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

export const PAYMENT_SOURCES = [
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "Mercado Pago" },
] as const;

export const REFERRAL_SOURCES = ["Instagram", "Facebook", "Un conocido", "Google", "Otro"] as const;

/** Mismos topes que `submit_sale_details` en la base. */
export const DETAIL_LIMITS = {
  buyer_name: 150,
  buyer_email: 150,
  recipient_name: 150,
  delivery_unit: 120,
  building_name: 120,
  neighborhood: 120,
  city: 120,
  card_from: 100,
  card_to: 100,
  card_message: 1000,
  special_notes: 1000,
  invoice_legal_name: 150,
  invoice_email: 150,
} as const;
export const ADDRESS_MAX = 200;
export const PAYMENT_REF_MAX = 100;

const DETAIL_KEYS = [
  "buyer_name",
  "buyer_phone",
  "buyer_email",
  "recipient_name",
  "recipient_phone",
  "may_call_recipient",
  "delivery_unit",
  "building_name",
  "neighborhood",
  "city",
  "card_from",
  "card_to",
  "card_message",
  "special_notes",
  "wants_invoice",
  "invoice_legal_name",
  "invoice_tax_id",
  "invoice_email",
  "referral_source",
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

export interface SaleLineInput {
  variantSku: string;
  qty: number;
  optionName: string | null;
  optionQty: number;
}

export interface PanelSaleInput {
  lines: SaleLineInput[];
  deliveryMethod: "tienda" | "domicilio";
  deliveryZone: number | null;
  deliveryAddress: string;
  desiredDeliveryDate: string;
  occasion: string;
  paymentSource: "transferencia" | "mercadopago";
  paymentRef: string;
  details: Record<DetailKey, string>;
}

export type ValidationResult =
  | { ok: true; value: PanelSaleInput }
  | { ok: false; errors: Record<string, string> };

/** Solo dígitos: se quitan espacios, signos y paréntesis. */
export function normalizePhone(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\D/g, "") : "";
}

function str(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_ID = /^[0-9]{5,15}(-[0-9])?$/;
const PHONE = /^[0-9]{7,15}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function positiveInt(raw: unknown, max = 9999): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

/**
 * Valida y normaliza lo que llega del formulario (la acción del servidor lo
 * recibe como `unknown`). Las claves de `errors` son nombres de campo; las de
 * línea son `line:<índice>`.
 */
export function validatePanelSale(raw: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  if (!isRecord(raw)) return { ok: false, errors: { lines: "Datos del pedido inválidos." } };

  // Productos
  const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
  const lines: SaleLineInput[] = [];
  if (rawLines.length === 0) errors.lines = "Agrega al menos un producto.";
  rawLines.forEach((item, index) => {
    const line = isRecord(item) ? item : {};
    const variantSku = str(line.variantSku);
    const qty = positiveInt(line.qty);
    const optionName = str(line.optionName) || null;
    const optionQty = optionName ? positiveInt(line.optionQty ?? 1) : 1;
    if (!variantSku) errors[`line:${index}`] = "Elige un producto.";
    else if (qty === null) errors[`line:${index}`] = "La cantidad debe ser un entero de 1 a 9999.";
    else if (optionQty === null) errors[`line:${index}`] = "La cantidad del adicional no es válida.";
    else lines.push({ variantSku, qty, optionName, optionQty });
  });

  // Entrega
  const deliveryMethod = str(raw.deliveryMethod);
  if (deliveryMethod !== "tienda" && deliveryMethod !== "domicilio") {
    errors.delivery_method = "Elige recoger en tienda o domicilio.";
  }
  const isDelivery = deliveryMethod === "domicilio";
  let deliveryZone: number | null = null;
  let deliveryAddress = "";
  if (isDelivery) {
    deliveryZone = positiveInt(raw.deliveryZone, 99);
    if (deliveryZone === null) errors.delivery_zone = "Elige la zona de domicilio.";
    deliveryAddress = str(raw.deliveryAddress);
    if (!deliveryAddress) errors.delivery_address = "La dirección es obligatoria para domicilio.";
    else if (deliveryAddress.length > ADDRESS_MAX) {
      errors.delivery_address = `La dirección admite máximo ${ADDRESS_MAX} caracteres.`;
    }
  }
  const desiredDeliveryDate = str(raw.desiredDeliveryDate);
  if (desiredDeliveryDate && !isRealDate(desiredDeliveryDate)) {
    errors.desired_delivery_date = "La fecha de entrega no es válida.";
  }
  const occasion = str(raw.occasion);
  if (occasion && !(OCCASIONS as readonly string[]).includes(occasion)) {
    errors.occasion = "Elige una ocasión de la lista.";
  }

  // Pago
  const paymentSource = str(raw.paymentSource);
  if (paymentSource !== "transferencia" && paymentSource !== "mercadopago") {
    errors.payment_source = "Elige el medio de pago.";
  }
  const paymentRef = str(raw.paymentRef);
  if (paymentRef.length > PAYMENT_REF_MAX) {
    errors.payment_ref = `La referencia admite máximo ${PAYMENT_REF_MAX} caracteres.`;
  }

  // Comprador, destinatario, tarjeta y factura
  const src = isRecord(raw.details) ? raw.details : {};
  const details = Object.fromEntries(DETAIL_KEYS.map((key) => [key, str(src[key])])) as Record<
    DetailKey,
    string
  >;
  details.buyer_phone = normalizePhone(details.buyer_phone);
  details.recipient_phone = normalizePhone(details.recipient_phone);
  details.may_call_recipient = details.may_call_recipient === "no" ? "no" : "si";
  details.wants_invoice = details.wants_invoice === "si" ? "si" : "no";
  if (details.wants_invoice === "no") {
    details.invoice_legal_name = "";
    details.invoice_tax_id = "";
    details.invoice_email = "";
  }

  if (!details.buyer_name) errors.buyer_name = "El nombre del comprador es obligatorio.";
  if (!PHONE.test(details.buyer_phone)) {
    errors.buyer_phone = "El celular debe tener entre 7 y 15 dígitos.";
  }
  if (details.recipient_phone && !PHONE.test(details.recipient_phone)) {
    errors.recipient_phone = "El teléfono debe tener entre 7 y 15 dígitos.";
  }
  for (const [key, max] of Object.entries(DETAIL_LIMITS)) {
    const value = details[key as DetailKey];
    if (value.length > max) errors[key] = `Admite máximo ${max} caracteres.`;
  }
  for (const key of ["buyer_email", "invoice_email"] as const) {
    if (details[key] && !EMAIL.test(details[key])) errors[key] = "El correo no es válido.";
  }
  if (details.wants_invoice === "si") {
    if (details.invoice_tax_id && !TAX_ID.test(details.invoice_tax_id)) {
      errors.invoice_tax_id = "Usa solo dígitos, con guion y dígito de verificación si aplica.";
    }
  }
  if (
    details.referral_source &&
    !(REFERRAL_SOURCES as readonly string[]).includes(details.referral_source)
  ) {
    errors.referral_source = "Elige una opción de la lista.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      lines,
      deliveryMethod: deliveryMethod as PanelSaleInput["deliveryMethod"],
      deliveryZone,
      deliveryAddress,
      desiredDeliveryDate,
      occasion,
      paymentSource: paymentSource as PanelSaleInput["paymentSource"],
      paymentRef,
      details,
    },
  };
}

/** Paso del contrato al que pertenece un campo (para ubicar el mensaje en el formulario). */
export function fieldPaso(field: string): Paso {
  if (field === "lines" || field.startsWith("line:")) return "productos";
  if (
    field === "delivery_method" ||
    field === "delivery_zone" ||
    field === "delivery_address" ||
    field === "desired_delivery_date" ||
    field === "occasion"
  ) {
    return "entrega";
  }
  if (field === "payment_source" || field === "payment_ref") return "pago";
  return "datos";
}

/**
 * Payload exacto de `create_panel_sale`. `advisorName` sale del usuario
 * autenticado en el servidor, nunca del cliente. La dirección de entrega se
 * reutiliza como `delivery_address_exact` de los datos de la venta.
 */
export function buildPanelSalePayload(input: PanelSaleInput, advisorName: string) {
  const isDelivery = input.deliveryMethod === "domicilio";
  const payload: Record<string, unknown> & {
    lines: Record<string, unknown>[];
    details: Record<string, string>;
  } = {
    advisor_name: advisorName,
    payment_source: input.paymentSource,
    delivery_method: input.deliveryMethod,
    lines: input.lines.map((line) =>
      line.optionName
        ? { variant_sku: line.variantSku, qty: line.qty, option_name: line.optionName, option_qty: line.optionQty }
        : { variant_sku: line.variantSku, qty: line.qty },
    ),
    details: { ...input.details, delivery_address_exact: isDelivery ? input.deliveryAddress : "" },
  };
  if (input.paymentRef) payload.payment_ref = input.paymentRef;
  if (isDelivery) {
    payload.delivery_zone = input.deliveryZone;
    payload.delivery_address = input.deliveryAddress;
  }
  if (input.desiredDeliveryDate) payload.desired_delivery_date = input.desiredDeliveryDate;
  if (input.occasion) payload.occasion = input.occasion;
  return payload;
}

export interface SaleErrorView {
  paso: Paso;
  message: string;
  /** Campos a marcar: nombres de campo, `line:<sku>` o `lines`. */
  fields: string[];
}

function pasoOf(value: unknown, fallback: Paso): Paso {
  return value === "productos" || value === "entrega" || value === "pago" || value === "datos"
    ? value
    : fallback;
}

function units(n: number): string {
  if (n <= 0) return "no quedan unidades";
  return n === 1 ? "queda 1 unidad" : `quedan ${n} unidades`;
}

/**
 * Mensaje en español según el código de error de la base. El texto `mensaje`
 * de la función está escrito para el modelo del asistente y nunca se muestra.
 * `names` traduce el SKU de variante al nombre que ve el asesor.
 */
export function mapSaleError(raw: unknown, names: Record<string, string>): SaleErrorView {
  const res = isRecord(raw) ? raw : {};
  const code = typeof res.error === "string" ? res.error : "";
  const sku = typeof res.variant_sku === "string" ? res.variant_sku : null;
  const label = (sku && names[sku]) || "el producto";
  const lineFields = sku ? [`line:${sku}`] : ["lines"];
  const paso = pasoOf(res.paso, "datos");
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

  switch (code) {
    case "PEDIDO_SIN_LINEAS":
      return { paso: "productos", message: "Agrega al menos un producto.", fields: ["lines"] };
    case "LINEA_INVALIDA":
      return { paso: "productos", message: "Una línea tiene datos inválidos. Revisa el producto y la cantidad.", fields: ["lines"] };
    case "VARIANTE_NO_DISPONIBLE":
      return { paso: "productos", message: `${label} ya no está disponible. Quítalo o elige otro.`, fields: lineFields };
    case "SKU_ES_PRODUCTO":
      return { paso: "productos", message: `La referencia de ${label} no corresponde a una variante. Vuelve a elegirlo.`, fields: lineFields };
    case "STOCK_INSUFICIENTE":
      return { paso: "productos", message: `No hay stock suficiente de ${label}: ${units(num(res.unidades))}.`, fields: lineFields };
    case "OPCION_NO_EXISTE":
      return { paso: "productos", message: `El adicional elegido para ${label} ya no existe.`, fields: lineFields };
    case "OPCION_EXCEDE_MAXIMO":
      return { paso: "productos", message: `El adicional de ${label} admite máximo ${num(res.maximo)}.`, fields: lineFields };
    case "METODO_INVALIDO":
      return { paso: "entrega", message: "Elige recoger en tienda o domicilio.", fields: ["delivery_method"] };
    case "DIRECCION_REQUERIDA":
      return { paso: "entrega", message: "La dirección es obligatoria para domicilio.", fields: ["delivery_address"] };
    case "ZONA_INVALIDA":
      return { paso: "entrega", message: "La zona de domicilio no es válida.", fields: ["delivery_zone"] };
    case "FECHA_INVALIDA":
      return { paso: "entrega", message: "La fecha de entrega no es válida.", fields: ["desired_delivery_date"] };
    case "ORIGEN_INVALIDO":
      return { paso: "pago", message: "El medio de pago no es válido.", fields: ["payment_source"] };
    case "PAGO_YA_APLICADO":
      return { paso: "pago", message: "Esa referencia de pago ya confirmó otro pedido.", fields: ["payment_ref"] };
    case "LINEAS_INVALIDAS":
      return { paso: "pago", message: "Los productos no coinciden con el pago. Revisa las líneas e inténtalo de nuevo.", fields: ["lines"] };
    case "VENDEDOR_REQUERIDO":
      return { paso: "datos", message: "No se pudo identificar al asesor de esta sesión. Cierra sesión y vuelve a entrar.", fields: [] };
    case "DATOS_INVALIDOS": {
      const campos = Array.isArray(res.campos) ? res.campos.filter((c): c is string => typeof c === "string") : [];
      const restriction = typeof res.restriccion === "string" ? res.restriccion : "";
      if (campos.length === 0 && restriction.includes("occasion")) {
        return { paso, message: "La ocasión elegida no es válida.", fields: ["occasion"] };
      }
      return { paso, message: "Revisa los campos marcados.", fields: campos };
    }
    default:
      return { paso, message: "No se pudo registrar el pedido. Revisa los datos e inténtalo de nuevo.", fields: [] };
  }
}

// --- Catálogo y totales -------------------------------------------------

export interface CatalogVariant {
  sku: string;
  label: string;
  price: number;
  available: number;
}
export interface CatalogOption {
  name: string;
  price: number;
  maxQty: number;
}
export interface CatalogProduct {
  id: string;
  name: string;
  variants: CatalogVariant[];
  options: CatalogOption[];
}
export interface DeliveryZone {
  number: number;
  value: number;
}

export interface Totals {
  products: number;
  addOns: number;
  delivery: number;
  total: number;
}

/** Total en vivo: productos + adicionales + valor de la zona. Enteros COP. */
export function computeTotals(
  lines: SaleLineInput[],
  catalog: CatalogProduct[],
  deliveryValue: number,
): Totals {
  let products = 0;
  let addOns = 0;
  for (const line of lines) {
    const product = catalog.find((p) => p.variants.some((v) => v.sku === line.variantSku));
    const variant = product?.variants.find((v) => v.sku === line.variantSku);
    if (!product || !variant) continue;
    products += variant.price * line.qty;
    const option = line.optionName ? product.options.find((o) => o.name === line.optionName) : undefined;
    // El adicional va por unidad: `reserve_variant` lo suma al precio unitario de la línea.
    if (option) addOns += option.price * line.optionQty * line.qty;
  }
  return { products, addOns, delivery: deliveryValue, total: products + addOns + deliveryValue };
}

/** Línea del formulario "Nuevo pedido"; `optionName` vacío es sin adicional. */
export interface FormLine {
  key: number;
  productId: string;
  variantSku: string;
  qty: number;
  optionName: string;
  optionQty: number;
}

/**
 * Elegir un producto en el buscador. No repite líneas iguales: primero usa una
 * variante con stock que aún no esté en el pedido; si todas están, sube en uno
 * la línea sin adicional de ese producto; y si solo hay líneas con adicional,
 * agrega una sin adicional (elegir el producto otra vez no suma adicionales).
 * Sin unidades libres devuelve las líneas tal cual.
 */
export function addProductToLines(lines: FormLine[], product: CatalogProduct, key: number): FormLine[] {
  const taken = (sku: string) => lines.filter((l) => l.variantSku === sku).reduce((sum, l) => sum + l.qty, 0);
  const withRoom = product.variants.filter((v) => v.available - taken(v.sku) > 0);
  if (withRoom.length === 0) return lines;

  const newLine = (sku: string): FormLine => ({
    key,
    productId: product.id,
    variantSku: sku,
    qty: 1,
    optionName: "",
    optionQty: 1,
  });

  const unused = withRoom.find((v) => !lines.some((l) => l.variantSku === v.sku));
  if (unused) return [...lines, newLine(unused.sku)];

  const plain = lines.find((l) => l.optionName === "" && withRoom.some((v) => v.sku === l.variantSku));
  if (plain) return lines.map((l) => (l === plain ? { ...l, qty: l.qty + 1 } : l));

  return [...lines, newLine(withRoom[0].sku)];
}

/**
 * Une las líneas con la misma variante y el mismo adicional en la primera,
 * sumando cantidades: cambiar la variante o el adicional de una línea puede
 * dejarla igual a otra.
 */
export function mergeDuplicateLines(lines: FormLine[]): FormLine[] {
  const identity = (l: FormLine) => `${l.variantSku}|${l.optionName}|${l.optionName === "" ? "" : l.optionQty}`;
  const merged = new Map<string, FormLine>();
  for (const line of lines) {
    const id = identity(line);
    const first = merged.get(id);
    merged.set(id, first ? { ...first, qty: first.qty + line.qty } : line);
  }
  return [...merged.values()];
}

/** Etiqueta de variante a partir de `attributes`; sin atributos es "Única". */
export function variantLabel(attributes: Record<string, string> | null | undefined): string {
  const values = Object.values(attributes ?? {}).filter((v) => typeof v === "string" && v.trim() !== "");
  return values.length > 0 ? values.join(" · ") : "Única";
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filterProducts(products: CatalogProduct[], query: string): CatalogProduct[] {
  const q = fold(query.trim());
  return q === "" ? products : products.filter((p) => fold(p.name).includes(q));
}

/** Nombre del asesor: el del perfil del usuario autenticado o, si no, su correo. Máx. 100 como la base. */
export function advisorNameFor(
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null,
): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  const name = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return (name ?? user.email ?? "").trim().slice(0, 100);
}

// --- Pedidos del panel en las vistas existentes -------------------------

/** Los pedidos del panel nacen con `chat_id = 'panel:<uuid>'`, un id sintético y no un celular. */
export function isPanelChat(chatId: string | null | undefined): boolean {
  return typeof chatId === "string" && chatId.startsWith("panel:");
}

/**
 * Zona (1 = primer tramo de `delivery_tariffs`) cuyo valor es la tarifa del
 * domicilio. `set_delivery` guarda la tarifa del tramo, así que se identifica
 * por ella y no por los kilómetros.
 */
export function zoneNumberForFee(fee: number | null | undefined, zoneValues: number[]): number | null {
  if (fee === null || fee === undefined) return null;
  const index = zoneValues.findIndex((value) => value === Number(fee));
  return index === -1 ? null : index + 1;
}
