import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, staffMfa, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/authz";
import { errorResponse, ValidationError } from "@/lib/admin/errors";
import { assertSameOrigin } from "@/lib/security/request";
import { decryptMfaSecret, generateRecoveryCodes, verifyTotp } from "@/lib/security/mfa";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin(undefined, { allowMfaSetup: true });
    const { code } = schema.parse(await request.json());
    const [record] = await db.select().from(staffMfa).where(eq(staffMfa.userId, actor.id)).limit(1);
    if (!record || !verifyTotp(decryptMfaSecret(record.secretEncrypted), code)) throw new ValidationError("Authenticator code is invalid");
    const recovery = generateRecoveryCodes();
    await db.transaction(async (tx) => {
      await tx.update(staffMfa).set({ enabledAt: new Date(), recoveryCodeHashes: recovery.hashes, updatedAt: new Date() }).where(eq(staffMfa.userId, actor.id));
      await tx.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, actor.id));
      await tx.insert(auditLogs).values({ actorUserId: actor.id, action: "auth.mfa_enabled", entityType: "user", entityId: String(actor.id), metadata: {} });
    });
    return Response.json({ success: true, recoveryCodes: recovery.plain, signInAgain: true });
  } catch (error) {
    return errorResponse(error);
  }
}
