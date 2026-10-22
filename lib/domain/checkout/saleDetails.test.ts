import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buyerPageSchema,
  cardPageSchema,
  createDetailsSchema,
  detailsPages,
  emptyDetailsDraft,
  fieldPage,
  invoicePageSchema,
  normalizeEmail,
  normalizePhone,
  normalizeTaxId,
  OCCASIONS,
  OCCASION_LABELS,
  recipientPageSchema,
  validateDetails,
  validateDetailsPage,
  type DetailsDraft,
} from "./saleDetails.ts";

function draft(patch: Partial<DetailsDraft> = {}): DetailsDraft {
  return {
    ...emptyDetailsDraft(),
    buyer_name: "Ana Restrepo",
    buyer_phone: "300 123 4567",
    recipient_name: "Luisa Gómez",
    recipient_phone: "310-555-0100",
    may_call_recipient: "Sí",
    wants_invoice: "No",
    ...patch,
  };
}

describe("phone normalization (mirrors normalize_phone in the database)", () => {
  it("strips + space - . ( ) and prepends 57 to a 10-digit mobile starting with 3", () => {
    assert.equal(normalizePhone("300 123 4567"), "573001234567");
    assert.equal(normalizePhone("(300) 123-4567"), "573001234567");
    assert.equal(normalizePhone("300.123.4567"), "573001234567");
  });

  it("keeps a leading + number as is, without the +", () => {
    assert.equal(normalizePhone("+1 305 555 0100"), "13055550100");
    assert.equal(normalizePhone("+57 300 123 4567"), "573001234567");
  });

  it("reads a leading 00 as +", () => {
    assert.equal(normalizePhone("0057 300 123 4567"), "573001234567");
    assert.equal(normalizePhone("001 305 555 0100"), "13055550100");
  });

  it("leaves other digit strings alone, including 10 digits that do not start with 3", () => {
    assert.equal(normalizePhone("604 444 1234"), "6044441234");
    assert.equal(normalizePhone("4441234"), "4441234");
  });

  it("returns an empty string for blank input and keeps letters so validation fails", () => {
    assert.equal(normalizePhone("   "), "");
    assert.equal(normalizePhone("300abc4567"), "300abc4567");
  });
});

describe("email and tax id normalization", () => {
  it("lowercases and trims emails", () => {
    assert.equal(normalizeEmail("  Ana@Correo.COM "), "ana@correo.com");
  });

  it("strips dots and spaces from the tax id, keeping the check digit", () => {
    assert.equal(normalizeTaxId(" 900.123.456-7 "), "900123456-7");
    assert.equal(normalizeTaxId("1 020 304 050"), "1020304050");
  });
});

describe("occasions", () => {
  it("lists the 12 database values, each with a friendly label", () => {
    assert.deepEqual([...OCCASIONS], [
      "cumpleaños", "condolencias", "grados", "felicitaciones", "nacimiento/bautizo", "boda",
      "aniversario", "recuperación", "fecha especial", "navidad", "laboral", "otro",
    ]);
    for (const o of OCCASIONS) assert.ok(OCCASION_LABELS[o].length > 0, o);
    assert.equal(OCCASION_LABELS["nacimiento/bautizo"], "Nacimiento o bautizo");
  });
});

