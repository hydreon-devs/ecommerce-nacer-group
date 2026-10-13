import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SEARCH_MAX_LENGTH,
  isExternalTermChange,
  normalizeSearchTerm,
  withParam,
} from "./orderSearch.ts";

describe("normalizeSearchTerm", () => {
  it("returns null for missing, blank or fully stripped input", () => {
    assert.equal(normalizeSearchTerm(undefined), null);
    assert.equal(normalizeSearchTerm(""), null);
    assert.equal(normalizeSearchTerm("   "), null);
    assert.equal(normalizeSearchTerm("%_*,()"), null);
  });

  it("trims and keeps letters, digits and hyphens", () => {
    assert.equal(normalizeSearchTerm("  TEST-0007 "), "TEST-0007");
  });

  it("takes the first value of an array", () => {
    assert.equal(normalizeSearchTerm(["0007", "x"]), "0007");
    assert.equal(normalizeSearchTerm([]), null);
  });

  it("strips wildcards and filter syntax", () => {
    assert.equal(normalizeSearchTerm("a%b_c*d,e(f).g"), "abcdefg");
    assert.equal(normalizeSearchTerm("x,status.eq.pagado"), "xstatuseqpagado");
  });

  it("caps the length", () => {
    const out = normalizeSearchTerm("a".repeat(100));
    assert.equal(out?.length, SEARCH_MAX_LENGTH);
  });
});

describe("withParam", () => {
  it("adds a param to a bare path", () => {
    assert.equal(withParam("/admin/pedidos", "q", "0007"), "/admin/pedidos?q=0007");
  });

  it("keeps the other params when setting or replacing", () => {
    assert.equal(
      withParam("/admin/pedidos?mes=10&anio=2026", "q", "7"),
      "/admin/pedidos?mes=10&anio=2026&q=7",
    );
    assert.equal(
      withParam("/admin/pedidos?mes=10&anio=2026&q=7", "q", "8"),
      "/admin/pedidos?mes=10&anio=2026&q=8",
    );
  });

  it("removes the param when the value is empty, and the ? when nothing is left", () => {
    assert.equal(withParam("/admin/pedidos?q=7", "q", ""), "/admin/pedidos");
    assert.equal(withParam("/admin/pedidos?anio=2026&q=7", "q", ""), "/admin/pedidos?anio=2026");
  });
});

describe("isExternalTermChange", () => {
  it("is false while the URL term has not changed, even if the field already sent a newer one", () => {
    // The field sent "0" and the server has not answered yet: the URL still has no term.
    assert.equal(isExternalTermChange("", "", "0"), false);
  });

  it("is false when the URL changes to the term the field itself sent", () => {
    assert.equal(isExternalTermChange("0", "", "0"), false);
  });

  it("is true when the URL changes to a term the field did not send", () => {
    // "Limpiar filtros" or the back button removed the term.
    assert.equal(isExternalTermChange("", "0007", "0007"), true);
    assert.equal(isExternalTermChange("0042", "0007", "0007"), true);
  });
});
