import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computePricing } from "@/lib/pricing";
import { getPricingSettingsMap } from "@/lib/settings";
import { db } from "@/db";
import { equipment as equipmentTable } from "@/db/schema";
import { inArray } from "drizzle-orm";

const schema = z.object({
  pricePerCabinetPerDay: z.number(),
  totalCabinets: z.number().min(0),
  rentalDays: z.number().min(1),
  includeInstallation: z.boolean().default(true),
  includeDismantling: z.boolean().default(true),
  includeTransport: z.boolean().default(true),
  includeProcessor: z.boolean().default(true),
  includeTechnician: z.boolean().default(true),
  addons: z.array(z.object({ equipmentId: z.number(), quantity: z.number().min(1) })).default([]),
  isWeekend: z.boolean().default(false),
  isCorporate: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const settings = await getPricingSettingsMap();

    let addonLines: { equipmentId: number; name: string; quantity: number; pricePerDay: number }[] = [];
    if (body.addons.length > 0) {
      const ids = body.addons.map((a) => a.equipmentId);
      const rows = await db.select().from(equipmentTable).where(inArray(equipmentTable.id, ids));
      addonLines = body.addons.map((a) => {
        const row = rows.find((r) => r.id === a.equipmentId);
        return {
          equipmentId: a.equipmentId,
          name: row?.name ?? "Add-on",
          quantity: a.quantity,
          pricePerDay: row ? Number(row.pricePerDay) : 0,
        };
      });
    }

    const breakdown = computePricing({
      pricePerCabinetPerDay: body.pricePerCabinetPerDay,
      totalCabinets: body.totalCabinets,
      rentalDays: body.rentalDays,
      includeInstallation: body.includeInstallation,
      includeDismantling: body.includeDismantling,
      includeTransport: body.includeTransport,
      includeProcessor: body.includeProcessor,
      includeTechnician: body.includeTechnician,
      addons: addonLines,
      isWeekend: body.isWeekend,
      isCorporate: body.isCorporate,
      settings,
    });

    return NextResponse.json(breakdown);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
