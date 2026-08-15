import "server-only";

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  registration: { limit: 5, windowSeconds: 60 * 60 },
  upload: { limit: 30, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  contact: { limit: 8, windowSeconds: 60 * 60 },
  sensitiveAdmin: { limit: 40, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitScope = keyof typeof RATE_LIMIT_POLICIES;

function hashKey(scope: string, key: string): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.AUTH_SECRET;
  if (!salt) throw new Error("RATE_LIMIT_SALT or AUTH_SECRET is required");
  return createHash("sha256").update(`${salt}:${scope}:${key}`).digest("hex");
}

export async function consumeRateLimit(scope: RateLimitScope, key: string): Promise<{ allowed: boolean; remaining: number }> {
  const policy = RATE_LIMIT_POLICIES[scope];
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (policy.windowSeconds * 1000)) * policy.windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + policy.windowSeconds * 1000);
  const keyHash = hashKey(scope, key);

  const result = await db.execute(sql`
    INSERT INTO rate_limit_buckets (scope, key_hash, window_started_at, count, expires_at)
    VALUES (${scope}, ${keyHash}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT (scope, key_hash) DO UPDATE SET
      count = CASE
        WHEN rate_limit_buckets.window_started_at < ${windowStart} THEN 1
        ELSE rate_limit_buckets.count + 1
      END,
      window_started_at = CASE
        WHEN rate_limit_buckets.window_started_at < ${windowStart} THEN ${windowStart}
        ELSE rate_limit_buckets.window_started_at
      END,
      expires_at = ${expiresAt}
    RETURNING count
  `);

  const count = Number((result[0] as { count?: number } | undefined)?.count ?? policy.limit + 1);
  return { allowed: count <= policy.limit, remaining: Math.max(0, policy.limit - count) };
}
