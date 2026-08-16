import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { passwordSchema } from "@/lib/security/schemas";
import { assertSameOrigin, clientAddress } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
  mobileNumber: z.string().min(6),
  whatsappNumber: z.string().optional(),
  country: z.string().min(2),
  city: z.string().min(1),
  billingAddress: z.string().optional(),
  type: z.enum(["individual", "corporate"]).default("individual"),
  companyName: z.string().optional(),
  companyRegNumber: z.string().optional(),
  taxNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const rateLimit = await consumeRateLimit("registration", clientAddress(req));
    if (!rateLimit.allowed) return NextResponse.json({ error: "Registration rate limit exceeded" }, { status: 429 });
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const passwordHash = await bcrypt.hash(body.password, 12);

    const { user, customer } = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918281, hashtext(${email}))`);
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new Error("ACCOUNT_EXISTS");
      const [user] = await tx.insert(users).values({
          email,
          passwordHash,
          name: body.fullName,
          role: "customer",
          passwordChangedAt: new Date(),
        }).returning();
      const [customer] = await tx.insert(customers).values({
          userId: user.id,
          type: body.type,
          fullName: body.fullName,
          companyName: body.companyName,
          companyRegNumber: body.companyRegNumber,
          taxNumber: body.taxNumber,
          mobileNumber: body.mobileNumber,
          whatsappNumber: body.whatsappNumber,
          country: body.country,
          city: body.city,
          billingAddress: body.billingAddress,
        }).returning();
      return { user, customer };
    });

    return NextResponse.json({ success: true, userId: user.id, customerId: customer.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "ACCOUNT_EXISTS") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
