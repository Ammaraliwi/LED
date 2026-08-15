import { PricingEditor } from "@/components/admin/pricing-editor";
import { AdminCard, AdminPageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { listPricing } from "@/lib/admin/queries";

export default async function PricingPage() {
  const actor = await requireAdmin("pricing.read");
  const data = await listPricing();
  return <>
    <AdminPageHeader title="Pricing & services" description="Database-managed rates for future quotes and bookings. Calculation formulas, rounding, validation limits and pricing snapshots remain controlled in reviewed code." />
    <PricingEditor settings={data.settings} products={data.products} canWrite={hasPermission(actor.role, "pricing.write")} />
    <AdminCard className="mt-6 p-5"><h2 className="font-display text-lg font-semibold">Pricing audit history</h2><div className="mt-4 space-y-3">{data.history.length ? data.history.map(({ log, actorName, actorEmail }) => <details key={log.id} className="rounded-xl border border-white/8 p-4"><summary className="cursor-pointer text-sm"><strong>{actorName || actorEmail || "System"}</strong> updated pricing · {new Intl.DateTimeFormat("en-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" }).format(log.occurredAt)}</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-muted">{JSON.stringify({ before: log.beforeValue, after: log.afterValue }, null, 2)}</pre></details>) : <p className="text-sm text-muted">No Admin pricing changes have been recorded yet. Seed values are intentionally not treated as business edits.</p>}</div></AdminCard>
  </>;
}
