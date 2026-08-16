import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, passwordResetTokens, users } from "@/db/schema";
import { passwordSchema } from "@/lib/security/schemas";
import { assertSameOrigin, clientAddress, sha256 } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ token: z.string().min(32).max(500), password: passwordSchema }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limit = await consumeRateLimit("passwordReset", clientAddress(request));
    if (!limit.allowed) return Response.json({ error: "Too many attempts" }, { status: 429 });
    const input = schema.parse(await request.json());
    const tokenHash = sha256(input.token);
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918277, hashtext(${tokenHash}))`);
      const [token] = await tx.select().from(passwordResetTokens).where(and(
        eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt),
      )).limit(1);
      if (!token) throw new Error("This password reset link is invalid or expired");
      await tx.update(users).set({
        passwordHash: await bcrypt.hash(input.password, 12),
        passwordChangedAt: new Date(),
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      }).where(eq(users.id, token.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, token.userId), isNull(passwordResetTokens.usedAt)));
      await tx.insert(auditLogs).values({ actorUserId: token.userId, action: "auth.password_reset", entityType: "user", entityId: String(token.userId), metadata: {} });
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Password reset failed" }, { status: 400 });
  }
}