describe("page 1: buyer", () => {
  const ok = { buyer_name: "Ana", buyer_phone: "300 123 4567", buyer_email: "" };

  it("normalizes the phone and treats a blank email as absent", () => {
    const r = buyerPageSchema.safeParse(ok);
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.buyer_phone, "573001234567");
      assert.equal(r.data.buyer_email, null);
    }
  });

  it("lowercases a given email", () => {
    const r = buyerPageSchema.safeParse({ ...ok, buyer_email: "Ana@Correo.com" });
    assert.equal(r.success && r.data.buyer_email, "ana@correo.com");
  });

  it("requires name and phone", () => {
    const r = buyerPageSchema.safeParse({ buyer_name: " ", buyer_phone: "", buyer_email: "" });
    assert.equal(r.success, false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      assert.deepEqual(fields.sort(), ["buyer_name", "buyer_phone"]);
    }
  });

  it("rejects phones outside 7-15 digits and phones with letters", () => {
    for (const phone of ["123456", "1234567890123456", "300abc4567", "++57300"]) {
      assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_phone: phone }).success, false, phone);
    }
    for (const phone of ["1234567", "123456789012345"]) {
      assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_phone: phone }).success, true, phone);
    }
  });

  it("rejects malformed emails and emails over 254 characters", () => {
    for (const email of ["ana", "ana@", "ana@correo", "a b@correo.com", "ana@@correo.com"]) {
      assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_email: email }).success, false, email);
    }
    const long = `${"a".repeat(250)}@b.co`;
    assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_email: long }).success, false);
  });

  it("limits the name to 150 characters, counting characters like the database", () => {
    assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_name: "a".repeat(150) }).success, true);
    assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_name: "a".repeat(151) }).success, false);
    // 150 emoji are 300 UTF-16 units but 150 characters for Postgres.
    assert.equal(buyerPageSchema.safeParse({ ...ok, buyer_name: "🦋".repeat(150) }).success, true);
  });
});

describe("page 2: recipient", () => {
  const ok = { recipient_name: "Luisa", recipient_phone: "3105550100", may_call_recipient: "No", special_notes: "" };

  it("requires name, phone and an explicit Sí/No", () => {
    assert.equal(recipientPageSchema.safeParse(ok).success, true);
    const r = recipientPageSchema.safeParse({ ...ok, recipient_name: "", recipient_phone: "", may_call_recipient: "" });
    assert.equal(r.success, false);
    if (!r.success) {
      assert.deepEqual(r.error.issues.map((i) => i.path[0]).sort(), ["may_call_recipient", "recipient_name", "recipient_phone"]);
    }
  });

  it("accepts only Sí or No", () => {
    for (const v of ["Si", "si", "yes", "true", "Quizá"]) {
      assert.equal(recipientPageSchema.safeParse({ ...ok, may_call_recipient: v }).success, false, v);
    }
    assert.equal(recipientPageSchema.safeParse({ ...ok, may_call_recipient: "Sí" }).success, true);
  });

  it("validates special notes up to 1000 characters (pickup keeps them here)", () => {
    assert.equal(recipientPageSchema.safeParse({ ...ok, special_notes: "x".repeat(1000) }).success, true);
    assert.equal(recipientPageSchema.safeParse({ ...ok, special_notes: "x".repeat(1001) }).success, false);
  });
});

describe("page 3: card", () => {
  const ok = { occasion: "", card_from: "", card_to: "", card_message: "", special_notes: "" };

  it("is entirely optional", () => {
    const r = cardPageSchema.safeParse(ok);
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.occasion, null);
      assert.equal(r.data.card_message, null);
    }
  });

  it("accepts only the 12 occasions", () => {
    assert.equal(cardPageSchema.safeParse({ ...ok, occasion: "condolencias" }).success, true);
    assert.equal(cardPageSchema.safeParse({ ...ok, occasion: "Condolencias" }).success, false);
    assert.equal(cardPageSchema.safeParse({ ...ok, occasion: "san valentín" }).success, false);
  });

  it("applies the length limits: De/Para 100, message 1000", () => {
    assert.equal(cardPageSchema.safeParse({ ...ok, card_from: "a".repeat(100), card_to: "b".repeat(100) }).success, true);
    assert.equal(cardPageSchema.safeParse({ ...ok, card_from: "a".repeat(101) }).success, false);
    assert.equal(cardPageSchema.safeParse({ ...ok, card_to: "b".repeat(101) }).success, false);
    assert.equal(cardPageSchema.safeParse({ ...ok, card_message: "m".repeat(1000) }).success, true);
    assert.equal(cardPageSchema.safeParse({ ...ok, card_message: "m".repeat(1001) }).success, false);
  });

  it("trims whitespace", () => {
    const r = cardPageSchema.safeParse({ ...ok, card_from: "  Mamá  " });
    assert.equal(r.success && r.data.card_from, "Mamá");
  });
});

