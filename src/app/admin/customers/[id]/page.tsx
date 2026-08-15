import Link from "next/link";
import { notFound } from "next/navigation";
import { DynamicAdminForm } from "@/components/admin/dynamic-form";
import { AdminCard, AdminPageHeader, EmptyState, StatusPill, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { getCustomerDetail } from "@/lib/admin/queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin("customers.read"); const data = await getCustomerDetail(Number((await params).id)); if (!data) notFound();
  const customer = data.customer; const canWrite = hasPermission(actor.role, "customers.write");
  const paid = data.payments.filter((item) => item.status === "completed").reduce((sum, item) => sum + (item.kind === "payment" ? 1 : -1) * Number(item.amount), 0);
  const booked = data.bookings.filter((item) => !["draft", "cancelled"].includes(item.status)).reduce((sum, item) => sum + Number(item.total), 0);
  return <><AdminPageHeader title={customer.fullName} description={`${data.user.email} · customer #${customer.id}`} actions={<StatusPill value={data.user.isActive ? "active" : "inactive"} />} />
    <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]"><div className="space-y-6">{canWrite ? <DynamicAdminForm command="customer.update" fixed={{ id: customer.id }} nesting="data" title="Edit customer profile" fields={[
      { name: "type", label: "Customer type", type: "select", required: true, defaultValue: customer.type, options: [{ value: "individual", label: "Individual" }, { value: "corporate", label: "Corporate" }] },
      { name: "fullName", label: "Full name", required: true, defaultValue: customer.fullName }, { name: "companyName", label: "Company", defaultValue: customer.companyName }, { name: "companyRegNumber", label: "Company registration", defaultValue: customer.companyRegNumber }, { name: "taxNumber", label: "Tax number", defaultValue: customer.taxNumber }, { name: "mobileNumber", label: "Mobile", defaultValue: customer.mobileNumber }, { name: "whatsappNumber", label: "WhatsApp", defaultValue: customer.whatsappNumber }, { name: "country", label: "Country", defaultValue: customer.country }, { name: "city", label: "City", defaultValue: customer.city }, { name: "billingAddress", label: "Billing address", type: "textarea", defaultValue: customer.billingAddress }, { name: "internalNotes", label: "Internal notes", type: "textarea", defaultValue: customer.internalNotes },
    ]} /> : <AdminCard className="p-5 text-sm text-muted">Your role has read-only customer access.</AdminCard>}
      <AdminCard className="overflow-hidden"><div className="px-5 py-4 font-semibold">Booking history</div>{data.bookings.length ? <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={thClass}>Booking</th><th className={thClass}>Event</th><th className={thClass}>Total</th><th className={thClass}>Status</th></tr></thead><tbody>{data.bookings.map((booking) => <tr key={booking.id}><td className={tdClass}><Link href={`/admin/bookings/${booking.id}`} className="font-medium text-accent">{booking.bookingNumber}</Link></td><td className={tdClass}>{booking.eventName}<div className="text-xs text-muted">{formatDate(booking.eventDate)}</div></td><td className={tdClass}>{formatCurrency(booking.total)}</td><td className={tdClass}><StatusPill value={booking.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="No bookings yet" />}</AdminCard></div>
      <aside className="space-y-6"><AdminCard className="p-5"><h2 className="font-semibold">Account summary</h2><dl className="mt-4 space-y-4"><Item label="Booked value" value={formatCurrency(booked)} /><Item label="Payments recorded" value={formatCurrency(paid)} /><Item label="Outstanding" value={formatCurrency(Math.max(0, booked - paid))} /><Item label="Invoices" value={String(data.invoices.length)} /></dl></AdminCard><AdminCard className="p-5"><h2 className="font-semibold">Contact & billing</h2><dl className="mt-4 space-y-4"><Item label="Mobile" value={customer.mobileNumber || "—"} /><Item label="WhatsApp" value={customer.whatsappNumber || "—"} /><Item label="Billing address" value={customer.billingAddress || "—"} /></dl></AdminCard></aside></div>
  </>;
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
