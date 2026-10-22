import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyFlowDraft,
  FLOW_STORAGE_KEY,
  parseStoredFlow,
  reconcileFlow,
  serializeFlow,
  type FlowDraft,
} from "./flowDraft.ts";
import { emptyDetailsDraft } from "./saleDetails.ts";

const UUID = "6f1c2b7e-1111-4222-8333-444455556666";
const ORDER = "7f1c2b7e-1111-4222-8333-444455556666";

function full(patch: Partial<FlowDraft> = {}): FlowDraft {
  return {
    step: 2,
    subPage: 3,
    details: { ...emptyDetailsDraft(), buyer_name: "Ana", may_call_recipient: "Sí", occasion: "boda", wants_invoice: "No" },
    attempt: { id: UUID, replacesId: null, signature: "sig", orderId: ORDER },
    ...patch,
  };
}

describe("flow draft persistence", () => {
  it("uses its own storage key", () => {
    assert.equal(FLOW_STORAGE_KEY, "nacer.checkout.flow");
  });

  it("starts on step 1, page 1, empty, without an attempt", () => {
    assert.deepEqual(emptyFlowDraft(), { step: 1, subPage: 1, details: emptyDetailsDraft(), attempt: null });
  });

  it("round-trips a draft", () => {
    assert.deepEqual(parseStoredFlow(serializeFlow(full())), full());
  });

  it("starts over on null, corrupt, wrong-version or tampered content", () => {
    assert.deepEqual(parseStoredFlow(null), emptyFlowDraft());
    assert.deepEqual(parseStoredFlow("{nope"), emptyFlowDraft());
    assert.deepEqual(parseStoredFlow(JSON.stringify({ version: 9, draft: full() })), emptyFlowDraft());
    const tampered = (draft: unknown) => parseStoredFlow(JSON.stringify({ version: 1, draft }));
    assert.deepEqual(tampered({ ...full(), step: 7 }), emptyFlowDraft());
    assert.deepEqual(tampered({ ...full(), subPage: 0 }), emptyFlowDraft());
    assert.deepEqual(tampered({ ...full(), details: { ...full().details, buyer_name: 5 } }), emptyFlowDraft());
    assert.deepEqual(tampered({ ...full(), details: { ...full().details, occasion: "san valentín" } }), emptyFlowDraft());
    assert.deepEqual(tampered({ ...full(), attempt: { id: "x" } }), emptyFlowDraft());
  });

  it("rejects absurdly long stored text", () => {
    const details = { ...full().details, card_message: "x".repeat(20_000) };
    assert.deepEqual(parseStoredFlow(JSON.stringify({ version: 1, draft: { ...full(), details } })), emptyFlowDraft());
  });
});

describe("reconcileFlow", () => {
  it("falls back to step 1 when delivery is not complete", () => {
    assert.equal(reconcileFlow(full({ step: 2 }), { deliveryReady: false }).step, 1);
    assert.equal(reconcileFlow(full({ step: 3 }), { deliveryReady: false }).step, 1);
  });

  it("keeps step 2 with its sub-page when delivery is complete", () => {
    const r = reconcileFlow(full({ step: 2, subPage: 3 }), { deliveryReady: true });
    assert.equal(r.step, 2);
    assert.equal(r.subPage, 3);
  });

  it("only keeps step 3 when an order was created for the attempt", () => {
    assert.equal(reconcileFlow(full({ step: 3 }), { deliveryReady: true }).step, 3);
    const noOrder = full({ step: 3, attempt: { id: UUID, replacesId: null, signature: "s", orderId: null } });
    const r = reconcileFlow(noOrder, { deliveryReady: true });
    assert.equal(r.step, 2);
    assert.equal(r.subPage, 4);
    assert.equal(reconcileFlow(full({ step: 3, attempt: null }), { deliveryReady: true }).step, 2);
  });
});
