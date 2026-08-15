import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { trustedQuoteRequestSchema } from "@/lib/booking-input";
import { calculateTrustedQuote } from "@/lib/booking/pricing-service";

export async function POST(request: Request) {
  try {
    const input = trustedQuoteRequestSchema.parse(await request.json());
    const session = await auth();
    const customerId = Number(session?.user?.customerId);
    const quote = await calculateTrustedQuote(input, Number.isInteger(customerId) ? customerId : null);
    return NextResponse.json({
      ...quote.breakdown,
      configuration: quote.configuration,
      rentalDays: quote.rentalDays,
      pricingFormulaVersion: quote.pricingFormulaVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
