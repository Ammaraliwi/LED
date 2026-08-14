import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customers } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
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
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: body.fullName,
        role: "customer",
      })
      .returning();

    const [customer] = await db
      .insert(customers)
      .values({
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
      })
      .returning();

    return NextResponse.json({ success: true, userId: user.id, customerId: customer.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