describe("page 4: invoice and referral", () => {
  it("needs only the yes/no answer when the answer is No, and clears the invoice fields", () => {
    const r = invoicePageSchema.safeParse({
      wants_invoice: "No",
      invoice_legal_name: "Ignored SAS",
      invoice_tax_id: "not a tax id",
      invoice_email: "nope",
      referral_source: "",
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.invoice_legal_name, null);
      assert.equal(r.data.invoice_tax_id, null);
      assert.equal(r.data.invoice_email, null);
      assert.equal(r.data.referral_source, null);
    }
  });

  it("requires an answer", () => {
    const r = invoicePageSchema.safeParse({ wants_invoice: "", invoice_legal_name: "", invoice_tax_id: "", invoice_email: "", referral_source: "" });
    assert.equal(r.success, false);
    if (!r.success) assert.deepEqual(r.error.issues.map((i) => i.path[0]), ["wants_invoice"]);
  });

  it("requires the three fields on Sí, one error per missing field", () => {
    const r = invoicePageSchema.safeParse({ wants_invoice: "Sí", invoice_legal_name: "", invoice_tax_id: "", invoice_email: "", referral_source: "" });
    assert.equal(r.success, false);
    if (!r.success) {
      assert.deepEqual(r.error.issues.map((i) => i.path[0]).sort(), ["invoice_email", "invoice_legal_name", "invoice_tax_id"]);
    }
  });

  it("normalizes tax id and email on Sí", () => {
    const r = invoicePageSchema.safeParse({
      wants_invoice: "Sí",
      invoice_legal_name: " Flores SAS ",
      invoice_tax_id: "900.123.456-7",
      invoice_email: "Facturas@Flores.CO",
      referral_source: "Instagram",
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.invoice_legal_name, "Flores SAS");
      assert.equal(r.data.invoice_tax_id, "900123456-7");
      assert.equal(r.data.invoice_email, "facturas@flores.co");
      assert.equal(r.data.referral_source, "Instagram");
    }
  });

  it("validates the tax id format ^[0-9]{5,15}(-[0-9])?$", () => {
    const base = { wants_invoice: "Sí", invoice_legal_name: "X", invoice_email: "a@b.co", referral_source: "" };
    for (const id of ["1234", "1234567890123456", "900123456-77", "900123456-", "abc12345", "900-123456"]) {
      assert.equal(invoicePageSchema.safeParse({ ...base, invoice_tax_id: id }).success, false, id);
    }
    for (const id of ["12345", "123456789012345", "900123456-7"]) {
      assert.equal(invoicePageSchema.safeParse({ ...base, invoice_tax_id: id }).success, true, id);
    }
  });

  it("limits the legal name to 150 characters", () => {
    const base = { wants_invoice: "Sí", invoice_tax_id: "12345", invoice_email: "a@b.co", referral_source: "" };
    assert.equal(invoicePageSchema.safeParse({ ...base, invoice_legal_name: "n".repeat(150) }).success, true);
    assert.equal(invoicePageSchema.safeParse({ ...base, invoice_legal_name: "n".repeat(151) }).success, false);
  });

  it("accepts only the five referral sources", () => {
    const base = { wants_invoice: "No", invoice_legal_name: "", invoice_tax_id: "", invoice_email: "" };
    for (const s of ["Instagram", "Facebook", "Un conocido", "Google", "Otro", ""]) {
      assert.equal(invoicePageSchema.safeParse({ ...base, referral_source: s }).success, true, s);
    }
    assert.equal(invoicePageSchema.safeParse({ ...base, referral_source: "TikTok" }).success, false);
  });
});

