import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDeliveryStepSchema,
  currentQuote,
  emptyDraft,
  parseStoredDraft,
  reconcileDraft,
  serializeDraft,
  toDeliveryStep,
  type DeliveryDraft,
} from "./deliveryStep.ts";

const CALENDAR = ["2026-10-22", "2026-10-23", "2026-10-24"];
const schema = createDeliveryStepSchema(CALENDAR);

const domicilio = {
  method: "domicilio",
  address: "Calle 10 #5-20",
  municipality: "Envigado",
  neighborhood: "Zona 4",
  unit: "Torre 2 apto 301",
  resolvedAddress: "Cl. 10 #5-20, Envigado, Antioquia, Colombia",
  meters: 5421,
  feeCop: 25_000,
  confirmed: true,
  date: "2026-10-23",
};

describe("delivery step schema", () => {
  it("accepts pickup with a calendar date", () => {
    assert.equal(schema.safeParse({ method: "tienda", date: "2026-10-22" }).success, true);
  });

  it("rejects pickup with a date outside the calendar (Sunday, past, too far)", () => {
    for (const date of ["2026-10-25", "2026-10-21", "2027-01-01", "", "mañana"]) {
      assert.equal(schema.safeParse({ method: "tienda", date }).success, false, date);
    }
  });

  it("accepts a fully confirmed home delivery", () => {
    assert.equal(schema.safeParse(domicilio).success, true);
  });

  it("makes apartment / tower optional", () => {
    const rest: Record<string, unknown> = { ...domicilio };
    delete rest.unit;
    assert.equal(schema.safeParse(rest).success, true);
  });

  it("requires the customer's confirmation of the address", () => {
    assert.equal(schema.safeParse({ ...domicilio, confirmed: false }).success, false);
    const rest: Record<string, unknown> = { ...domicilio };
    delete rest.confirmed;
    assert.equal(schema.safeParse(rest).success, false);
  });

  it("rejects an unknown municipality", () => {
    assert.equal(schema.safeParse({ ...domicilio, municipality: "Bogotá" }).success, false);
  });

  it("requires neighborhood, address and the resolved address", () => {
    for (const patch of [{ neighborhood: "  " }, { address: "" }, { resolvedAddress: "" }]) {
      assert.equal(schema.safeParse({ ...domicilio, ...patch }).success, false);
    }
  });

  it("rejects non-integer or negative meters and fees", () => {
    for (const patch of [{ meters: 10.5 }, { meters: -1 }, { feeCop: 18000.5 }, { feeCop: -1 }]) {
      assert.equal(schema.safeParse({ ...domicilio, ...patch }).success, false);
    }
  });

  it("rejects home delivery with a date outside the calendar", () => {
    assert.equal(schema.safeParse({ ...domicilio, date: "2026-10-25" }).success, false);
  });

  it("rejects an unknown method", () => {
    assert.equal(schema.safeParse({ method: "drone", date: "2026-10-22" }).success, false);
  });
});

function fullDraft(overrides: Partial<DeliveryDraft> = {}): DeliveryDraft {
  return {
    method: "domicilio",
    address: "Calle 10 #5-20",
    municipality: "Envigado",
    neighborhood: "Zona 4",
    unit: "",
    quote: {
      address: "Calle 10 #5-20",
      municipality: "Envigado",
      resolvedAddress: "Cl. 10 #5-20, Envigado, Antioquia, Colombia",
      meters: 5421,
      feeCop: 25_000,
      confirmed: true,
    },
    date: "2026-10-23",
    ...overrides,
  };
}

describe("draft persistence", () => {
  it("round-trips a draft", () => {
    const draft = fullDraft();
    assert.deepEqual(parseStoredDraft(serializeDraft(draft)), draft);
  });

  it("starts over on null, corrupt, wrong-version or tampered content", () => {
    assert.deepEqual(parseStoredDraft(null), emptyDraft());
    assert.deepEqual(parseStoredDraft("{not json"), emptyDraft());
    assert.deepEqual(parseStoredDraft(JSON.stringify({ version: 99, draft: fullDraft() })), emptyDraft());
    assert.deepEqual(parseStoredDraft(JSON.stringify({ version: 1, draft: { method: "drone" } })), emptyDraft());
    assert.deepEqual(
      parseStoredDraft(JSON.stringify({ version: 1, draft: fullDraft({ municipality: "Bogotá" as never }) })),
      emptyDraft(),
    );
    assert.deepEqual(
      parseStoredDraft(
        JSON.stringify({ version: 1, draft: { ...fullDraft(), quote: { ...fullDraft().quote, feeCop: "free" } } }),
      ),
      emptyDraft(),
    );
  });
});

describe("reconcileDraft", () => {
  it("drops a stored date that is no longer in the calendar", () => {
    assert.equal(reconcileDraft(fullDraft({ date: "2026-10-25" }), CALENDAR).date, "");
    assert.equal(reconcileDraft(fullDraft(), CALENDAR).date, "2026-10-23");
  });
});

describe("currentQuote", () => {
  it("is the stored quote only while address and municipality still match it", () => {
    assert.ok(currentQuote(fullDraft()));
    assert.equal(currentQuote(fullDraft({ address: "Otra calle 5" })), null);
    assert.equal(currentQuote(fullDraft({ municipality: "Bello" })), null);
    assert.equal(currentQuote(fullDraft({ quote: null })), null);
  });

  it("ignores surrounding whitespace in the address", () => {
    assert.ok(currentQuote(fullDraft({ address: "  Calle 10 #5-20 " })));
  });
});

describe("toDeliveryStep", () => {
  it("builds a valid pickup step", () => {
    const r = toDeliveryStep({ ...emptyDraft(), method: "tienda", date: "2026-10-22" }, CALENDAR);
    assert.deepEqual(r, { ok: true, step: { method: "tienda", date: "2026-10-22" } });
  });

  it("builds a valid home step from a confirmed quote", () => {
    const r = toDeliveryStep(fullDraft(), CALENDAR);
    assert.equal(r.ok, true);
    if (r.ok && r.step.method === "domicilio") {
      assert.equal(r.step.feeCop, 25_000);
      assert.equal(r.step.confirmed, true);
    }
  });

  it("is not valid without a method, a quote, a confirmation or a date", () => {
    assert.equal(toDeliveryStep(emptyDraft(), CALENDAR).ok, false);
    assert.equal(toDeliveryStep(fullDraft({ quote: null }), CALENDAR).ok, false);
    const unconfirmed = fullDraft();
    unconfirmed.quote = { ...unconfirmed.quote!, confirmed: false };
    assert.equal(toDeliveryStep(unconfirmed, CALENDAR).ok, false);
    assert.equal(toDeliveryStep(fullDraft({ date: "" }), CALENDAR).ok, false);
    assert.equal(toDeliveryStep(fullDraft({ address: "Cambió la dirección 9" }), CALENDAR).ok, false);
  });

  it("reports which fields are wrong", () => {
    const r = toDeliveryStep(fullDraft({ neighborhood: "", date: "" }), CALENDAR);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.errors.neighborhood);
      assert.ok(r.errors.date);
    }
  });
});
