import "dotenv/config";
import { randomBytes, createHash } from "node:crypto";
import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { adminInvites, users } from "../src/db/schema";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
const appUrl = process.env.APP_URL?.replace(/\/$/, "");
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address");
if (!bootstrapToken || bootstrapToken.length < 32) throw new Error("ADMIN_BOOTSTRAP_TOKEN must contain at least 32 random characters");
if (!appUrl || !/^https?:\/\//.test(appUrl)) throw new Error("APP_URL must be the approved application origin");

const result = await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(918278, 1)`);
  const [{ total }] = await tx.select({ total: count() }).from(users).where(and(inArray(users.role, ["super_admin", "sales", "operations", "technician", "finance"]), eq(users.isActive, true)));
  if (total > 0) throw new Error("Bootstrap is disabled because an active staff account already exists");
  const [existing] = await tx.select().from(adminInvites).where(and(eq(adminInvites.email, email), eq(adminInvites.role, "super_admin"), isNull(adminInvites.acceptedAt), isNull(adminInvites.revokedAt), gt(adminInvites.expiresAt, new Date()))).limit(1);
  if (existing) throw new Error("An unexpired bootstrap invitation already exists; wait for expiry or revoke it through a controlled database procedure");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await tx.insert(adminInvites).values({ email, role: "super_admin", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt });
  return { link: `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`, expiresAt };
});

console.log("One-time super_admin invitation created.");
console.log(`Expires: ${result.expiresAt.toISOString()}`);
console.log(`Open once: ${result.link}`);
console.log("Remove ADMIN_BOOTSTRAP_TOKEN and BOOTSTRAP_ADMIN_EMAIL from the environment immediately after acceptance.");
process.exit(0);
