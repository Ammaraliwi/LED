import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bookingAddons,
  bookingDocuments,
  bookings,
  bookingStatusHistory,
  customers,
  equipment,
  invoices,
  ledProducts,
  mediaAssets,
  pricingSettings,
} from "@/db/schema";
import type { TrustedBookingRequest } from "@/lib/booking-input";
import { isQatarWeekend, rentalDaysBetween } from "@/lib/booking-input";
import { ConflictError, ValidationError } from "@/lib/admin/errors";
import { computeConfigurator, computePricing, type PricingSettingsMap } from "@/lib/pricing";
import { PRICING_FORMULA_VERSION, PRICING_KEYS, validateCompletePricingSettings } from "@/lib/pricing-catalog";
import { generateBookingNumber, generateInvoiceNumber } from "@/lib/settings";

async function minimumAvailableDuringRange(
  executor: { execute: typeof db.execute },
  productId: number,
  totalCabinets: number,
  startDate: string,
  endDate: string,
): Promise<number> {
  const result = await executor.execute(sql`
    SELECT COALESCE(MIN(${totalCabinets} - usage.reserved - usage.blocked), ${totalCabinets})::int AS available
    FROM generate_series(${startDate}::date, ${endDate}::date, interval '1 day') AS day(value)
    CROSS JOIN LATERAL (
      SELECT
        COALESCE((
          SELECT SUM(b.total_cabinets)
          FROM bookings b
          WHERE b.led_product_id = ${productId}
            AND b.status NOT IN ('draft', 'cancelled')
            AND b.installation_date <= day.value::date
            AND b.dismantling_date >= day.value::date
        ), 0)::int AS reserved,
        COALESCE((
          SELECT SUM(i.quantity)
          FROM inventory_blocks i
          WHERE i.led_product_id = ${productId}
            AND i.archived_at IS NULL
            AND i.start_date <= day.value::date
            AND i.end_date >= day.value::date
        ), 0)::int AS blocked
    ) usage
  `);
  return Number((result[0] as { available?: number } | undefined)?.available ?? 0);
}

export async function getProductAvailability(input: {
  productId: number;
  widthM: number;
  heightM: number;
  installationDate: string;
  dismantlingDate: string;
}) {
  const [product] = await db.select().from(ledProducts).where(and(eq(ledProducts.id, input.productId), eq(ledProducts.isActive, true))).limit(1);
  if (!product) throw new ValidationError("Screen product not found or inactive");
  const configuration = computeConfigurator(input.widthM, input.heightM, product.cabinetWidthMm, product.cabinetHeightMm, Number(product.pixelPitch));
  const available = await minimumAvailableDuringRange(db, product.id, product.totalCabinets, input.installationDate, input.dismantlingDate);
  return {
    available: available >= configuration.totalCabinets,
    availableCabinets: Math.max(0, available),
    totalCabinets: product.totalCabinets,
    requiredCabinets: configuration.totalCabinets,
    configuration,
  };
}

