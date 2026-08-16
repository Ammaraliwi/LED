import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, equipment, ledProducts } from "@/db/schema";
import type { TrustedQuoteRequest } from "@/lib/booking-input";
import { isQatarWeekend, rentalDaysBetween } from "@/lib/booking-input";
import { computeConfigurator, computePricing } from "@/lib/pricing";
import { PRICING_FORMULA_VERSION, PRICING_KEYS } from "@/lib/pricing-catalog";
import { getPricingSettingsMap } from "@/lib/settings";
import { ValidationError } from "@/lib/admin/errors";

export async function calculateTrustedQuote(input: TrustedQuoteRequest, customerId?: number | null) {
  const [product] = await db
    .select()
    .from(ledProducts)
    .where(and(eq(ledProducts.id, input.ledProductId), eq(ledProducts.isActive, true)))
    .limit(1);
  if (!product) throw new ValidationError("Screen product not found or inactive");

  const configuration = computeConfigurator(
    input.widthM,
    input.heightM,
    product.cabinetWidthMm,
    product.cabinetHeightMm,
    Number(product.pixelPitch),
  );
  const rentalDays = rentalDaysBetween(input.installationDate, input.dismantlingDate);
  if (rentalDays > 365) throw new ValidationError("Rental periods longer than 365 days require manual review");

  const equipmentIds = [...new Set(input.addons.map((item) => item.equipmentId))];
  const equipmentRows = equipmentIds.length
    ? await db.select().from(equipment).where(and(inArray(equipment.id, equipmentIds), eq(equipment.isActive, true)))
    : [];
  if (equipmentRows.length !== equipmentIds.length) throw new ValidationError("One or more selected add-ons are unavailable");

  const addonLines = input.addons.map((selection) => {
    const row = equipmentRows.find((item) => item.id === selection.equipmentId)!;
    if (selection.quantity > row.totalQuantity) throw new ValidationError(`${row.name} only has ${row.totalQuantity} units available`);
    return {
      equipmentId: row.id,
      name: row.name,
      quantity: selection.quantity,
      pricePerDay: Number(row.pricePerDay),
    };
  });

  let isCorporate = false;
  if (customerId) {
    const [customer] = await db.select({ type: customers.type }).from(customers).where(eq(customers.id, customerId)).limit(1);
    isCorporate = customer?.type === "corporate";
  }
  const settings = await getPricingSettingsMap();
  const breakdown = computePricing({
    pricePerCabinetPerDay: Number(product.pricePerCabinetPerDay),
    totalCabinets: configuration.totalCabinets,
    rentalDays,
    includeInstallation: input.includeInstallation,
    includeDismantling: input.includeDismantling,
    includeTransport: input.includeTransport,
    includeProcessor: input.includeProcessor,
    includeTechnician: true,
    addons: addonLines,
    isWeekend: isQatarWeekend(input.eventDate),
    isCorporate,
    settings,
  });

  const pricingSettingsSnapshot = Object.fromEntries(PRICING_KEYS.map((key) => [key, settings[key]]));
  return {
    product,
    configuration,
    rentalDays,
    isWeekend: isQatarWeekend(input.eventDate),
    isCorporate,
    addonLines,
    breakdown,
    pricingFormulaVersion: PRICING_FORMULA_VERSION,
    pricingSettingsSnapshot,
  };
}

export type TrustedQuote = Awaited<ReturnType<typeof calculateTrustedQuote>>;
