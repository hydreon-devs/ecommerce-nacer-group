import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginAttempt,
  parseStoredAttempt,
  recordCreated,
  restartAfterClosed,
  submitOrder,
  uuidV4FromBytes,
  type AttemptState,
  type CreateOrderResult,
} from "./attempt.ts";
import type { WebOrder } from "./webOrderResult.ts";

function ids() {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

const ORDER: WebOrder = {
  orderId: "7f1c2b7e-1111-4222-8333-444455556666",
  humanNumber: "W-1",
  reused: false,
  expiresAt: "2026-10-22T20:30:00Z",
  subtotal: 1,
  deliveryFee: 0,
  grandTotal: 1,
  lines: [],
};

describe("beginAttempt", () => {
  it("creates the first attempt with nothing to replace", () => {
    const next = ids();
    assert.deepEqual(beginAttempt(null, "sig-a", next), {
      id: "00000000-0000-4000-8000-000000000001",
      replacesId: null,
      signature: "sig-a",
      orderId: null,
    });
  });

  it("keeps the attempt when the same content is submitted again (double submit, reload)", () => {
    const next = ids();
    const first = recordCreated(beginAttempt(null, "sig-a", next), ORDER.orderId);
    assert.deepEqual(beginAttempt(first, "sig-a", next), first);
  });

  it("keeps the attempt when a call failed without creating anything and the content is unchanged", () => {
    const next = ids();
    const first = beginAttempt(null, "sig-a", next);
    assert.deepEqual(beginAttempt(first, "sig-a", next), first);
  });

  it("starts a new attempt that replaces the old one when the content changed after the order was created", () => {
    const next = ids();
    const created = recordCreated(beginAttempt(null, "sig-a", next), ORDER.orderId);
    const changed = beginAttempt(created, "sig-b", next);
    assert.notEqual(changed.id, created.id);
    assert.equal(changed.replacesId, created.id);
    assert.equal(changed.signature, "sig-b");
    assert.equal(changed.orderId, null);
  });

  it("keeps replacing the order that exists, not an attempt that failed in between", () => {
    const next = ids();
    const created = recordCreated(beginAttempt(null, "sig-a", next), ORDER.orderId);
    const failed = beginAttempt(created, "sig-b", next); // submitted, rejected by validation
    const fixed = beginAttempt(failed, "sig-c", next);
    assert.equal(fixed.replacesId, created.id);
    assert.notEqual(fixed.id, failed.id);
  });

  it("starts a fresh attempt when the first one never produced an order and the content changed", () => {
    const next = ids();
    const first = beginAttempt(null, "sig-a", next);
    const second = beginAttempt(first, "sig-b", next);
    assert.notEqual(second.id, first.id);
    // The first call may have created an order whose answer was lost: replace it.
    assert.equal(second.replacesId, first.id);
  });
});

describe("recordCreated and restartAfterClosed", () => {
  it("remembers the order id", () => {
    const state = recordCreated(beginAttempt(null, "s", ids()), ORDER.orderId);
    assert.equal(state.orderId, ORDER.orderId);
  });

  it("regenerates the attempt when the old one is closed, without replacing it", () => {
    const next = ids();
    const created = recordCreated(beginAttempt(null, "s", next), ORDER.orderId);
    const again = restartAfterClosed(created, "s", next);
    assert.notEqual(again.id, created.id);
    assert.equal(again.replacesId, null);
    assert.equal(again.orderId, null);
    assert.equal(again.signature, "s");
  });
});

describe("parseStoredAttempt", () => {
  it("accepts a well-formed attempt and rejects anything else", () => {
    const good: AttemptState = {
      id: "6f1c2b7e-1111-4222-8333-444455556666",
      replacesId: null,
      signature: "s",
      orderId: null,
    };
    assert.deepEqual(parseStoredAttempt(good), good);
    assert.equal(parseStoredAttempt({ ...good, id: "nope" }), null);
    assert.equal(parseStoredAttempt({ ...good, replacesId: "nope" }), null);
    assert.equal(parseStoredAttempt(null), null);
    assert.equal(parseStoredAttempt("x"), null);
  });
});

describe("submitOrder", () => {
  const ok: CreateOrderResult = { ok: true, order: ORDER };
  const closed: CreateOrderResult = { ok: false, route: { kind: "intento", reason: "closed", message: "vencido" } };
  const datos: CreateOrderResult = {
    ok: false,
    route: { kind: "datos", page: 1, fieldErrors: { buyer_name: "x" }, message: "m" },
  };

  it("creates the order and remembers it in the attempt", async () => {
    const calls: unknown[] = [];
    const r = await submitOrder({
      state: null,
      signature: "sig",
      newId: ids(),
      call: async (a) => {
        calls.push(a);
        return ok;
      },
    });
    assert.equal(r.result.ok, true);
    assert.equal(r.attempt.orderId, ORDER.orderId);
    assert.deepEqual(calls, [{ attemptId: "00000000-0000-4000-8000-000000000001", replacesAttemptId: null }]);
  });

  it("sends the same attempt on a double submit", async () => {
    const seen: string[] = [];
    const call = async (a: { attemptId: string }) => {
      seen.push(a.attemptId);
      return ok;
    };
    const next = ids();
    const first = await submitOrder({ state: null, signature: "sig", newId: next, call });
    const second = await submitOrder({ state: first.attempt, signature: "sig", newId: next, call });
    assert.equal(seen[0], seen[1]);
    assert.deepEqual(second.attempt, first.attempt);
  });

  it("passes the replaced attempt when the content changed", async () => {
    const seen: { attemptId: string; replacesAttemptId: string | null }[] = [];
    const call = async (a: { attemptId: string; replacesAttemptId: string | null }) => {
      seen.push(a);
      return ok;
    };
    const next = ids();
    const first = await submitOrder({ state: null, signature: "a", newId: next, call });
    await submitOrder({ state: first.attempt, signature: "b", newId: next, call });
    assert.equal(seen[1].replacesAttemptId, seen[0].attemptId);
    assert.notEqual(seen[1].attemptId, seen[0].attemptId);
  });

  it("starts a new attempt transparently on INTENTO_CERRADO and succeeds", async () => {
    const seen: { attemptId: string; replacesAttemptId: string | null }[] = [];
    const answers = [closed, ok];
    const r = await submitOrder({
      state: recordCreated(beginAttempt(null, "sig", ids()), ORDER.orderId),
      signature: "sig",
      newId: (() => {
        let n = 100;
        return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
      })(),
      call: async (a) => {
        seen.push(a);
        return answers.shift()!;
      },
    });
    assert.equal(r.result.ok, true);
    assert.equal(seen.length, 2);
    assert.notEqual(seen[0].attemptId, seen[1].attemptId);
    assert.equal(seen[1].replacesAttemptId, null);
    assert.equal(r.attempt.id, seen[1].attemptId);
    assert.equal(r.attempt.orderId, ORDER.orderId);
  });

  it("gives up after one transparent restart", async () => {
    let n = 0;
    const r = await submitOrder({
      state: null,
      signature: "sig",
      newId: ids(),
      call: async () => {
        n++;
        return closed;
      },
    });
    assert.equal(n, 2);
    assert.equal(r.result.ok, false);
    assert.equal(!r.result.ok && r.result.route.kind, "intento");
  });

  it("returns other routes untouched and keeps the attempt without an order", async () => {
    const r = await submitOrder({ state: null, signature: "sig", newId: ids(), call: async () => datos });
    assert.deepEqual(r.result, datos);
    assert.equal(r.attempt.orderId, null);
    assert.equal(r.attempt.signature, "sig");
  });

  it("turns a thrown call into a retry route instead of crashing", async () => {
    const r = await submitOrder({
      state: null,
      signature: "sig",
      newId: ids(),
      call: async () => {
        throw new Error("network");
      },
    });
    assert.equal(r.result.ok, false);
    assert.equal(!r.result.ok && r.result.route.kind, "retry");
  });
});

describe("uuidV4FromBytes", () => {
  it("sets the version and variant bits and formats 8-4-4-4-12", () => {
    const id = uuidV4FromBytes(new Uint8Array(16).fill(0xff));
    assert.equal(id, "ffffffff-ffff-4fff-bfff-ffffffffffff");
    assert.match(uuidV4FromBytes(new Uint8Array(16)), /^00000000-0000-4000-8000-000000000000$/);
  });

  it("produces ids the database accepts and the schemas validate", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => (i * 37 + 11) % 256);
    const id = uuidV4FromBytes(bytes);
    assert.notEqual(parseStoredAttempt({ id, replacesId: null, signature: null, orderId: null }), null);
  });

  it("rejects a wrong-length input", () => {
    assert.throws(() => uuidV4FromBytes(new Uint8Array(8)));
  });
});
