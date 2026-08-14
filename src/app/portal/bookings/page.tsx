import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, ledProducts } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/app/portal/page";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await auth();
  const customerId = Number(session!.user!.customerId);

  const allBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  const productIds = [...new Set(allBookings.map((b) => b.ledProductId).filter((v): v is number => v !== null))];
  const products = productIds.length ? await db.select().from(ledProducts).where(inArray(ledProducts.id, productIds)) : [];

  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">My Bookings</h1>
      <p className="mt-1 text-sm text-muted">All your screen bookings, quotations and drafts in one place.</p>

      {allBookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-5 py-3.5 font-medium">Booking</th>
                <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Screen</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Event Date</th>
                <th className="px-5 py-3.5 font-medium">Total</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allBookings.map((b) => {
                const product = products.find((p) => p.id === b.ledProductId);
                return (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/portal/bookings/${b.id}`} className="font-medium text-foreground hover:text-accent">
                        {b.eventName || "Untitled Event"}
                      </Link>
                      <div className="text-xs text-muted-2">{b.bookingNumber}</div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-muted">{product?.name ?? "—"}</td>
                    <td className="px-5 py-4 hidden md:table-cell text-muted">{formatDate(b.eventDate)}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{formatCurrency(b.total)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
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
