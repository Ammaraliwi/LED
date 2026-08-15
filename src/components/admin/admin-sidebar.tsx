"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity, Boxes, CalendarDays, CircleDollarSign, ContactRound, FileText, Gauge, Image,
  LogOut, MessageSquareText, Receipt, Settings, Shield, SlidersHorizontal, Users, X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { Permission, StaffRole } from "@/lib/admin/permissions";

const links: { href: string; label: string; icon: React.ElementType; permission: Permission; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: Gauge, permission: "dashboard.read", exact: true },
  { href: "/admin/products", label: "LED Products", icon: Boxes, permission: "products.read" },
  { href: "/admin/pricing", label: "Pricing & Services", icon: SlidersHorizontal, permission: "pricing.read" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, permission: "bookings.read" },
  { href: "/admin/customers", label: "Customers", icon: ContactRound, permission: "customers.read" },
  { href: "/admin/payments", label: "Payments", icon: CircleDollarSign, permission: "payments.read" },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt, permission: "invoices.read" },
  { href: "/admin/content", label: "Website Content", icon: FileText, permission: "content.read" },
  { href: "/admin/media", label: "Media", icon: Image, permission: "media.read" },
  { href: "/admin/users", label: "Staff Users", icon: Users, permission: "users.read" },
  { href: "/admin/settings", label: "Settings & Contact", icon: Settings, permission: "settings.read" },
  { href: "/admin/audit-log", label: "Audit Log", icon: Activity, permission: "audit.read" },
];

export function AdminSidebar({ role, permissions, onNavigate }: { role: StaffRole; permissions: Permission[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
        <Link href="/admin"><Logo /></Link>
        {onNavigate && <button aria-label="Close menu" onClick={onNavigate} className="text-muted"><X className="h-5 w-5" /></button>}
      </div>
      <div className="px-6 pt-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent"><Shield className="h-3.5 w-3.5" /> Admin Portal</div>
        <p className="mt-1 text-xs text-muted">{role.replaceAll("_", " ")}</p>
      </div>
      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-5">
        {links.filter((link) => allowed.has(link.permission)).map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} onClick={onNavigate} className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
            active ? "bg-accent text-white shadow-lg shadow-accent/15" : "text-muted hover:bg-white/5 hover:text-white",
          )}><link.icon className="h-4 w-4" />{link.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/8 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-white"><MessageSquareText className="h-4 w-4" /> View website</Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}
