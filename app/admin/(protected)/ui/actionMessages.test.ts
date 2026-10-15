import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { advanceErrorMessage } from "./actionMessages.ts";

describe("advanceErrorMessage", () => {
  it("PEDIDO_CAMBIO sugiere recargar", () => {
    const m = advanceErrorMessage("PEDIDO_CAMBIO");
    assert.match(m.text, /Otra persona ya actualizó/);
    assert.equal(m.refresh, true);
  });
  it("SIN_SIGUIENTE_PASO y PEDIDO_NO_EXISTE tienen mensaje propio", () => {
    assert.match(advanceErrorMessage("SIN_SIGUIENTE_PASO").text, /no tiene un siguiente paso/);
    assert.match(advanceErrorMessage("PEDIDO_NO_EXISTE").text, /ya no existe/);
  });
  it("un código desconocido cae al mensaje genérico", () => {
    const m = advanceErrorMessage("XYZ");
    assert.match(m.text, /No se pudo actualizar el pedido/);
    assert.equal(m.refresh, false);
  });
});
