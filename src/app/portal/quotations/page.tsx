import Link from "next/link";
import { db } from "@/db";
import { bookings, ledProducts } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/portal/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import { requireCustomer } from "@/lib/admin/authz";

export const dynamic = "force-dynamic";

const QUOTATION_STATUSES = ["quotation_requested", "pending_approval"];

export default async function QuotationsPage() {
  const { customerId } = await requireCustomer();

  const allBookings = await db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.createdAt));
  const quotations = allBookings.filter((b) => QUOTATION_STATUSES.includes(b.status));

  const productIds = [...new Set(quotations.map((b) => b.ledProductId).filter((v): v is number => v !== null))];
  const products = productIds.length ? await db.select().from(ledProducts).where(inArray(ledProducts.id, productIds)) : [];

  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">My Quotations</h1>
      <p className="mt-1 text-sm text-muted">Quotations awaiting review before they become confirmed bookings.</p>

      {quotations.length === 0 ? (
        <div className="surface-card mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center">
          <FileText className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No quotations right now.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {quotations.map((b) => {
            const product = products.find((p) => p.id === b.ledProductId);
            return (
              <Link
                key={b.id}
                href={`/portal/bookings/${b.id}`}
                className="surface-card surface-card-hover flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{b.eventName || "Untitled Event"}</div>
                  <div className="mt-1 text-xs text-muted">
                    {product?.name} · {formatDate(b.eventDate)} · {b.bookingNumber}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-sm font-semibold text-foreground">{formatCurrency(b.total)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