export async function createCustomerBooking(input: TrustedBookingRequest, identity: { userId: number; customerId: number }) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918274, 1)`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918273, ${input.ledProductId})`);

    const [product] = await tx
      .select()
      .from(ledProducts)
      .where(and(eq(ledProducts.id, input.ledProductId), eq(ledProducts.isActive, true)))
      .limit(1);
    if (!product) throw new ValidationError("Screen product not found or inactive");

    const [customer] = await tx.select().from(customers).where(eq(customers.id, identity.customerId)).limit(1);
    if (!customer || customer.userId !== identity.userId) throw new ValidationError("Customer profile is unavailable");

    const configuration = computeConfigurator(
      input.widthM,
      input.heightM,
      product.cabinetWidthMm,
      product.cabinetHeightMm,
      Number(product.pixelPitch),
    );
    const rentalDays = rentalDaysBetween(input.installationDate, input.dismantlingDate);
    if (rentalDays > 365) throw new ValidationError("Rental periods longer than 365 days require manual review");

    const availableCabinets = await minimumAvailableDuringRange(
      tx,
      product.id,
      product.totalCabinets,
      input.installationDate,
      input.dismantlingDate,
    );
    if (availableCabinets < configuration.totalCabinets) {
      throw new ConflictError(`Only ${Math.max(0, availableCabinets)} cabinets are available for these dates`);
    }

    const equipmentIds = [...new Set(input.addons.map((item) => item.equipmentId))];
    const equipmentRows = equipmentIds.length
      ? await tx.select().from(equipment).where(and(inArray(equipment.id, equipmentIds), eq(equipment.isActive, true)))
      : [];
    if (equipmentRows.length !== equipmentIds.length) throw new ValidationError("One or more selected add-ons are unavailable");
    const addonLines = input.addons.map((selection) => {
      const row = equipmentRows.find((item) => item.id === selection.equipmentId)!;
      if (selection.quantity > row.totalQuantity) throw new ValidationError(`${row.name} only has ${row.totalQuantity} units available`);
      return { equipmentId: row.id, name: row.name, quantity: selection.quantity, pricePerDay: Number(row.pricePerDay) };
    });

    const settingsRows = await tx.select().from(pricingSettings);
    const settingsMap: PricingSettingsMap = {};
    for (const row of settingsRows) settingsMap[row.key] = row.value;
    const settings = validateCompletePricingSettings(settingsMap);
    const isWeekend = isQatarWeekend(input.eventDate);
    const isCorporate = customer.type === "corporate";
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
      isWeekend,
      isCorporate,
      settings,
    });

    const documentIds = [...new Set(input.documents.map((document) => document.mediaAssetId))];
    const documentAssets = documentIds.length
      ? await tx.select().from(mediaAssets).where(inArray(mediaAssets.id, documentIds))
      : [];
    if (
      documentAssets.some((asset) => asset.status !== "ready" || asset.visibility !== "private" || asset.uploadedByUserId !== identity.userId) ||
      documentAssets.length !== documentIds.length
    ) {
      throw new ValidationError("One or more booking documents are invalid or unauthorized");
    }

    const pricingSettingsSnapshot = Object.fromEntries(PRICING_KEYS.map((key) => [key, settings[key]]));
    const pricingSnapshot = {
      formulaVersion: PRICING_FORMULA_VERSION,
      calculatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        screenType: product.screenType,
        pixelPitch: Number(product.pixelPitch),
        cabinetWidthMm: product.cabinetWidthMm,
        cabinetHeightMm: product.cabinetHeightMm,
        pricePerCabinetPerDay: Number(product.pricePerCabinetPerDay),
      },
      requestedDimensions: { widthM: input.widthM, heightM: input.heightM },
      configuration,
      dates: {
        eventDate: input.eventDate,
        installationDate: input.installationDate,
        dismantlingDate: input.dismantlingDate,
        rentalDays,
        isWeekend,
      },
      customerType: customer.type,
      services: {
        installation: input.includeInstallation,
        dismantling: input.includeDismantling,
        transport: input.includeTransport,
        processor: input.includeProcessor,
        technician: true,
      },
      addons: addonLines,
      settings: pricingSettingsSnapshot,
      breakdown,
    };

    const [booking] = await tx
      .insert(bookings)
      .values({
        bookingNumber: generateBookingNumber(),
        customerId: identity.customerId,
        ledProductId: product.id,
        packageId: input.packageId ?? null,
        screenType: product.screenType,
        pixelPitch: product.pixelPitch,
        widthM: String(configuration.widthM),
        heightM: String(configuration.heightM),
        totalCabinets: configuration.totalCabinets,
        areaM2: String(configuration.areaM2),
        aspectRatio: configuration.aspectRatio,
        resolutionEstimate: configuration.resolutionEstimate,
        eventDate: input.eventDate,
        installationDate: input.installationDate,
        installationTime: input.installationTime ?? null,
        eventStartTime: input.eventStartTime ?? null,
        eventEndTime: input.eventEndTime ?? null,
        dismantlingDate: input.dismantlingDate,
        dismantlingTime: input.dismantlingTime ?? null,
        rentalDays,
        eventName: input.eventName,
        eventType: input.eventType,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        venueLat: input.venueLat == null ? null : String(input.venueLat),
        venueLng: input.venueLng == null ? null : String(input.venueLng),
        indoorOutdoor: input.indoorOutdoor,
        additionalNotes: input.additionalNotes ?? null,
        includeInstallation: input.includeInstallation,
        includeDismantling: input.includeDismantling,
        includeTransport: input.includeTransport,
        includeProcessor: input.includeProcessor,
        includeTechnician: true,
        rentalSubtotal: String(breakdown.rentalSubtotal),
        installationFee: String(breakdown.installationFee),
        dismantlingFee: String(breakdown.dismantlingFee),
        transportFee: String(breakdown.transportFee),
        processorFee: String(breakdown.processorFee),
        technicianFee: String(breakdown.technicianFee),
        addonsTotal: String(breakdown.addonsTotal),
        discountAmount: String(breakdown.discountAmount),
        discountLabel: breakdown.discountLabel,
        vatAmount: String(breakdown.vatAmount),
        vatPercent: String(breakdown.vatPercent),
        total: String(breakdown.total),
        status: input.action,
        pricingSnapshot,
        pricingFormulaVersion: PRICING_FORMULA_VERSION,
      })
      .returning();

    if (addonLines.length) {
      await tx.insert(bookingAddons).values(addonLines.map((addon) => ({
        bookingId: booking.id,
        equipmentId: addon.equipmentId,
        quantity: addon.quantity,
        priceEach: String(addon.pricePerDay),
        lineTotal: String(addon.pricePerDay * addon.quantity * rentalDays),
      })));
    }
    if (input.documents.length) {
      await tx.insert(bookingDocuments).values(input.documents.map((document) => {
        const asset = documentAssets.find((item) => item.id === document.mediaAssetId)!;
        return {
          bookingId: booking.id,
          mediaAssetId: asset.id,
          fileName: asset.originalName,
          fileUrl: `/api/media/${asset.id}/content`,
          fileType: asset.mimeType,
          category: document.category,
        };
      }));
    }
    await tx.insert(bookingStatusHistory).values({
      bookingId: booking.id,
      previousStatus: null,
      status: input.action,
      changedByUserId: identity.userId,
      source: "customer",
      note: input.action === "confirmed" ? "Booking confirmed by customer." : input.action === "draft" ? "Draft saved by customer." : "Quotation requested by customer.",
    });
    if (input.action === "confirmed") {
      await tx.insert(invoices).values({
        invoiceNumber: generateInvoiceNumber(),
        bookingId: booking.id,
        amount: String(breakdown.total),
        status: "unpaid",
        dueDate: input.installationDate,
      });
    }
    return booking;
  });
}
