"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/screens", label: "LED Screens" },
  { href: "/solutions", label: "Solutions" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "glass-strong" : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl container-px flex h-18 items-center justify-between py-4">
        <Link href="/" aria-label="LEDWAVE Home">
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-muted hover:text-foreground transition-colors",
                pathname === link.href && "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {status === "authenticated" ? (
            <div className="group relative">
              <button className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors">
                {session.user?.name?.split(" ")[0] ?? "Account"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all absolute right-0 top-full pt-3 w-52">
                <div className="glass-strong rounded-xl p-2 shadow-2xl">
                  <Link href="/portal" className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-white/5">
                    Dashboard
                  </Link>
                  <Link href="/portal/bookings" className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-white/5">
                    My Bookings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-white/5"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground transition-colors">
              Login
            </Link>
          )}
          <Button href="/configure" size="sm">
            Book Now
          </Button>
        </div>

        <button
          className="lg:hidden text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden glass-strong border-t border-white/5">
          <nav className="flex flex-col p-4 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/10 my-2" />
            {status === "authenticated" ? (
              <>
                <Link href="/portal" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-white/5">
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-left rounded-lg px-3 py-3 text-sm font-medium text-danger hover:bg-white/5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-white/5">
                Login
              </Link>
            )}
            <Button href="/configure" onClick={() => setOpen(false)} className="mt-2 justify-center">
              Book Now
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
