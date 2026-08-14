"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RegisterForm({ onSuccess, compact = false }: { onSuccess?: () => void; compact?: boolean }) {
  const [type, setType] = useState<"individual" | "corporate">("individual");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      type,
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
      mobileNumber: form.get("mobileNumber"),
      whatsappNumber: form.get("whatsappNumber"),
      country: form.get("country"),
      city: form.get("city"),
      billingAddress: form.get("billingAddress"),
      companyName: form.get("companyName") || undefined,
      companyRegNumber: form.get("companyRegNumber") || undefined,
      taxNumber: form.get("taxNumber") || undefined,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Registration failed.");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.error("Account created — please sign in.");
      } else {
        toast.success("Account created!");
        onSuccess?.();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", !compact && "surface-card rounded-2xl p-8")}>
      <div className="flex gap-2 rounded-xl border border-border p-1">
        {(["individual", "corporate"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-all",
              type === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            )}
          >
            {t} Customer
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" name="fullName" required />
        <Field label="Email Address" name="email" type="email" required />
      </div>

      {type === "corporate" && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Company Name" name="companyName" required />
          <Field label="Company Registration No." name="companyRegNumber" />
          <Field label="Tax Number" name="taxNumber" />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mobile Number" name="mobileNumber" required />
        <Field label="WhatsApp Number" name="whatsappNumber" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country" name="country" required defaultValue="Qatar" />
        <Field label="City" name="city" required defaultValue="Doha" />
      </div>

      <Field label="Billing Address" name="billingAddress" />

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="mt-1.5 text-xs text-muted-2">Minimum 8 characters.</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full justify-center">
        {loading ? "Creating account..." : "Create Account"}
        {!loading && <UserPlus className="h-4 w-4" />}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
