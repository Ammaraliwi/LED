import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  bookings,
  bookingAddons,
  bookingDocuments,
  bookingStatusHistory,
  ledProducts,
  equipment as equipmentTable,
  customers,
  invoices,
} from "@/db/schema";
import { and, eq, notInArray, lte, gte, desc } from "drizzle-orm";
import { computePricing } from "@/lib/pricing";
import { getPricingSettingsMap } from "@/lib/settings";
import { generateBookingNumber, generateInvoiceNumber } from "@/lib/settings";
import { auth } from "@/auth";

const addonSchema = z.object({ equipmentId: z.number(), quantity: z.number().min(1) });

const documentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  fileType: z.string().optional(),
  category: z.enum(["venue_photo", "floor_plan", "stage_drawing", "reference_image", "pdf", "other"]).default("other"),
});

const createSchema = z.object({
  ledProductId: z.number().nullable().optional(),
  packageId: z.number().nullable().optional(),
  screenType: z.enum(["indoor", "outdoor"]).nullable().optional(),
  pixelPitch: z.number().nullable().optional(),
  widthM: z.number().nullable().optional(),
  heightM: z.number().nullable().optional(),
  totalCabinets: z.number().min(0),
  areaM2: z.number().nullable().optional(),
  aspectRatio: z.string().nullable().optional(),
  resolutionEstimate: z.string().nullable().optional(),

  eventDate: z.string(),
  installationDate: z.string(),
  installationTime: z.string().optional(),
  eventStartTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  dismantlingDate: z.string(),
  dismantlingTime: z.string().optional(),
  rentalDays: z.number().min(1),

  eventName: z.string().min(1),
  eventType: z.enum([
    "conference",
    "exhibition",
    "wedding",
    "corporate_event",
    "product_launch",
    "festival",
    "private_event",
    "other",
  ]),
  venueName: z.string().min(1),
  venueAddress: z.string().min(1),
  venueLat: z.number().nullable().optional(),
  venueLng: z.number().nullable().optional(),
  indoorOutdoor: z.enum(["indoor", "outdoor"]),
  additionalNotes: z.string().optional(),

  includeInstallation: z.boolean().default(true),
  includeDismantling: z.boolean().default(true),
  includeTransport: z.boolean().default(true),
  includeProcessor: z.boolean().default(true),
  includeTechnician: z.boolean().default(true),

  addons: z.array(addonSchema).default([]),
  documents: z.array(documentSchema).default([]),

  pricePerCabinetPerDay: z.number(),
  isWeekend: z.boolean().default(false),

  action: z.enum(["draft", "quotation_requested", "confirmed"]).default("quotation_requested"),
});

