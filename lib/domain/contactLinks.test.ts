import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapsSearchHref, normalizeColombianPhone, phoneHref } from "./contactLinks.ts";

describe("normalizeColombianPhone", () => {
  it("prefixes 57 to a 10-digit mobile", () => {
    assert.equal(normalizeColombianPhone("300 123 4567"), "573001234567");
  });
  it("keeps numbers that already carry 57", () => {
    assert.equal(normalizeColombianPhone("573001234567"), "573001234567");
    assert.equal(normalizeColombianPhone("+57 300-123-4567"), "573001234567");
  });
  it("strips WhatsApp suffixes", () => {
    assert.equal(normalizeColombianPhone("573001234567@s.whatsapp.net"), "573001234567");
  });
  it("respects other countries written with +", () => {
    assert.equal(normalizeColombianPhone("+1 415 555 2671"), "14155552671");
  });
  it("returns null for blanks, dashes and unrecognizable values", () => {
    assert.equal(normalizeColombianPhone(null), null);
    assert.equal(normalizeColombianPhone("—"), null);
    assert.equal(normalizeColombianPhone("12345"), null);
  });
});

describe("phoneHref", () => {
  it("builds a tel: link or null", () => {
    assert.equal(phoneHref("3001234567"), "tel:+573001234567");
    assert.equal(phoneHref("—"), null);
  });
});

describe("mapsSearchHref", () => {
  it("encodes the full address", () => {
    assert.equal(
      mapsSearchHref("Cra 7 #12-34, Chía"),
      "https://www.google.com/maps/search/?api=1&query=Cra%207%20%2312-34%2C%20Ch%C3%ADa",
    );
  });
  it("returns null for empty or placeholder", () => {
    assert.equal(mapsSearchHref("  "), null);
    assert.equal(mapsSearchHref("—"), null);
  });
});
