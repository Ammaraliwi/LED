"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Receipt,
  CreditCard,
  FolderOpen,
  UserCircle,
  LifeBuoy,
  LogOut,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/portal/quotations", label: "My Quotations", icon: FileText },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/documents", label: "Documents", icon: FolderOpen },
  { href: "/portal/profile", label: "Profile", icon: UserCircle },
  { href: "/portal/support", label: "Support", icon: LifeBuoy },
];

export function PortalSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        {onNavigate && (
          <button onClick={onNavigate} className="lg:hidden text-muted">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:bg-white/5 hover:text-danger transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
