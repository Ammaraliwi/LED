"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      message: form.get("message"),
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast.success("Message sent — our team will respond within one business day.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="surface-card rounded-2xl p-10 text-center">
        <h3 className="font-display text-xl font-semibold text-foreground">Thank you!</h3>
        <p className="mt-2 text-sm text-muted">We&apos;ve received your message and will be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-5 rounded-2xl p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" name="name" required />
        <Field label="Email Address" name="email" type="email" required />
      </div>
      <Field label="Phone Number" name="phone" />
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Message</label>
        <textarea
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Tell us about your event..."
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full justify-center sm:w-auto">
        {loading ? "Sending..." : "Send Message"}
        {!loading && <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
