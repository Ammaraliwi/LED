import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { trustedBookingRequestSchema } from "@/lib/booking-input";
import { createCustomerBooking } from "@/lib/booking/booking-service";
import { errorResponse } from "@/lib/admin/errors";
import { requireCustomer } from "@/lib/admin/authz";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await requireCustomer();
    const input = trustedBookingRequestSchema.parse(await request.json());
    const booking = await createCustomerBooking(input, identity);
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const { customerId } = await requireCustomer();
    const rows = await db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.createdAt));
    return NextResponse.json({ bookings: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
