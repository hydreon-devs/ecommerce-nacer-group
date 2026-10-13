import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESERVATION_STATUSES, reservationStatusFor } from "./reservationStatus.ts";

describe("reservationStatusFor", () => {
  it("maps each order status to the reservation status holding its lines", () => {
    assert.equal(reservationStatusFor("pagado"), "consumida");
    assert.equal(reservationStatusFor("abierto"), "activa");
    assert.equal(reservationStatusFor("vencido"), "expirada");
    assert.equal(reservationStatusFor("cancelado"), "liberada");
  });

  it("falls back to consumida for an unknown status", () => {
    assert.equal(reservationStatusFor("raro"), "consumida");
  });

  it("lists the four reservation statuses", () => {
    assert.deepEqual([...RESERVATION_STATUSES].sort(), ["activa", "consumida", "expirada", "liberada"]);
  });
});
