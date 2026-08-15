import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireCustomer } from "@/lib/admin/authz";
import { assertSameOrigin } from "@/lib/security/request";

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
  try {
    assertSameOrigin(req);
    const { customerId } = await requireCustomer();
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
    const status = err instanceof Error && (err.name === "AuthenticationError" || err.name === "AuthorizationError") ? 403 : 500;
    return NextResponse.json({ error: "Update failed" }, { status });
  }
}
