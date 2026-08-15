import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { sendNotification } from "@/lib/notifications";
import { assertSameOrigin, clientAddress, randomToken, sha256 } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ email: z.string().trim().email().max(255) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limit = await consumeRateLimit("passwordReset", clientAddress(request));
    if (!limit.allowed) return Response.json({ success: true });
    const { email } = schema.parse(await request.json());
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (user?.isActive) {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: sha256(token), expiresAt });
      const appUrl = process.env.APP_URL;
      if (appUrl) await sendNotification({ type: "password_reset", recipient: user.email, link: `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() });
    }
    return Response.json({ success: true });
  } catch {
    return Response.json({ success: true });
  }
}
