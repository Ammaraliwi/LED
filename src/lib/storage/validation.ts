export const PUBLIC_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRIVATE_MEDIA_TYPES = [...PUBLIC_MEDIA_TYPES, "application/pdf"] as const;
export const MAX_PUBLIC_MEDIA_BYTES = 10 * 1024 * 1024;
export const MAX_PRIVATE_MEDIA_BYTES = 15 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectedMimeType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

export function validateMediaBytes(bytes: Uint8Array, claimedMimeType: string, visibility: "public" | "private"): void {
  const allowed = visibility === "public" ? PUBLIC_MEDIA_TYPES : PRIVATE_MEDIA_TYPES;
  if (!(allowed as readonly string[]).includes(claimedMimeType)) throw new Error("Unsupported file type");
  const detected = detectedMimeType(bytes);
  if (detected !== claimedMimeType) throw new Error("File signature does not match its declared type");
  if (detected === "application/pdf") {
    const header = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 65536))).toLowerCase();
    if (header.includes("/javascript") || header.includes("/launch") || header.includes("/embeddedfile")) {
      throw new Error("Active or embedded PDF content is not accepted");
    }
  }
}

export function imageDimensions(bytes: Uint8Array, mimeType: string): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === "image/png" && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === "image/webp" && bytes.length >= 30) {
    const format = String.fromCharCode(...bytes.slice(12, 16));
    if (format === "VP8X") {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return { width, height };
    }
  }
  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}
