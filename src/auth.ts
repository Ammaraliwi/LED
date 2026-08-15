import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customers, staffMfa } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { clientAddress } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { consumeRecoveryCodeHash, decryptMfaSecret, verifyTotp } from "@/lib/security/mfa";
import { isStaffRole, roleRequiresMfa } from "@/lib/admin/permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Railway terminates TLS and forwards the original host/protocol. Trusting
  // those headers lets each environment use its own domain without a hard-coded URL.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Authenticator code", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const normalizedEmail = email.toLowerCase().trim();
        const rateLimit = await consumeRateLimit("login", `${clientAddress(request)}:${normalizedEmail}`);
        if (!rateLimit.allowed) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (!user?.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const [mfa] = isStaffRole(user.role)
          ? await db.select().from(staffMfa).where(eq(staffMfa.userId, user.id)).limit(1)
          : [];
        const mfaEnabled = Boolean(mfa?.enabledAt);
        let mfaVerified = !isStaffRole(user.role);
        if (mfaEnabled) {
          const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
          if (!code || !mfa) return null;
          let verified = verifyTotp(decryptMfaSecret(mfa.secretEncrypted), code);
          if (!verified) {
            verified = await db.transaction(async (tx) => {
              await tx.execute(sql`SELECT pg_advisory_xact_lock(918279, ${user.id})`);
              const [current] = await tx.select().from(staffMfa).where(eq(staffMfa.userId, user.id)).limit(1);
              if (!current?.enabledAt) return false;
              const consumed = consumeRecoveryCodeHash(current.recoveryCodeHashes, code);
              if (!consumed.valid) return false;
              await tx.update(staffMfa).set({ recoveryCodeHashes: consumed.remaining, updatedAt: new Date() }).where(eq(staffMfa.userId, user.id));
              return true;
            });
          }
          if (!verified) return null;
          mfaVerified = true;
        } else if (roleRequiresMfa(user.role)) {
          // The session is intentionally limited to the MFA enrollment screen.
          mfaVerified = false;
        } else if (isStaffRole(user.role)) {
          mfaVerified = true;
        }

        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.userId, user.id))
          .limit(1);

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          customerId: customer ? String(customer.id) : undefined,
          sessionVersion: user.sessionVersion,
          mfaEnabled,
          mfaVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.customerId = (user as { customerId?: string }).customerId;
        token.id = (user as { id?: string }).id;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion;
        token.mfaEnabled = (user as { mfaEnabled?: boolean }).mfaEnabled;
        token.mfaVerified = (user as { mfaVerified?: boolean }).mfaVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role =
          typeof token.role === "string" ? token.role : undefined;
        session.user.customerId =
          typeof token.customerId === "string" ? token.customerId : undefined;
        session.user.id =
          typeof token.id === "string" ? token.id : session.user.id;
        session.user.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : undefined;
        session.user.mfaEnabled = token.mfaEnabled === true;
        session.user.mfaVerified = token.mfaVerified === true;
      }
      return session;
    },
    async signIn({ user }) {
      const id = Number(user.id);
      if (Number.isInteger(id)) await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, id));
      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
});
