import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  const customerId = Number(session!.user!.customerId);

  const myBookings = await db.select().from(bookings).where(eq(bookings.customerId, customerId));
  const bookingIds = myBookings.map((b) => b.id);
  const paymentRows = bookingIds.length
    ? await db.select().from(payments).where(inArray(payments.bookingId, bookingIds)).orderBy(desc(payments.paidAt))
    : [];

  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">Payments</h1>
      <p className="mt-1 text-sm text-muted">A record of payments made towards your bookings.</p>

      {paymentRows.length === 0 ? (
        <div className="surface-card mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center">
          <CreditCard className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No payments recorded yet.</p>
          <p className="max-w-sm text-xs text-muted-2">
            We currently support bank transfer and pay-on-invoice. Online card payments are coming soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {paymentRows.map((p) => {
            const booking = myBookings.find((b) => b.id === p.bookingId);
            return (
              <div key={p.id} className="surface-card flex items-center justify-between rounded-2xl p-5">
                <div>
                  <div className="text-sm font-medium text-foreground">{booking?.eventName}</div>
                  <div className="mt-1 text-xs text-muted-2">
                    {p.method.replace(/_/g, " ")} · {formatDate(p.paidAt)} {p.reference && `· Ref: ${p.reference}`}
                  </div>
                </div>
                <span className="font-display text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
