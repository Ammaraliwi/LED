import { DynamicAdminForm } from "@/components/admin/dynamic-form";
import { MfaEnrollment } from "@/components/admin/mfa-enrollment";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { hasPermission, roleRequiresMfa } from "@/lib/admin/permissions";
import { getSettingsAdminData } from "@/lib/admin/queries";
import { SITE_SETTING_DEFINITIONS } from "@/lib/cms/schemas";
import { formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const actor = await requireAdmin(undefined, { allowMfaSetup: true }); const required = roleRequiresMfa(actor.role);
  const mfaBlocked = required && (!actor.mfaEnabled || !actor.mfaVerified);
  const canReadSettings = hasPermission(actor.role, "settings.read") && !mfaBlocked;
  const data = canReadSettings ? await getSettingsAdminData() : null;
  const canWrite = hasPermission(actor.role, "settings.write") && !mfaBlocked;
  const current = new Map(data?.settings.map((setting) => [setting.key, setting]) ?? []);
  return <><AdminPageHeader title="Settings & security" description="Global website contact data, contact enquiries and staff MFA configuration." />
    <div className="space-y-6"><MfaEnrollment enabled={actor.mfaEnabled} verified={actor.mfaVerified} required={required} />
      {mfaBlocked && <AdminCard className="border-amber-400/20 p-5 text-sm text-amber-100">Complete MFA enrollment and sign in again to unlock protected Admin operations.</AdminCard>}
      {data && <><AdminCard className="p-5"><h2 className="font-display text-lg font-semibold">Global website settings</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{Object.entries(SITE_SETTING_DEFINITIONS).map(([key, definition]) => { const value = current.get(key)?.value; return <div key={key} className="rounded-xl border border-white/8 p-4"><div className="mb-2 text-xs text-muted">{definition.category} · {key}</div>{canWrite ? <DynamicAdminForm command="setting.update" fixed={{ key }} compact submitLabel="Save setting" fields={[{ name: "value", label: definition.label, required: true, defaultValue: typeof value === "string" ? value : value == null ? key === "business.timezone" ? "Asia/Qatar" : "" : JSON.stringify(value) }]} /> : <p className="text-sm">{String(value ?? "Not configured")}</p>}</div>; })}</div></AdminCard>
        <AdminCard className="p-5"><h2 className="font-display text-lg font-semibold">Contact submissions</h2><p className="mt-1 text-sm text-muted">Customer PII is stored here rather than written to application logs.</p><div className="mt-5 space-y-4">{data.contacts.map((contact) => <details key={contact.id} className="rounded-xl border border-white/8"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4"><div><strong className="text-sm">{contact.name}</strong><p className="mt-1 text-xs text-muted">{contact.email} · {formatDate(contact.createdAt)}</p></div><StatusPill value={contact.status} /></summary><div className="border-t border-white/8 p-4"><p className="whitespace-pre-wrap text-sm text-muted">{contact.message}</p><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div>Phone: {contact.phone || "—"}</div><div>Submitted: {formatDate(contact.createdAt)}</div></dl>{canWrite && <div className="mt-4"><DynamicAdminForm command="contact.update" fixed={{ id: contact.id }} compact submitLabel="Update enquiry" fields={[{ name: "status", label: "Status", type: "select", required: true, defaultValue: contact.status, options: [{ value: "unread", label: "Unread" }, { value: "read", label: "Read" }, { value: "resolved", label: "Resolved" }] }, { name: "internalNote", label: "Internal note", type: "textarea", defaultValue: contact.internalNote }]} /></div>}</div></details>)}</div></AdminCard></>}
    </div>
  </>;
}
