"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";

export interface AdminField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "datetime-local" | "textarea" | "checkbox" | "select" | "json" | "hidden";
  valueType?: "string" | "number" | "boolean" | "json" | "nullableNumber";
  defaultValue?: string | number | boolean | null | Record<string, unknown>;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  step?: string;
}

function valueFor(field: AdminField, form: FormData): unknown {
  if (field.type === "checkbox" || field.valueType === "boolean") return form.get(field.name) === "on";
  const raw = String(form.get(field.name) ?? "").trim();
  if (field.type === "datetime-local") return raw ? new Date(raw).toISOString() : null;
  if (field.valueType === "number") return Number(raw);
  if (field.valueType === "nullableNumber") return raw ? Number(raw) : null;
  if (field.valueType === "json" || field.type === "json") return raw ? JSON.parse(raw) : {};
  return raw || (field.required ? raw : null);
}

export function DynamicAdminForm({ command, fields, fixed = {}, nesting = "root", title, submitLabel = "Save changes", confirmMessage, compact = false }: {
  command: string;
  fields: AdminField[];
  fixed?: Record<string, unknown>;
  nesting?: "root" | "data";
  title?: string;
  submitLabel?: string;
  confirmMessage?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const defaults = useMemo(() => fields.map((field) => ({ ...field, rendered: field.valueType === "json" || field.type === "json" ? JSON.stringify(field.defaultValue ?? {}, null, 2) : field.defaultValue == null ? "" : String(field.defaultValue) })), [fields]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true); setResultMessage(null);
    try {
      const form = new FormData(event.currentTarget);
      const values = Object.fromEntries(fields.map((field) => [field.name, valueFor(field, form)]));
      const payload = nesting === "data" ? { action: command, ...fixed, data: values } : { action: command, ...fixed, ...values };
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Action failed");
      const inviteLink = body.result?.invitationLink;
      if (inviteLink) setResultMessage(inviteLink);
      toast.success("Saved successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally { setPending(false); }
  }

  const formElement = <form onSubmit={submit} className={`${title ? "border-t border-white/8" : ""} grid gap-4 p-5 sm:grid-cols-2`}>
      {defaults.map((field) => <Field key={field.name} field={field} rendered={field.rendered} />)}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel.toLowerCase().includes("invite") ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}{submitLabel}</button>
      </div>
      {resultMessage && <div className="sm:col-span-2 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs text-amber-200"><strong>Copy this one-time link:</strong><br /><span className="break-all">{resultMessage}</span></div>}
    </form>;
  if (!title) return formElement;
  return <details className={compact ? "" : "rounded-2xl border border-white/8 bg-white/[0.025]"}>
    <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold hover:bg-white/[0.02]">{title}</summary>
    {formElement}
  </details>;
}

function Field({ field, rendered }: { field: AdminField; rendered: string }) {
  if (field.type === "hidden") return <input type="hidden" name={field.name} defaultValue={rendered} />;
  const className = "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent";
  return <label className={field.type === "textarea" || field.type === "json" ? "sm:col-span-2" : ""}>
    <span className="mb-1.5 block text-xs font-medium text-muted">{field.label}</span>
    {field.type === "checkbox" ? <input name={field.name} type="checkbox" defaultChecked={field.defaultValue === true} className="h-4 w-4 accent-blue-500" />
      : field.type === "textarea" || field.type === "json" ? <textarea name={field.name} required={field.required} defaultValue={rendered} rows={field.type === "json" ? 8 : 4} placeholder={field.placeholder} className={`${className} font-${field.type === "json" ? "mono" : "sans"}`} />
      : field.type === "select" ? <select name={field.name} required={field.required} defaultValue={rendered} className={className}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={rendered} placeholder={field.placeholder} step={field.step} className={className} />}
  </label>;
}

export function AdminCommandButton({ payload, children, confirmMessage, tone = "default" }: { payload: Record<string, unknown>; children: React.ReactNode; confirmMessage?: string; tone?: "default" | "danger" }) {
  const router = useRouter(); const [pending, setPending] = useState(false);
  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Action failed"); toast.success("Action completed"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed"); } finally { setPending(false); }
  }
  return <button type="button" disabled={pending} onClick={run} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${tone === "danger" ? "border-red-400/20 text-red-300 hover:bg-red-400/10" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>{pending ? "Working…" : children}</button>;
}
