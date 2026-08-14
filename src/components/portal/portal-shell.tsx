"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { PortalSidebar } from "@/components/portal/sidebar";

export function PortalShell({ name, children }: { name: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/40 lg:block">
        <div className="sticky top-0 h-screen">
          <PortalSidebar />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-background border-r border-border">
            <PortalSidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm text-muted">
              Welcome back, <span className="font-medium text-foreground">{name.split(" ")[0]}</span>
            </span>
          </div>
        </header>
        <main className="px-6 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
