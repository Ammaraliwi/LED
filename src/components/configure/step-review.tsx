"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { WizardState, LedProduct, Equipment } from "@/lib/wizard-types";
import type { PricingBreakdown } from "@/lib/pricing";
import { EVENT_TYPES } from "@/lib/wizard-types";

export function StepReview({
  state,
  product,
  equipment,
  breakdown,
  rentalDays,
  totalCabinets,
  widthM,
  heightM,
  onSubmit,
}: {
  state: WizardState;
  product: LedProduct | null;
  equipment: Equipment[];
  breakdown: PricingBreakdown | null;
  rentalDays: number;
  totalCabinets: number;
  widthM: number;
  heightM: number;
  onSubmit: (action: "confirmed" | "quotation_requested" | "draft") => Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handle(action: "confirmed" | "quotation_requested" | "draft") {
    if (action !== "draft" && !agreed) return;
    setSubmitting(action);
    try {
      await onSubmit(action);
    } finally {
      setSubmitting(null);
    }
  }

  const eventTypeLabel = EVENT_TYPES.find((t) => t.value === state.eventType)?.label ?? state.eventType;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Review & Confirm</h2>
        <p className="mt-1.5 text-sm text-muted">Check the details below before confirming your booking.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Screen Configuration</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Screen" value={product?.name ?? "—"} />
            <Row label="Dimensions" value={`${widthM}m × ${heightM}m`} />
            <Row label="Cabinets" value={String(totalCabinets)} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Rental Dates</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Event Date" value={formatDate(state.eventDate)} />
            <Row label="Installation" value={`${formatDate(state.installationDate)} · ${state.installationTime}`} />
            <Row label="Dismantling" value={`${formatDate(state.dismantlingDate)} · ${state.dismantlingTime}`} />
            <Row label="Duration" value={`${rentalDays} day${rentalDays > 1 ? "s" : ""}`} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Event Information</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Event Name" value={state.eventName || "—"} />
            <Row label="Event Type" value={eventTypeLabel} />
            <Row label="Venue" value={state.venueName || "—"} />
            <Row label="Setting" value={state.indoorOutdoor} />
          </dl>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Services & Add-ons</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Installation" value={state.includeInstallation ? "Included" : "Not included"} />
            <Row label="Dismantling" value={state.includeDismantling ? "Included" : "Not included"} />
            <Row label="Transport" value={state.includeTransport ? "Included" : "Not included"} />
            <Row
              label="Add-ons"
              value={
                state.addons.length === 0
                  ? "None"
                  : state.addons
                      .map((a) => equipment.find((e) => e.id === a.equipmentId)?.name)
                      .filter(Boolean)
                      .join(", ")
              }
            />
          </dl>
        </div>
      </div>

      {breakdown && (
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Price Breakdown</h3>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Rental Subtotal" value={formatCurrency(breakdown.rentalSubtotal)} />
            <Row label="Installation" value={formatCurrency(breakdown.installationFee)} />
            <Row label="Dismantling" value={formatCurrency(breakdown.dismantlingFee)} />
            <Row label="Transportation" value={formatCurrency(breakdown.transportFee)} />
            <Row label="LED Processor" value={formatCurrency(breakdown.processorFee)} />
            <Row label="Technical Support" value={formatCurrency(breakdown.technicianFee)} />
            <Row label="Add-ons" value={formatCurrency(breakdown.addonsTotal)} />
            {breakdown.discountAmount > 0 && <Row label={breakdown.discountLabel ?? "Discount"} value={`- ${formatCurrency(breakdown.discountAmount)}`} />}
            <Row label={`VAT (${breakdown.vatPercent}%)`} value={formatCurrency(breakdown.vatAmount)} />
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-display text-lg font-semibold text-foreground">Total</span>
            <span className="font-display text-3xl font-bold text-gradient">{formatCurrency(breakdown.total)}</span>
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
        />
        I agree to the LEDWAVE Terms & Conditions and cancellation policy.
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => handle("confirmed")}
          disabled={!agreed || submitting !== null}
          size="lg"
        >
          {submitting === "confirmed" ? "Confirming..." : "Confirm Booking"}
          {submitting !== "confirmed" && <CheckCircle2 className="h-4 w-4" />}
        </Button>
        <Button
          onClick={() => handle("quotation_requested")}
          disabled={!agreed || submitting !== null}
          variant="outline"
          size="lg"
        >
          {submitting === "quotation_requested" ? "Requesting..." : "Request Official Quotation"}
          {submitting !== "quotation_requested" && <FileText className="h-4 w-4" />}
        </Button>
        <Button onClick={() => handle("draft")} disabled={submitting !== null} variant="ghost" size="lg">
          {submitting === "draft" ? "Saving..." : "Save for Later"}
          {submitting !== "draft" && <Save className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-2 capitalize">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
