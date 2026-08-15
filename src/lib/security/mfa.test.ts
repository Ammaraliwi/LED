import assert from "node:assert/strict";
import test from "node:test";
import { consumeRecoveryCodeHash, decryptMfaSecret, encryptMfaSecret, generateMfaSecret, generateRecoveryCodes, totpCode, verifyTotp } from "./mfa";

test("TOTP accepts the current window and rejects malformed codes", () => {
  const secret = generateMfaSecret(); const at = 1_800_000_000_000; const code = totpCode(secret, at);
  assert.equal(verifyTotp(secret, code, at), true);
  assert.equal(verifyTotp(secret, "123", at), false);
});

test("recovery codes are one-time hashes", () => {
  const recovery = generateRecoveryCodes(); const consumed = consumeRecoveryCodeHash(recovery.hashes, recovery.plain[0]);
  assert.equal(consumed.valid, true); assert.equal(consumed.remaining.length, recovery.hashes.length - 1); assert.equal(consumeRecoveryCodeHash(consumed.remaining, recovery.plain[0]).valid, false);
});

test("MFA secrets are encrypted with authenticated encryption", () => {
  const previous = process.env.MFA_ENCRYPTION_KEY; process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try { const secret = generateMfaSecret(); const encrypted = encryptMfaSecret(secret); assert.notEqual(encrypted.includes(secret), true); assert.equal(decryptMfaSecret(encrypted), secret); assert.throws(() => decryptMfaSecret(`${encrypted}x`)); } finally { if (previous === undefined) delete process.env.MFA_ENCRYPTION_KEY; else process.env.MFA_ENCRYPTION_KEY = previous; }
});
