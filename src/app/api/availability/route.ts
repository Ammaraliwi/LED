import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductAvailability } from "@/lib/booking/booking-service";

const schema = z.object({
  ledProductId: z.number().int().positive(),
  widthM: z.number().positive().max(100),
  heightM: z.number().positive().max(100),
  installationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dismantlingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict().refine((value) => value.installationDate <= value.dismantlingDate, {
  message: "Dismantling date must be on or after installation date",
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json(await getProductAvailability({
      productId: input.ledProductId,
      widthM: input.widthM,
      heightM: input.heightM,
      installationDate: input.installationDate,
      dismantlingDate: input.dismantlingDate,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
