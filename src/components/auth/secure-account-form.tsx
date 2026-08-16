"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SecureAccountForm({ mode }: { mode: "invite" | "forgot" | "reset" }) {
  const router = useRouter(); const search = useSearchParams(); const [pending, setPending] = useState(false); const [complete, setComplete] = useState(false);
  const token = search.get("token") || "";
  const title = mode === "invite" ? "Accept staff invitation" : mode === "forgot" ? "Reset your password" : "Choose a new password";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const form = new FormData(event.currentTarget);
    const endpoint = mode === "invite" ? "/api/auth/invites/accept" : mode === "forgot" ? "/api/auth/password-reset/request" : "/api/auth/password-reset/confirm";
    const body = mode === "invite" ? { token, name: form.get("name"), password: form.get("password") } : mode === "forgot" ? { email: form.get("email") } : { token, password: form.get("password") };
    try { const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Request failed"); setComplete(true); toast.success(mode === "forgot" ? "If that account exists, a reset link has been sent." : "Account security updated"); if (mode !== "forgot") setTimeout(() => router.push("/login"), 1200); } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); } finally { setPending(false); }
  }
  if ((mode === "invite" || mode === "reset") && !token) return <Panel title={title}><p className="text-sm text-red-300">This link is missing its one-time token. Request a new link.</p></Panel>;
  return <Panel title={title}><p className="mb-6 text-sm text-muted">{mode === "invite" ? "Create your staff account. Super admin and finance roles must enroll MFA after first sign-in." : mode === "forgot" ? "Enter your account email. The response is intentionally identical whether an account exists or not." : "The new password revokes all existing sessions."}</p>{complete ? <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4 text-sm text-emerald-200">{mode === "forgot" ? "Check your email if the account is registered." : "Complete. Redirecting to sign in…"}</div> : <form onSubmit={submit} className="space-y-4">{mode === "invite" && <Field name="name" label="Full name" autoComplete="name" />}{mode === "forgot" ? <Field name="email" label="Email address" type="email" autoComplete="email" /> : <Field name="password" label="Secure password" type="password" autoComplete="new-password" hint="12–72 characters with uppercase, lowercase and a number." />}<Button type="submit" disabled={pending} className="w-full justify-center">{pending ? "Working…" : mode === "invite" ? "Create staff account" : mode === "forgot" ? "Send reset link" : "Set new password"}</Button></form>}<p className="mt-6 text-center text-sm text-muted"><Link href="/login" className="text-accent hover:underline">Back to sign in</Link></p></Panel>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="flex min-h-[calc(100vh-4.5rem)] items-center py-20"><div className="mx-auto w-full max-w-md px-5"><h1 className="font-display text-center text-3xl font-semibold">{title}</h1><div className="surface-card mt-8 rounded-2xl p-8">{children}</div></div></section>; }
function Field({ name, label, type = "text", autoComplete, hint }: { name: string; label: string; type?: string; autoComplete?: string; hint?: string }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input name={name} type={type} required minLength={type === "password" ? 12 : undefined} maxLength={type === "password" ? 72 : 255} autoComplete={autoComplete} className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm outline-none focus:border-accent" />{hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}</label>; }
