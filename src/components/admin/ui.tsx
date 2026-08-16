import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1.5 max-w-3xl text-sm text-muted">{description}</p></div>{actions}</div>;
}

export function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-white/8 bg-white/[0.025] shadow-2xl shadow-black/10", className)}>{children}</section>;
}

export function MetricCard({ label, value, note, tone = "blue" }: { label: string; value: string; note?: string; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = { blue: "from-blue-500/20 text-blue-300", green: "from-emerald-500/20 text-emerald-300", amber: "from-amber-500/20 text-amber-300", red: "from-red-500/20 text-red-300" };
  return <AdminCard className={`bg-gradient-to-br ${tones[tone]} to-transparent p-5`}><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-3 font-display text-2xl font-semibold text-white">{value}</p>{note && <p className="mt-1 text-xs text-muted">{note}</p>}</AdminCard>;
}

export function EmptyState({ title = "Nothing here yet", description }: { title?: string; description?: string }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="rounded-2xl bg-white/5 p-4"><Inbox className="h-6 w-6 text-muted" /></div><h3 className="mt-4 text-sm font-semibold">{title}</h3>{description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}</div>;
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("paid") || normalized === "active" || normalized === "completed" || normalized === "published" || normalized === "ready"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : normalized.includes("cancel") || normalized.includes("overdue") || normalized.includes("inactive") || normalized === "deleted" || normalized === "quarantined"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : normalized.includes("pending") || normalized.includes("draft") || normalized.includes("unpaid")
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : "border-blue-400/20 bg-blue-400/10 text-blue-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

export function Pagination({ page, pageSize, total, pathname, query = {} }: { page: number; pageSize: number; total: number; pathname: string; query?: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => `${pathname}?${new URLSearchParams({ ...query, page: String(next), pageSize: String(pageSize) })}`;
  return <div className="flex items-center justify-between border-t border-white/8 px-5 py-4 text-sm text-muted"><span>{total.toLocaleString()} records · Page {page} of {pages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={page <= 1 ? "#" : href(page - 1)} className={cn("rounded-lg border border-white/10 p-2", page <= 1 ? "pointer-events-none opacity-30" : "hover:bg-white/5")}><ChevronLeft className="h-4 w-4" /></Link><Link aria-disabled={page >= pages} href={page >= pages ? "#" : href(page + 1)} className={cn("rounded-lg border border-white/10 p-2", page >= pages ? "pointer-events-none opacity-30" : "hover:bg-white/5")}><ChevronRight className="h-4 w-4" /></Link></div></div>;
}

export const tableClass = "w-full min-w-[760px] text-left text-sm";
export const thClass = "border-b border-white/8 bg-white/[0.02] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
export const tdClass = "border-b border-white/6 px-5 py-4 align-top";
