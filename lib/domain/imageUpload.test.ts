import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_BUCKET,
  MAX_IMAGE_BYTES,
  imageObjectPath,
  storagePathFromPublicUrl,
  validateImageFile,
} from "./imageUpload.ts";

const BASE = "https://abc.supabase.co/storage/v1/object/public";

describe("validateImageFile", () => {
  it("maps allowed mime types to an extension", () => {
    assert.deepEqual(validateImageFile({ type: "image/png", size: 10 }), { ok: true, ext: "png" });
    assert.deepEqual(validateImageFile({ type: "image/jpeg", size: 10 }), { ok: true, ext: "jpg" });
    assert.deepEqual(validateImageFile({ type: "image/webp", size: 10 }), { ok: true, ext: "webp" });
  });
  it("rejects empty files", () => {
    const res = validateImageFile({ type: "image/png", size: 0 });
    assert.equal(res.ok, false);
  });
  it("rejects unsupported types", () => {
    const res = validateImageFile({ type: "image/gif", size: 10 });
    assert.deepEqual(res, { ok: false, error: "Formato no soportado — usa PNG, JPG o WEBP." });
  });
  it("rejects files over 5 MB but accepts exactly 5 MB", () => {
    assert.equal(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }).ok, true);
    assert.deepEqual(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }), {
      ok: false,
      error: "La imagen supera 5 MB.",
    });
  });
});

describe("imageObjectPath", () => {
  it("builds folder/sku.ext", () => {
    assert.equal(imageObjectPath("variants", "CRI-001-A", "jpg"), "variants/CRI-001-A.jpg");
  });
  it("rejects skus that could escape the folder", () => {
    assert.equal(imageObjectPath("variants", "../x", "jpg"), null);
    assert.equal(imageObjectPath("variants", "a/b", "jpg"), null);
    assert.equal(imageObjectPath("variants", "", "jpg"), null);
  });
});

describe("storagePathFromPublicUrl", () => {
  it("extracts the object path inside our bucket and folder", () => {
    assert.equal(
      storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/variants/CRI-1.webp`, "variants"),
      "variants/CRI-1.webp",
    );
    assert.equal(
      storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/stock-items/INS-1.jpg?t=1`, "stock-items"),
      "stock-items/INS-1.jpg",
    );
  });
  it("decodes percent-encoded names", () => {
    assert.equal(
      storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/stock-items/A%20B.jpg`, "stock-items"),
      "stock-items/A B.jpg",
    );
  });
  it("returns null for other buckets, other folders, traversal or garbage", () => {
    assert.equal(storagePathFromPublicUrl(`${BASE}/otro/variants/x.jpg`, "variants"), null);
    assert.equal(storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/stock-items/x.jpg`, "variants"), null);
    assert.equal(storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/variants/../secret.jpg`, "variants"), null);
    assert.equal(storagePathFromPublicUrl(`${BASE}/${IMAGE_BUCKET}/variants/a/b.jpg`, "variants"), null);
    assert.equal(storagePathFromPublicUrl("https://example.com/foto.jpg", "variants"), null);
    assert.equal(storagePathFromPublicUrl(null, "variants"), null);
  });
});
