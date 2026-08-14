import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, invoices, ledProducts } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/portal/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarCheck, Clock, FileText, Wallet, ArrowRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["confirmed", "deposit_paid", "scheduled", "equipment_prepared", "out_for_delivery", "installed", "event_running", "dismantling"];
const QUOTATION_STATUSES = ["quotation_requested", "pending_approval"];

export default async function PortalDashboard() {
  const session = await auth();
  const customerId = Number(session!.user!.customerId);

  const allBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  const productIds = [...new Set(allBookings.map((b) => b.ledProductId).filter((v): v is number => v !== null))];
  const products = productIds.length ? await db.select().from(ledProducts).where(inArray(ledProducts.id, productIds)) : [];

  const upcomingBooking = allBookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status) && b.eventDate && new Date(b.eventDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => (a.eventDate! < b.eventDate! ? -1 : 1))[0];

  const activeRentals = allBookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const pendingQuotations = allBookings.filter((b) => QUOTATION_STATUSES.includes(b.status)).length;

  const invoiceRows = await db.select().from(invoices).where(
    inArray(
      invoices.bookingId,
      allBookings.map((b) => b.id)
    )
  );
  const outstanding = invoiceRows
    .filter((i) => i.status === "unpaid" || i.status === "partially_paid" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const recent = allBookings.slice(0, 5);

  return (
    <Container className="!px-0 max-w-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with your bookings.</p>
        </div>
        <Button href="/configure">
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard
          icon={CalendarCheck}
          label="Upcoming Booking"
          value={upcomingBooking ? formatDate(upcomingBooking.eventDate) : "None scheduled"}
          sub={upcomingBooking?.eventName}
        />
        <DashCard icon={Clock} label="Active Rentals" value={String(activeRentals)} />
        <DashCard icon={FileText} label="Pending Quotations" value={String(pendingQuotations)} />
        <DashCard icon={Wallet} label="Outstanding Payments" value={formatCurrency(outstanding)} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Recent Bookings</h2>
          <Link href="/portal/bookings" className="flex items-center gap-1 text-sm font-medium text-accent hover:gap-1.5 transition-all">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 space-y-3">
            {recent.map((b) => {
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
      </div>
    </Container>
  );
}

function DashCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string | null }) {
  return (
    <div className="surface-card rounded-2xl p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
        <Icon className="h-4.5 w-4.5 text-accent" />
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider text-muted-2">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold text-foreground truncate">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted truncate">{sub}</div>}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="surface-card mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center">
      <CalendarCheck className="h-8 w-8 text-muted-2" />
      <p className="text-sm text-muted">You don&apos;t have any bookings yet.</p>
      <Button href="/configure" size="sm">
        Build Your First Screen
      </Button>
    </div>
  );
}
