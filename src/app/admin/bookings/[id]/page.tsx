import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCommandButton, DynamicAdminForm } from "@/components/admin/dynamic-form";
import { AdminCard, AdminPageHeader, EmptyState, StatusPill, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { getBookingDetail } from "@/lib/admin/queries";
import { allowedBookingTransitions } from "@/lib/booking/status-transitions";
import { formatCurrency, formatDate } from "@/lib/utils";

function JsonBlock({ value }: { value: unknown }) { return <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-4 text-xs leading-5 text-muted">{JSON.stringify(value, null, 2)}</pre>; }

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin("bookings.read");
  const data = await getBookingDetail(Number((await params).id));
  if (!data) notFound();
  const booking = data.booking;
  const canWrite = hasPermission(actor.role, "bookings.write");
  const canStatus = hasPermission(actor.role, "bookings.update_status");
  const transitions = allowedBookingTransitions(booking.status);
  return <>
    <AdminPageHeader title={booking.bookingNumber} description={`${booking.eventName} · ${formatDate(booking.eventDate)} · immutable pricing formula ${booking.pricingFormulaVersion || "legacy"}`} actions={<div className="flex gap-2"><StatusPill value={booking.status} /><StatusPill value={booking.paymentStatus} /></div>} />
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-6">
        <AdminCard className="p-5"><h2 className="font-semibold">Event & screen</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><Item label="Customer" value={data.customer?.fullName || "—"} /><Item label="Product" value={data.product?.name || `Historical product #${booking.ledProductId}`} /><Item label="Venue" value={[booking.venueName, booking.venueAddress].filter(Boolean).join(", ") || "—"} /><Item label="Event time" value={[booking.eventStartTime, booking.eventEndTime].filter(Boolean).join(" → ") || "—"} /><Item label="Installation" value={`${formatDate(booking.installationDate)} ${booking.installationTime || ""}`} /><Item label="Dismantling" value={`${formatDate(booking.dismantlingDate)} ${booking.dismantlingTime || ""}`} /><Item label="Configuration" value={`${booking.widthM}m × ${booking.heightM}m · ${booking.totalCabinets} cabinets`} /><Item label="Rental duration" value={`${booking.rentalDays} day(s)`} /></dl></AdminCard>
        <AdminCard className="p-5"><h2 className="font-semibold">Immutable booking price</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Item label="Total" value={formatCurrency(booking.total)} /><Item label="Paid" value={formatCurrency(booking.amountPaid)} /><Item label="Outstanding" value={formatCurrency(Math.max(0, Number(booking.total) - Number(booking.amountPaid)))} /></div><details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-accent">View pricing snapshot</summary><div className="mt-3"><JsonBlock value={booking.pricingSnapshot || { warning: "Legacy booking created before snapshots were introduced", storedTotal: booking.total }} /></div></details></AdminCard>
        <AdminCard className="overflow-hidden"><div className="px-5 py-4 font-semibold">Status history</div>{data.history.length ? <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={thClass}>Transition</th><th className={thClass}>Actor</th><th className={thClass}>Source / note</th><th className={thClass}>Time</th></tr></thead><tbody>{data.history.map(({ history, actorName }) => <tr key={history.id}><td className={tdClass}>{history.previousStatus || "—"} → <strong>{history.status}</strong></td><td className={tdClass}>{actorName || "System"}</td><td className={tdClass}>{history.source || "legacy"}{history.note ? <div className="mt-1 text-xs text-muted">{history.note}</div> : null}</td><td className={tdClass}>{formatDate(history.changedAtUtc || history.changedAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="No status history" />}</AdminCard>
        <AdminCard className="p-5"><h2 className="font-semibold">Internal notes</h2><div className="mt-4 space-y-3">{data.notes.map(({ note, authorName }) => <div key={note.id} className="rounded-xl bg-white/[0.03] p-3 text-sm"><p>{note.note}</p><p className="mt-2 text-xs text-muted">{authorName || "Staff"} · {formatDate(note.createdAt)}</p></div>)}</div>{canWrite && <div className="mt-4"><DynamicAdminForm command="booking.add_note" fixed={{ id: booking.id }} compact submitLabel="Add internal note" fields={[{ name: "note", label: "Note", type: "textarea", required: true }]} /></div>}</AdminCard>
      </div>
      <aside className="space-y-6">
        {canStatus && transitions.length > 0 && <DynamicAdminForm command="booking.update_status" fixed={{ id: booking.id }} title="Advance booking status" submitLabel="Update status" confirmMessage="Record this booking status transition?" fields={[{ name: "status", label: "Next status", type: "select", required: true, options: transitions.map((status) => ({ value: status, label: status.replaceAll("_", " ") })) }, { name: "note", label: "Transition note", type: "textarea" }]} />}
        <AdminCard className="p-5"><h2 className="font-semibold">Assignments</h2><div className="mt-4 space-y-3">{data.assignments.filter(({ assignment }) => !assignment.removedAt).map(({ assignment, userName, userRole }) => <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 text-sm"><div>{userName}<div className="text-xs text-muted">{userRole}</div></div>{canWrite && <AdminCommandButton payload={{ action: "booking.unassign", id: booking.id, assignmentId: assignment.id }} confirmMessage="Remove this assignment?">Remove</AdminCommandButton>}</div>)}</div>{canWrite && <div className="mt-4"><DynamicAdminForm command="booking.assign" fixed={{ id: booking.id }} compact submitLabel="Assign staff" fields={[{ name: "assignmentRole", label: "Assignment role", type: "select", required: true, options: [{ value: "operations", label: "Operations" }, { value: "technician", label: "Technician" }] }, { name: "userId", label: "Staff member", type: "select", valueType: "number", required: true, options: data.staff.map((user) => ({ value: String(user.id), label: `${user.name} (${user.role})` })) }]} /></div>}</AdminCard>
        <AdminCard className="p-5"><h2 className="font-semibold">Documents</h2><div className="mt-4 space-y-2">{data.documents.length ? data.documents.map((document) => <Link key={document.id} href={document.mediaAssetId ? `/api/media/${document.mediaAssetId}/content` : document.fileUrl} className="block rounded-lg border border-white/8 p-3 text-sm text-accent">{document.fileName}</Link>) : <p className="text-sm text-muted">No documents attached.</p>}</div></AdminCard>
        <AdminCard className="p-5"><h2 className="font-semibold">Add-ons</h2><div className="mt-4 space-y-2 text-sm">{data.addons.length ? data.addons.map(({ addon, equipmentName }) => <div key={addon.id} className="flex justify-between"><span>{equipmentName || `Equipment #${addon.equipmentId}`} × {addon.quantity}</span><span>{formatCurrency(addon.lineTotal)}</span></div>) : <p className="text-muted">No add-ons.</p>}</div></AdminCard>
      </aside>
    </div>
  </>;
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium text-white">{value}</dd></div>; }
