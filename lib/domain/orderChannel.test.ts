import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { channelLabel, hasSyntheticChat, orderChannel } from "./orderChannel.ts";

describe("orderChannel", () => {
  it("tells the three channels apart by chat_id", () => {
    assert.equal(orderChannel("panel:0f0e"), "panel");
    assert.equal(orderChannel("web:6f1c2b7e-1111-4222-8333-444455556666"), "web");
    assert.equal(orderChannel("573001112233"), "whatsapp");
  });

  it("treats anything else as whatsapp, including missing ids", () => {
    assert.equal(orderChannel(null), "whatsapp");
    assert.equal(orderChannel(undefined), "whatsapp");
    assert.equal(orderChannel(""), "whatsapp");
    // Prefix must be exact and lowercase: a stray word is not a channel.
    assert.equal(orderChannel("WEB:abc"), "whatsapp");
    assert.equal(orderChannel("website"), "whatsapp");
  });

  it("flags panel and web chats as synthetic (the real phone lives in sale_details)", () => {
    assert.equal(hasSyntheticChat("panel:1"), true);
    assert.equal(hasSyntheticChat("web:1"), true);
    assert.equal(hasSyntheticChat("573001112233"), false);
    assert.equal(hasSyntheticChat(null), false);
  });

  it("labels only the channels that need a marker", () => {
    assert.equal(channelLabel("web"), "Web");
    assert.equal(channelLabel("panel"), "Panel");
    assert.equal(channelLabel("whatsapp"), "WhatsApp");
  });
});
