import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) throw new Error("MFA_ENCRYPTION_KEY is required");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return decoded;
}

export function encodeBase32(input: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateMfaSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function totpCode(secret: string, at = Date.now(), period = 30, digits = 6): string {
  const counter = Math.floor(at / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return value.toString().padStart(digits, "0");
}

export function verifyTotp(secret: string, candidate: string, at = Date.now()): boolean {
  if (!/^\d{6}$/.test(candidate)) return false;
  for (const offset of [-30_000, 0, 30_000]) {
    const expected = Buffer.from(totpCode(secret, at + offset));
    const received = Buffer.from(candidate);
    if (expected.length === received.length && timingSafeEqual(expected, received)) return true;
  }
  return false;
}

export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMfaSecret(payload: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Invalid encrypted MFA secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function mfaProvisioningUri(email: string, secret: string): string {
  const issuer = "LEDWAVE";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase());
  return { plain, hashes: plain.map((code) => createHash("sha256").update(code).digest("hex")) };
}

export function consumeRecoveryCodeHash(hashes: readonly string[], candidate: string): { valid: boolean; remaining: string[] } {
  const normalized = candidate.replace(/[-\s]/g, "").toUpperCase();
  if (!/^[A-F0-9]{10}$/.test(normalized)) return { valid: false, remaining: [...hashes] };
  const candidateHash = createHash("sha256").update(normalized).digest("hex");
  const candidateBytes = Buffer.from(candidateHash);
  const index = hashes.findIndex((hash) => { const stored = Buffer.from(hash); return stored.length === candidateBytes.length && timingSafeEqual(stored, candidateBytes); });
  return index < 0 ? { valid: false, remaining: [...hashes] } : { valid: true, remaining: hashes.filter((_, itemIndex) => itemIndex !== index) };
}
