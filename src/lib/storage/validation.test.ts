import assert from "node:assert/strict";
import test from "node:test";
import { customerCanAccessPrivateMedia } from "./access";
import { detectedMimeType, imageDimensions, validateMediaBytes } from "./validation";

test("upload validation uses magic bytes rather than the claimed MIME type", () => {
  const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3]);
  assert.equal(detectedMimeType(png), "image/png");
  assert.deepEqual(imageDimensions(png, "image/png"), { width: 2, height: 3 });
  assert.doesNotThrow(() => validateMediaBytes(png, "image/png", "public"));
  assert.throws(() => validateMediaBytes(png, "image/jpeg", "public"));
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
