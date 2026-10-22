import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitEmails } from "./splitEmails.ts";

describe("splitEmails", () => {
  it("returns a single text part when there is no email", () => {
    assert.deepEqual(splitEmails("Sin correo aquí."), [
      { type: "text", value: "Sin correo aquí." },
    ]);
  });

  it("splits text around an email, preserving surrounding whitespace", () => {
    assert.deepEqual(splitEmails("escríbenos a crisalidasymariposas@gmail.com y listo"), [
      { type: "text", value: "escríbenos a " },
      { type: "email", value: "crisalidasymariposas@gmail.com" },
      { type: "text", value: " y listo" },
    ]);
  });

  it("handles several emails and an email at the very end", () => {
    assert.deepEqual(splitEmails("a@b.co, c.d@e-f.com"), [
      { type: "email", value: "a@b.co" },
      { type: "text", value: ", " },
      { type: "email", value: "c.d@e-f.com" },
    ]);
  });

  it("does not swallow a trailing period into the email", () => {
    assert.deepEqual(splitEmails("Escribe a x@y.com."), [
      { type: "text", value: "Escribe a " },
      { type: "email", value: "x@y.com" },
      { type: "text", value: "." },
    ]);
  });

  it("returns an empty array for an empty string", () => {
    assert.deepEqual(splitEmails(""), []);
  });
});
