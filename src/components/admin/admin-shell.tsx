"use client";

import { useState } from "react";
import { Menu, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { Permission, StaffRole } from "@/lib/admin/permissions";

export function AdminShell({ children, actor, permissions }: {
  children: React.ReactNode;
  actor: { name: string; role: StaffRole; mfaEnabled: boolean; mfaVerified: boolean };
  permissions: Permission[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#07090d] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/8 bg-[#0b0e14] lg:block">
        <AdminSidebar role={actor.role} permissions={permissions} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#0b0e14]">
            <AdminSidebar role={actor.role} permissions={permissions} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#07090d]/90 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" className="rounded-lg p-2 text-muted hover:bg-white/5 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <div>
              <p className="text-sm font-semibold">{actor.name}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{actor.role.replaceAll("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> {actor.mfaEnabled && actor.mfaVerified ? "MFA verified" : "Secure staff session"}
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
