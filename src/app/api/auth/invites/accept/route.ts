import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adminInvites, auditLogs, users } from "@/db/schema";
import { passwordSchema } from "@/lib/security/schemas";
import { assertSameOrigin, clientAddress, sha256 } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ token: z.string().min(32).max(500), name: z.string().trim().min(2).max(255), password: passwordSchema }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limit = await consumeRateLimit("registration", clientAddress(request));
    if (!limit.allowed) return Response.json({ error: "Too many attempts" }, { status: 429 });
    const input = schema.parse(await request.json());
    const tokenHash = sha256(input.token);
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918276, hashtext(${tokenHash}))`);
      const [invite] = await tx.select().from(adminInvites).where(and(
        eq(adminInvites.tokenHash, tokenHash),
        gt(adminInvites.expiresAt, new Date()),
        isNull(adminInvites.acceptedAt),
        isNull(adminInvites.revokedAt),
      )).limit(1);
      if (!invite || invite.role === "customer") throw new Error("This invitation is invalid or expired");
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1);
      if (existing) throw new Error("An account already exists for this email address");
      const [user] = await tx.insert(users).values({
        email: invite.email,
        name: input.name,
        role: invite.role,
        passwordHash: await bcrypt.hash(input.password, 12),
        isActive: true,
        passwordChangedAt: new Date(),
      }).returning();
      await tx.update(adminInvites).set({ acceptedAt: new Date() }).where(eq(adminInvites.id, invite.id));
      await tx.insert(auditLogs).values({
        actorUserId: user.id,
        action: "staff.invite_accepted",
        entityType: "user",
        entityId: String(user.id),
        afterValue: { email: user.email, role: user.role },
        metadata: {},
      });
      return user;
    });
    return Response.json({ success: true, userId: result.id, mfaRequired: result.role === "super_admin" || result.role === "finance" });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Invitation could not be accepted";
    return Response.json({ error: message }, { status: 400 });
  }
}
