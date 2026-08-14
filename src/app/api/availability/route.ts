import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, ledProducts } from "@/db/schema";
import { and, eq, notInArray, lte, gte } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  ledProductId: z.number(),
  requiredCabinets: z.number().min(1),
  installationDate: z.string(), // YYYY-MM-DD
  dismantlingDate: z.string(), // YYYY-MM-DD
});

const BLOCKING_STATUSES = ["cancelled", "draft"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const [product] = await db
      .select()
      .from(ledProducts)
      .where(eq(ledProducts.id, body.ledProductId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Screen product not found" }, { status: 404 });
    }

    // Find bookings for this product whose occupancy window overlaps the requested window,
    // excluding cancelled/draft bookings which don't hold inventory.
    const overlapping = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.ledProductId, body.ledProductId),
          notInArray(bookings.status, [...BLOCKING_STATUSES]),
          lte(bookings.installationDate, body.dismantlingDate),
          gte(bookings.dismantlingDate, body.installationDate)
        )
      );

    const reservedCabinets = overlapping.reduce((sum, b) => sum + (b.totalCabinets ?? 0), 0);
    const availableCabinets = product.totalCabinets - reservedCabinets;
    const isAvailable = availableCabinets >= body.requiredCabinets;

    return NextResponse.json({
      available: isAvailable,
      availableCabinets: Math.max(0, availableCabinets),
      totalCabinets: product.totalCabinets,
      requiredCabinets: body.requiredCabinets,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
