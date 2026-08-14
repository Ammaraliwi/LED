import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, bookingAddons, bookingDocuments, bookingStatusHistory, ledProducts, equipment as equipmentTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/portal/status-badge";
import { BookingTimeline } from "@/components/portal/booking-timeline";
import { BookingActions } from "@/components/portal/booking-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const customerId = Number(session!.user!.customerId);
  const bookingId = Number(id);

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.customerId !== customerId) notFound();

  const [product, addons, documents, statusHistory] = await Promise.all([
    booking.ledProductId ? db.select().from(ledProducts).where(eq(ledProducts.id, booking.ledProductId)).limit(1) : Promise.resolve([]),
    db.select().from(bookingAddons).where(eq(bookingAddons.bookingId, bookingId)),
    db.select().from(bookingDocuments).where(eq(bookingDocuments.bookingId, bookingId)),
    db.select().from(bookingStatusHistory).where(eq(bookingStatusHistory.bookingId, bookingId)),
  ]);

  const equipmentIds = addons.map((a) => a.equipmentId);
  const equipmentRows = equipmentIds.length ? await db.select().from(equipmentTable) : [];

  return (
    <Container className="!px-0 max-w-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-foreground">{booking.eventName || "Untitled Event"}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-muted-2">{booking.bookingNumber}</p>
        </div>
        <BookingActions bookingId={booking.id} status={booking.status} productSlug={product[0]?.slug} />
      </div>

      <div className="mt-8 surface-card rounded-2xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Booking Status</h2>
        <div className="mt-4">
          <BookingTimeline currentStatus={booking.status} history={statusHistory} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Screen Configuration</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Screen" value={product[0]?.name ?? "—"} />
            <Row label="Dimensions" value={`${booking.widthM}m × ${booking.heightM}m`} />
            <Row label="Cabinets" value={String(booking.totalCabinets)} />
            <Row label="Resolution" value={booking.resolutionEstimate ?? "—"} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Rental Dates</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Event Date" value={formatDate(booking.eventDate)} />
            <Row label="Installation" value={`${formatDate(booking.installationDate)} · ${booking.installationTime ?? ""}`} />
            <Row label="Dismantling" value={`${formatDate(booking.dismantlingDate)} · ${booking.dismantlingTime ?? ""}`} />
            <Row label="Duration" value={`${booking.rentalDays} day${booking.rentalDays > 1 ? "s" : ""}`} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Venue</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Venue" value={booking.venueName ?? "—"} />
            <Row label="Address" value={booking.venueAddress ?? "—"} />
            <Row label="Setting" value={booking.indoorOutdoor ?? "—"} />
            <Row label="Event Type" value={booking.eventType?.replace(/_/g, " ") ?? "—"} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Price Breakdown</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Rental Subtotal" value={formatCurrency(booking.rentalSubtotal)} />
            <Row label="Installation" value={formatCurrency(booking.installationFee)} />
            <Row label="Dismantling" value={formatCurrency(booking.dismantlingFee)} />
            <Row label="Transportation" value={formatCurrency(booking.transportFee)} />
            <Row label="Processor" value={formatCurrency(booking.processorFee)} />
            <Row label="Technical Support" value={formatCurrency(booking.technicianFee)} />
            {addons.length > 0 && (
              <Row
                label="Add-ons"
                value={addons.map((a) => `${equipmentRows.find((e) => e.id === a.equipmentId)?.name ?? "Item"} ×${a.quantity}`).join(", ")}
              />
            )}
            {Number(booking.discountAmount) > 0 && <Row label={booking.discountLabel ?? "Discount"} value={`- ${formatCurrency(booking.discountAmount)}`} />}
            <Row label={`VAT (${booking.vatPercent}%)`} value={formatCurrency(booking.vatAmount)} />
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-display text-base font-semibold text-foreground">Total</span>
            <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(booking.total)}</span>
          </div>
        </div>
      </div>

      {booking.additionalNotes && (
        <div className="mt-6 surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Additional Notes</h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">{booking.additionalNotes}</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-6 surface-card rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">Documents</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-border p-3 hover:border-accent/40 transition-colors"
              >
                {doc.category === "pdf" ? <FileText className="h-4 w-4 text-accent" /> : <ImageIcon className="h-4 w-4 text-accent" />}
                <span className="truncate text-xs text-foreground">{doc.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-2 capitalize">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