describe("full schema and required set per method", () => {
  it("accepts a complete pickup draft and a complete delivery draft", () => {
    assert.equal(validateDetails(draft(), "tienda").ok, true);
    assert.equal(validateDetails(draft(), "domicilio").ok, true);
  });

  it("returns the normalized values the database would store", () => {
    const r = validateDetails(draft({ buyer_email: "ANA@Correo.com", card_from: " Mamá " }), "domicilio");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.buyer_phone, "573001234567");
      assert.equal(r.value.recipient_phone, "573105550100");
      assert.equal(r.value.buyer_email, "ana@correo.com");
      assert.equal(r.value.card_from, "Mamá");
      assert.equal(r.value.occasion, null);
      assert.equal(r.value.invoice_tax_id, null);
    }
  });

  it("reports every missing required field at once", () => {
    const r = validateDetails(emptyDetailsDraft(), "tienda");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.deepEqual(
        Object.keys(r.errors).sort(),
        ["buyer_name", "buyer_phone", "may_call_recipient", "recipient_name", "recipient_phone", "wants_invoice"],
      );
    }
  });

  it("requires the three invoice fields only when the answer is Sí", () => {
    const r = validateDetails(draft({ wants_invoice: "Sí" }), "tienda");
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["invoice_email", "invoice_legal_name", "invoice_tax_id"]);
  });

  it("createDetailsSchema parses the raw draft in one go", () => {
    const schema = createDetailsSchema();
    assert.equal(schema.safeParse(draft()).success, true);
    assert.equal(schema.safeParse({ ...draft(), buyer_phone: "12" }).success, false);
  });

  it("createDetailsSchema keeps every normalized field", () => {
    const r = createDetailsSchema().safeParse(draft({ buyer_email: "A@B.co", occasion: "boda" }));
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.buyer_phone, "573001234567");
      assert.equal(r.data.recipient_name, "Luisa Gómez");
      assert.equal(r.data.buyer_email, "a@b.co");
      assert.equal(r.data.occasion, "boda");
      assert.equal(r.data.invoice_tax_id, null);
    }
  });

  it("rejects unknown shapes (the server validates untrusted input)", () => {
    assert.equal(createDetailsSchema().safeParse(null).success, false);
    assert.equal(createDetailsSchema().safeParse({ buyer_name: 5 }).success, false);
  });
});

describe("pages and where each field lives", () => {
  it("has four pages in order: buyer, recipient, card, billing", () => {
    assert.deepEqual(detailsPages("domicilio").map((p) => p.id), ["buyer", "recipient", "card", "billing"]);
  });

  it("puts special_notes on the card page for delivery and on the recipient page for pickup", () => {
    assert.equal(fieldPage("special_notes", "domicilio"), 3);
    assert.equal(fieldPage("special_notes", "tienda"), 2);
  });

  it("maps every field to its page", () => {
    const expected: Record<string, number> = {
      buyer_name: 1, buyer_phone: 1, buyer_email: 1,
      recipient_name: 2, recipient_phone: 2, may_call_recipient: 2,
      occasion: 3, card_from: 3, card_to: 3, card_message: 3,
      wants_invoice: 4, invoice_legal_name: 4, invoice_tax_id: 4, invoice_email: 4, referral_source: 4,
    };
    for (const [field, page] of Object.entries(expected)) {
      assert.equal(fieldPage(field, "domicilio"), page, field);
    }
    assert.equal(fieldPage("neighborhood", "domicilio"), null);
  });
});

describe("per-page validation", () => {
  it("validates only the fields of that page", () => {
    const d = emptyDetailsDraft();
    const page1 = validateDetailsPage(1, d, "domicilio");
    assert.equal(page1.ok, false);
    if (!page1.ok) assert.deepEqual(Object.keys(page1.errors).sort(), ["buyer_name", "buyer_phone"]);
    const page3 = validateDetailsPage(3, d, "domicilio");
    assert.equal(page3.ok, true);
    const page2 = validateDetailsPage(2, d, "tienda");
    assert.equal(page2.ok, false);
  });

  it("validates special_notes on the right page for each method", () => {
    const long = draft({ special_notes: "x".repeat(1001) });
    assert.equal(validateDetailsPage(2, long, "tienda").ok, false);
    assert.equal(validateDetailsPage(2, long, "domicilio").ok, true);
    assert.equal(validateDetailsPage(3, long, "domicilio").ok, false);
    assert.equal(validateDetailsPage(3, long, "tienda").ok, true);
  });

  it("gives a Spanish message per field", () => {
    const r = validateDetailsPage(1, draft({ buyer_phone: "12", buyer_email: "ana" }), "tienda");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.errors.buyer_phone, /número|celular|dígitos/i);
      assert.match(r.errors.buyer_email, /correo/i);
    }
  });
});