const BLOCKING_STATUSES = ["cancelled", "draft"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.customerId) {
      return NextResponse.json({ error: "You must be logged in to submit a booking." }, { status: 401 });
    }
    const customerId = Number(session.user.customerId);

    const body = createSchema.parse(await req.json());

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    const isCorporate = customer?.type === "corporate";

    // Re-validate availability server-side to prevent double-booking race conditions.
    if (body.ledProductId && body.totalCabinets > 0) {
      const [product] = await db.select().from(ledProducts).where(eq(ledProducts.id, body.ledProductId)).limit(1);
      if (!product) {
        return NextResponse.json({ error: "Screen product not found." }, { status: 404 });
      }

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
      const reserved = overlapping.reduce((sum, b) => sum + (b.totalCabinets ?? 0), 0);
      const availableCabinets = product.totalCabinets - reserved;
      if (availableCabinets < body.totalCabinets) {
        return NextResponse.json(
          {
            error: `Only ${Math.max(0, availableCabinets)} cabinets are available for these dates. Please adjust your dates or screen size.`,
          },
          { status: 409 }
        );
      }
    }

    const settings = await getPricingSettingsMap();

    let addonLines: { equipmentId: number; name: string; quantity: number; pricePerDay: number }[] = [];
    if (body.addons.length > 0) {
      const ids = body.addons.map((a) => a.equipmentId);
      const rows = await db.select().from(equipmentTable);
      addonLines = body.addons.map((a) => {
        const row = rows.find((r) => r.id === a.equipmentId);
        return {
          equipmentId: a.equipmentId,
          name: row?.name ?? "Add-on",
          quantity: a.quantity,
          pricePerDay: row ? Number(row.pricePerDay) : 0,
        };
      });
      void ids;
    }

    const breakdown = computePricing({
      pricePerCabinetPerDay: body.pricePerCabinetPerDay,
      totalCabinets: body.totalCabinets,
      rentalDays: body.rentalDays,
      includeInstallation: body.includeInstallation,
      includeDismantling: body.includeDismantling,
      includeTransport: body.includeTransport,
      includeProcessor: body.includeProcessor,
      includeTechnician: true,
      addons: addonLines,
      isWeekend: body.isWeekend,
      isCorporate,
      settings,
    });

    const bookingNumber = generateBookingNumber();

    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,
          customerId,
          ledProductId: body.ledProductId ?? null,
          packageId: body.packageId ?? null,
          screenType: body.screenType ?? null,
          pixelPitch: body.pixelPitch != null ? String(body.pixelPitch) : null,
          widthM: body.widthM != null ? String(body.widthM) : null,
          heightM: body.heightM != null ? String(body.heightM) : null,
          totalCabinets: body.totalCabinets,
          areaM2: body.areaM2 != null ? String(body.areaM2) : null,
          aspectRatio: body.aspectRatio ?? null,
          resolutionEstimate: body.resolutionEstimate ?? null,

          eventDate: body.eventDate,
          installationDate: body.installationDate,
          installationTime: body.installationTime ?? null,
          eventStartTime: body.eventStartTime ?? null,
          eventEndTime: body.eventEndTime ?? null,
          dismantlingDate: body.dismantlingDate,
          dismantlingTime: body.dismantlingTime ?? null,
          rentalDays: body.rentalDays,

          eventName: body.eventName,
          eventType: body.eventType,
          venueName: body.venueName,
          venueAddress: body.venueAddress,
          venueLat: body.venueLat != null ? String(body.venueLat) : null,
          venueLng: body.venueLng != null ? String(body.venueLng) : null,
          indoorOutdoor: body.indoorOutdoor,
          additionalNotes: body.additionalNotes ?? null,

          includeInstallation: body.includeInstallation,
          includeDismantling: body.includeDismantling,
          includeTransport: body.includeTransport,
          includeProcessor: body.includeProcessor,
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

          status: body.action,
        })
        .returning();

      if (addonLines.length > 0) {
        await tx.insert(bookingAddons).values(
          addonLines.map((a) => ({
            bookingId: booking.id,
            equipmentId: a.equipmentId,
            quantity: a.quantity,
            priceEach: String(a.pricePerDay),
            lineTotal: String(a.pricePerDay * a.quantity * body.rentalDays),
          }))
        );
      }

      if (body.documents.length > 0) {
        await tx.insert(bookingDocuments).values(
          body.documents.map((d) => ({
            bookingId: booking.id,
            fileName: d.fileName,
            fileUrl: d.fileUrl,
            fileType: d.fileType ?? null,
            category: d.category,
          }))
        );
      }

      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id,
        status: body.action,
        note: body.action === "confirmed" ? "Booking confirmed by customer." : "Quotation requested by customer.",
      });

      if (body.action === "confirmed") {
        await tx.insert(invoices).values({
          invoiceNumber: generateInvoiceNumber(),
          bookingId: booking.id,
          amount: String(breakdown.total),
          status: "unpaid",
          dueDate: body.installationDate,
        });
      }

      return booking;
    });

    return NextResponse.json({ success: true, booking: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customerId = Number(session.user.customerId);

  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  return NextResponse.json({ bookings: rows });
}
