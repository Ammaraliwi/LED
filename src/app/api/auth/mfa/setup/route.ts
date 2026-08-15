import { db } from "@/db";
import { staffMfa } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/authz";
import { ConflictError, errorResponse } from "@/lib/admin/errors";
import { assertSameOrigin } from "@/lib/security/request";
import { encryptMfaSecret, generateMfaSecret, mfaProvisioningUri } from "@/lib/security/mfa";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin(undefined, { allowMfaSetup: true });
    if (actor.mfaEnabled) throw new ConflictError("MFA is already enabled. A super administrator must approve a reset.");
    const secret = generateMfaSecret();
    const secretEncrypted = encryptMfaSecret(secret);
    await db.insert(staffMfa).values({ userId: actor.id, secretEncrypted, recoveryCodeHashes: [] })
      .onConflictDoUpdate({ target: staffMfa.userId, set: { secretEncrypted, recoveryCodeHashes: [], enabledAt: null, updatedAt: new Date() } });
    return Response.json({ secret, provisioningUri: mfaProvisioningUri(actor.email, secret) });
  } catch (error) {
    return errorResponse(error);
  }
}
