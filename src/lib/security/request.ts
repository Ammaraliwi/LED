import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ValidationError } from "@/lib/admin/errors";
export { safeLocalRedirect } from "@/lib/safe-redirect";

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) throw new ValidationError("A same-origin browser request is required");
  const originHost = new URL(origin).host;
  const a = Buffer.from(originHost.toLowerCase());
  const b = Buffer.from(host.toLowerCase());
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ValidationError("Cross-origin request rejected");
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
