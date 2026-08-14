"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { customers } from "@/db/schema";

type Customer = typeof customers.$inferSelect;

export function ProfileForm({ customer, email }: { customer: Customer; email: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      companyName: form.get("companyName") || undefined,
      companyRegNumber: form.get("companyRegNumber") || undefined,
      taxNumber: form.get("taxNumber") || undefined,
      mobileNumber: form.get("mobileNumber"),
      whatsappNumber: form.get("whatsappNumber") || undefined,
      country: form.get("country"),
      city: form.get("city"),
      billingAddress: form.get("billingAddress") || undefined,
    };

    try {
      const res = await fetch("/api/customers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Update failed.");
        return;
      }
      toast.success("Profile updated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-5 rounded-2xl p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" name="fullName" defaultValue={customer.fullName} required />
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Email Address</label>
          <input
            disabled
            value={email}
            className="w-full rounded-xl border border-border bg-surface-2/30 px-4 py-3 text-sm text-muted-2"
          />
        </div>
      </div>

      <div className="rounded-xl bg-surface-2/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-2">
        {customer.type === "corporate" ? "Corporate Customer" : "Individual Customer"}
      </div>

      {customer.type === "corporate" && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Company Name" name="companyName" defaultValue={customer.companyName ?? ""} />
          <Field label="Company Registration No." name="companyRegNumber" defaultValue={customer.companyRegNumber ?? ""} />
          <Field label="Tax Number" name="taxNumber" defaultValue={customer.taxNumber ?? ""} />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mobile Number" name="mobileNumber" defaultValue={customer.mobileNumber ?? ""} required />
        <Field label="WhatsApp Number" name="whatsappNumber" defaultValue={customer.whatsappNumber ?? ""} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country" name="country" defaultValue={customer.country ?? ""} required />
        <Field label="City" name="city" defaultValue={customer.city ?? ""} required />
      </div>

      <Field label="Billing Address" name="billingAddress" defaultValue={customer.billingAddress ?? ""} />

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
        {!loading && <Save className="h-4 w-4" />}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
