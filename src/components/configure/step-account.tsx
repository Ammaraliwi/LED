"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, LogIn } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StepAccount({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(false);

  if (status === "authenticated" && session?.user) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">Your account</h2>
          <p className="mt-1.5 text-sm text-muted">You&apos;re signed in — continue to review your booking.</p>
        </div>
        <div className="surface-card flex items-center gap-4 rounded-2xl p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="font-medium text-foreground">{session.user.name}</div>
            <div className="text-sm text-muted">{session.user.email}</div>
          </div>
        </div>
      </div>
    );
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password.");
    } else {
      toast.success("Welcome back!");
      onAuthenticated();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Register or sign in</h2>
        <p className="mt-1.5 text-sm text-muted">One quick step before we confirm your booking.</p>
      </div>

      <div className="flex gap-2 rounded-xl border border-border p-1 w-fit">
        {(["register", "login"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-medium capitalize transition-all",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            )}
          >
            {t === "register" ? "New Customer" : "Existing Customer"}
          </button>
        ))}
      </div>

      {tab === "register" ? (
        <RegisterForm onSuccess={onAuthenticated} />
      ) : (
        <form onSubmit={handleLogin} className="surface-card max-w-md space-y-5 rounded-2xl p-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email Address</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <LogIn className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}
