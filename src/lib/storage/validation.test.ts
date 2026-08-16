import assert from "node:assert/strict";
import test from "node:test";
import { customerCanAccessPrivateMedia } from "./access";
import { detectedMimeType, imageDimensions, validatedImageDimensions, validateMediaBytes } from "./validation";

test("upload validation uses magic bytes rather than the claimed MIME type", () => {
  const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3]);
  assert.equal(detectedMimeType(png), "image/png");
  assert.deepEqual(imageDimensions(png, "image/png"), { width: 2, height: 3 });
  assert.deepEqual(validatedImageDimensions(png, "image/png"), { width: 2, height: 3 });
  assert.doesNotThrow(() => validateMediaBytes(png, "image/png", "public"));
  assert.throws(() => validateMediaBytes(png, "image/jpeg", "public"));
});

test("images with unsafe dimensions are rejected", () => {
  const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0xff,0xff,0,0,0xff,0xff]);
  assert.throws(() => validatedImageDimensions(png, "image/png"));
});

test("lossy and lossless WebP dimensions are parsed", () => {
  const lossy = new Uint8Array(30);
  lossy.set([0x52, 0x49, 0x46, 0x46], 0);
  lossy.set([0x57, 0x45, 0x42, 0x50], 8);
  lossy.set([0x56, 0x50, 0x38, 0x20], 12);
  lossy.set([0x9d, 0x01, 0x2a], 23);
  lossy.set([0x80, 0x02, 0xe0, 0x01], 26);
  assert.deepEqual(validatedImageDimensions(lossy, "image/webp"), { width: 640, height: 480 });

  const lossless = new Uint8Array(25);
  lossless.set([0x52, 0x49, 0x46, 0x46], 0);
  lossless.set([0x57, 0x45, 0x42, 0x50], 8);
  lossless.set([0x56, 0x50, 0x38, 0x4c], 12);
  lossless.set([0x2f, 0x3f, 0x00, 0x78, 0x00], 20);
  assert.deepEqual(validatedImageDimensions(lossless, "image/webp"), { width: 64, height: 481 });
});

test("PDFs are private-only and active content is rejected", () => {
  const safe = new TextEncoder().encode("%PDF-1.7\n harmless"); const active = new TextEncoder().encode("%PDF-1.7\n /JavaScript");
  assert.doesNotThrow(() => validateMediaBytes(safe, "application/pdf", "private"));
  assert.throws(() => validateMediaBytes(safe, "application/pdf", "public"));
  assert.throws(() => validateMediaBytes(active, "application/pdf", "private"));
});

test("private media access is owner-or-booking scoped", () => {
  assert.equal(customerCanAccessPrivateMedia({ uploaderUserId: 10, currentUserId: 10, linkedToCustomerBooking: false }), true);
  assert.equal(customerCanAccessPrivateMedia({ uploaderUserId: 11, currentUserId: 10, linkedToCustomerBooking: true }), true);
  assert.equal(customerCanAccessPrivateMedia({ uploaderUserId: 11, currentUserId: 10, linkedToCustomerBooking: false }), false);
});
