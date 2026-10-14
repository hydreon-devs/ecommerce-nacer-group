import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOST_NOTE_MAX,
  RESOLUTION_LABELS,
  canResolveLost,
  daysSinceLoss,
  daysSinceLossLabel,
  splitLostOrders,
  validateResolution,
} from "./lostFollowUp.ts";

const NOW = new Date("2026-10-13T15:00:00.000Z"); // 10:00 en Bogotá

describe("RESOLUTION_LABELS", () => {
  it("has a Spanish label for each value", () => {
    assert.deepEqual(RESOLUTION_LABELS, {
      repuesto: "Repuesto",
      reembolsado: "Reembolsado",
      cerrado_sin_accion: "Cerrado sin acción",
    });
  });
});

describe("validateResolution", () => {
  it("accepts each resolution with no note", () => {
    for (const resolution of ["repuesto", "reembolsado", "cerrado_sin_accion"]) {
      assert.deepEqual(validateResolution(resolution, undefined), { ok: true, resolution, note: null });
    }
  });

  it("rejects an unknown or non-string resolution", () => {
    assert.deepEqual(validateResolution("otro", null), { ok: false, error: "RESOLUCION_INVALIDA" });
    assert.deepEqual(validateResolution(undefined, null), { ok: false, error: "RESOLUCION_INVALIDA" });
    assert.deepEqual(validateResolution(3, null), { ok: false, error: "RESOLUCION_INVALIDA" });
  });

  it("trims the note and turns blank into null", () => {
    assert.deepEqual(validateResolution("repuesto", "  enviado hoy  "), {
      ok: true,
      resolution: "repuesto",
      note: "enviado hoy",
    });
    assert.deepEqual(validateResolution("repuesto", "   "), { ok: true, resolution: "repuesto", note: null });
    assert.deepEqual(validateResolution("repuesto", ""), { ok: true, resolution: "repuesto", note: null });
  });

  it("limits the trimmed note to 500 characters", () => {
    assert.equal(LOST_NOTE_MAX, 500);
    assert.equal(validateResolution("repuesto", ` ${"a".repeat(500)} `).ok, true);
    assert.deepEqual(validateResolution("repuesto", "a".repeat(501)), {
      ok: false,
      error: "NOTA_INVALIDA",
    });
  });

  it("rejects a note that is not a string", () => {
    assert.deepEqual(validateResolution("repuesto", 5), { ok: false, error: "NOTA_INVALIDA" });
  });
});

describe("canResolveLost", () => {
  const base = { status: "pagado", fulfillment_status: "perdido", lost_resolution: null };

  it("allows a paid, lost, unresolved order", () => {
    assert.equal(canResolveLost(base), true);
  });

  it("rejects other states and already resolved orders", () => {
    assert.equal(canResolveLost({ ...base, status: "pendiente" }), false);
    assert.equal(canResolveLost({ ...base, fulfillment_status: "en_despacho" }), false);
    assert.equal(canResolveLost({ ...base, fulfillment_status: null }), false);
    assert.equal(canResolveLost({ ...base, lost_resolution: "repuesto" }), false);
  });
});

describe("splitLostOrders", () => {
  const order = (id: string, lost_at: string | null, resolved: string | null) => ({
    id,
    lost_at,
    lost_resolution: resolved ? "repuesto" : null,
    lost_resolved_at: resolved,
  });

  it("puts unresolved first-in-line by oldest lost_at, null lost_at on top", () => {
    const { pending } = splitLostOrders([
      order("b", "2026-10-10T10:00:00Z", null),
      order("n", null, null),
      order("a", "2026-10-01T10:00:00Z", null),
    ]);
    assert.deepEqual(pending.map((o) => o.id), ["n", "a", "b"]);
  });

  it("orders resolved by most recent lost_resolved_at", () => {
    const { resolved } = splitLostOrders([
      order("old", "2026-10-01T10:00:00Z", "2026-10-02T10:00:00Z"),
      order("new", "2026-10-01T10:00:00Z", "2026-10-09T10:00:00Z"),
    ]);
    assert.deepEqual(resolved.map((o) => o.id), ["new", "old"]);
  });

  it("separates the two groups and does not mutate the input", () => {
    const input = [order("p", "2026-10-01T10:00:00Z", null), order("r", null, "2026-10-02T10:00:00Z")];
    const { pending, resolved } = splitLostOrders(input);
    assert.deepEqual(pending.map((o) => o.id), ["p"]);
    assert.deepEqual(resolved.map((o) => o.id), ["r"]);
    assert.deepEqual(input.map((o) => o.id), ["p", "r"]);
  });
});

describe("daysSinceLoss", () => {
  it("is null without a date or with an unreadable one", () => {
    assert.equal(daysSinceLoss(null, NOW), null);
    assert.equal(daysSinceLoss("no es fecha", NOW), null);
  });

  it("counts Bogotá calendar days, not 24h blocks", () => {
    // 22:00 Bogotá del 12 (03:00Z del 13) -> hoy 13 en Bogotá: 1 día.
    assert.equal(daysSinceLoss("2026-10-13T03:00:00.000Z", NOW), 1);
    // 00:30 Bogotá del 13 (05:30Z): mismo día.
    assert.equal(daysSinceLoss("2026-10-13T05:30:00.000Z", NOW), 0);
    assert.equal(daysSinceLoss("2026-10-06T15:00:00.000Z", NOW), 7);
  });

  it("never goes negative", () => {
    assert.equal(daysSinceLoss("2026-10-20T15:00:00.000Z", NOW), 0);
  });
});

describe("daysSinceLossLabel", () => {
  it("uses singular and plural", () => {
    assert.equal(daysSinceLossLabel(0), "hoy");
    assert.equal(daysSinceLossLabel(1), "hace 1 día");
    assert.equal(daysSinceLossLabel(5), "hace 5 días");
  });
});
