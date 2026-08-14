import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

const patchSchema = z.object({
  fullName: z.string().min(2),
  companyName: z.string().optional(),
  companyRegNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  mobileNumber: z.string().min(6),
  whatsappNumber: z.string().optional(),
  country: z.string().min(2),
  city: z.string().min(1),
  billingAddress: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customerId = Number(session.user.customerId);

  try {
    const body = patchSchema.parse(await req.json());
    const [updated] = await db
      .update(customers)
      .set(body)
      .where(eq(customers.id, customerId))
      .returning();
    return NextResponse.json({ success: true, customer: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
