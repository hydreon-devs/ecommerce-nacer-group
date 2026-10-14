import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleCartColumns, classifyCart, hasLiveReservation } from "./cartColumn.ts";

const NOW = new Date("2026-10-13T15:00:00Z");
const order = { status: "abierto", payment_status: null, fulfillment_status: null };
const live = { status: "activa", expires_at: "2026-10-14T15:00:00Z" };
const expired = { status: "activa", expires_at: "2026-10-13T14:59:59Z" };

describe("classifyCart", () => {
  it("puts an open order with a live reservation in abiertos", () => {
    assert.deepEqual(classifyCart(order, [live], NOW), { column: "abiertos", state: "abierto" });
  });

  it("labels an open order with a transfer proof as pendiente por aprobar", () => {
    const withProof = { ...order, payment_status: "comprobante_recibido" };
    assert.deepEqual(classifyCart(withProof, [live], NOW), {
      column: "abiertos",
      state: "pendiente_aprobacion",
    });
  });

  it("shows an open order whose activa reservation already expired as vencido", () => {
    assert.deepEqual(classifyCart(order, [expired], NOW), { column: "vencidos", state: "vencido" });
  });

  it("shows an open order without reservations as vencido", () => {
    assert.deepEqual(classifyCart(order, [], NOW), { column: "vencidos", state: "vencido" });
  });

  it("ignores reservations that are not activa, even with a future expires_at", () => {
    const released = { status: "liberada", expires_at: "2026-10-14T15:00:00Z" };
    assert.deepEqual(classifyCart(order, [released], NOW), { column: "vencidos", state: "vencido" });
  });

  it("keeps an order live when the reservation was extended well past 24h after creation", () => {
    // Comprobante de transferencia: la reserva se extiende al cierre del segundo día hábil.
    const extended = { status: "activa", expires_at: "2026-10-16T22:00:00Z" };
    const withProof = { ...order, payment_status: "comprobante_recibido" };
    assert.equal(classifyCart(withProof, [extended], NOW)?.column, "abiertos");
  });

  it("treats expires_at equal to now as not live", () => {
    const atNow = { status: "activa", expires_at: NOW.toISOString() };
    assert.equal(hasLiveReservation([atNow], NOW), false);
    assert.equal(classifyCart(order, [atNow], NOW)?.column, "vencidos");
  });

  it("needs only one live reservation among several", () => {
    assert.equal(classifyCart(order, [expired, live], NOW)?.column, "abiertos");
  });

  it("puts vencido and cancelado in their own columns", () => {
    assert.deepEqual(classifyCart({ ...order, status: "vencido" }, [], NOW), {
      column: "vencidos",
      state: "vencido",
    });
    assert.deepEqual(classifyCart({ ...order, status: "cancelado" }, [live], NOW), {
      column: "cancelados",
      state: "cancelado",
    });
  });

  it("excludes paid and unknown statuses", () => {
    assert.equal(classifyCart({ ...order, status: "pagado" }, [live], NOW), null);
    assert.equal(classifyCart({ ...order, status: "raro" }, [live], NOW), null);
  });
});

describe("assembleCartColumns", () => {
  const period = { desde: "2026-10-01T05:00:00.000Z", hasta: "2026-11-01T05:00:00.000Z" };
  const inside = "2026-10-05T12:00:00Z";
  const before = "2026-09-20T12:00:00Z";
  const mk = (id: string, status: string, created_at: string, updated_at = created_at) => ({
    id,
    human_number: id.toUpperCase(),
    status,
    payment_status: null,
    fulfillment_status: null,
    created_at,
    updated_at,
  });
  const liveFor = (order_id: string) => ({ order_id, ...live });
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it("includes an order created exactly at desde and excludes one exactly at hasta", () => {
    const orders = [mk("a", "cancelado", period.desde), mk("b", "cancelado", period.hasta)];
    const out = assembleCartColumns({ orders, reservations: [], period, now: NOW });
    assert.deepEqual(ids(out.cancelados), ["a"]);
  });

  it("keeps a live open order outside the period in abiertos", () => {
    const orders = [mk("a", "abierto", before)];
    const out = assembleCartColumns({ orders, reservations: [liveFor("a")], period, now: NOW });
    assert.deepEqual(ids(out.abiertos), ["a"]);
    assert.equal(out.vencidos.length, 0);
  });

  it("drops a stale open order outside the period from vencidos", () => {
    const orders = [mk("a", "abierto", before), mk("b", "abierto", inside)];
    const out = assembleCartColumns({ orders, reservations: [], period, now: NOW });
    assert.deepEqual(ids(out.vencidos), ["b"]);
    assert.equal(out.abiertos.length, 0);
  });

  it("lists an order that arrives from both queries once", () => {
    const o = mk("a", "abierto", inside);
    const out = assembleCartColumns({ orders: [o, { ...o }], reservations: [liveFor("a")], period, now: NOW });
    assert.deepEqual(ids(out.abiertos), ["a"]);
  });

  it("keeps everything when period is null", () => {
    const orders = [mk("a", "cancelado", before), mk("b", "abierto", "2020-01-01T00:00:00Z")];
    const out = assembleCartColumns({ orders, reservations: [], period: null, now: NOW });
    assert.deepEqual(ids(out.cancelados), ["a"]);
    assert.deepEqual(ids(out.vencidos), ["b"]);
  });

  it("sorts each column by updated_at, newest first, and skips paid orders", () => {
    const orders = [
      mk("old", "vencido", inside, "2026-10-06T00:00:00Z"),
      mk("new", "vencido", inside, "2026-10-09T00:00:00Z"),
      mk("mid", "vencido", inside, "2026-10-07T00:00:00Z"),
      mk("paid", "pagado", inside),
    ];
    const out = assembleCartColumns({ orders, reservations: [], period, now: NOW });
    assert.deepEqual(ids(out.vencidos), ["new", "mid", "old"]);
    assert.equal(out.abiertos.length + out.cancelados.length, 0);
  });

  it("exposes the state to show for each row", () => {
    const out = assembleCartColumns({
      orders: [mk("a", "abierto", inside)],
      reservations: [],
      period,
      now: NOW,
    });
    assert.equal(out.vencidos[0].state, "vencido");
  });
});
