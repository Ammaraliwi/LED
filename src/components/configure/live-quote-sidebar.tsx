"use client";

import { formatCurrency } from "@/lib/utils";
import type { PricingBreakdown } from "@/lib/pricing";
import type { LedProduct } from "@/lib/wizard-types";
import { Zap } from "lucide-react";

export function LiveQuoteSidebar({
  product,
  widthM,
  heightM,
  totalCabinets,
  rentalDays,
  breakdown,
  loading,
}: {
  product: LedProduct | null;
  widthM: number;
  heightM: number;
  totalCabinets: number;
  rentalDays: number;
  breakdown: PricingBreakdown | null;
  loading: boolean;
}) {
  return (
    <div className="glass sticky top-24 rounded-2xl p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <Zap className="h-3.5 w-3.5" />
        Live Quotation
      </div>

      {product && (
        <div className="mt-4 border-b border-border pb-4">
          <div className="text-sm font-medium text-foreground">{product.name}</div>
          <div className="mt-1 text-xs text-muted">
            {widthM}m × {heightM}m · {totalCabinets} cabinets · {rentalDays} day{rentalDays > 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div className={`mt-4 space-y-2.5 text-sm transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
        {breakdown ? (
          <>
            <Line label="Screen Rental" value={breakdown.rentalSubtotal} />
            {breakdown.installationFee > 0 && <Line label="Installation" value={breakdown.installationFee} />}
            {breakdown.dismantlingFee > 0 && <Line label="Dismantling" value={breakdown.dismantlingFee} />}
            {breakdown.transportFee > 0 && <Line label="Transportation" value={breakdown.transportFee} />}
            {breakdown.processorFee > 0 && <Line label="LED Processor" value={breakdown.processorFee} />}
            {breakdown.technicianFee > 0 && <Line label="Technical Support" value={breakdown.technicianFee} />}
            {breakdown.addonsLines.map((l) => (
              <Line key={l.name} label={`${l.name} × ${l.quantity}`} value={l.lineTotal} />
            ))}

            <div className="my-3 h-px bg-border" />
            <Line label="Subtotal" value={breakdown.rentalSubtotal + breakdown.installationFee + breakdown.dismantlingFee + breakdown.transportFee + breakdown.processorFee + breakdown.technicianFee + breakdown.addonsTotal} muted />
            {breakdown.discountAmount > 0 && (
              <Line label={breakdown.discountLabel ?? "Discount"} value={-breakdown.discountAmount} accent />
            )}
            <Line label={`VAT / Tax (${breakdown.vatPercent}%)`} value={breakdown.vatAmount} muted />

            <div className="my-3 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-display text-sm font-semibold text-foreground">Total</span>
              <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(breakdown.total)}</span>
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        )}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-2">
        Prices update instantly as you configure. Final pricing is confirmed at checkout.
      </p>
    </div>
  );
}

function Line({ label, value, muted, accent }: { label: string; value: number; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-2" : "text-muted"}>{label}</span>
      <span className={accent ? "text-success" : "text-foreground"}>{formatCurrency(value)}</span>
    </div>
  );
}
