import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, invoices } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/portal/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await auth();
  const customerId = Number(session!.user!.customerId);

  const myBookings = await db.select().from(bookings).where(eq(bookings.customerId, customerId));
  const bookingIds = myBookings.map((b) => b.id);
  const invoiceRows = bookingIds.length
    ? await db.select().from(invoices).where(inArray(invoices.bookingId, bookingIds)).orderBy(desc(invoices.issuedAt))
    : [];

  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">Invoices</h1>
      <p className="mt-1 text-sm text-muted">Invoices generated for your confirmed bookings.</p>

      {invoiceRows.length === 0 ? (
        <div className="surface-card mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center">
          <Receipt className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No invoices yet — confirm a booking to generate one.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-5 py-3.5 font-medium">Invoice</th>
                <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Due Date</th>
                <th className="px-5 py-3.5 font-medium">Amount</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((inv) => {
                const booking = myBookings.find((b) => b.id === inv.bookingId);
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/portal/bookings/${inv.bookingId}`} className="font-medium text-foreground hover:text-accent">
                        {inv.invoiceNumber}
                      </Link>
                      <div className="text-xs text-muted-2">{booking?.eventName}</div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-muted">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
