"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/portal";
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-4.5rem)] items-center py-20">
      <Container className="max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
          <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage your bookings and quotations.</p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card mt-10 space-y-5 rounded-2xl p-8">
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

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </Container>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
