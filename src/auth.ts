import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
