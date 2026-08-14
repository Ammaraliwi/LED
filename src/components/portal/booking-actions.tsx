"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CANCELLABLE = ["draft", "quotation_requested", "pending_approval", "confirmed", "deposit_paid", "scheduled"];

export function BookingActions({ bookingId, status, productSlug }: { bookingId: number; status: string; productSlug?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this booking? This action follows our standard cancellation policy.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to cancel booking.");
        return;
      }
      toast.success("Booking cancelled.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button href={`/configure${productSlug ? `?product=${productSlug}` : ""}`} variant="outline" size="sm">
        Repeat This Booking
      </Button>
      {CANCELLABLE.includes(status) && (
        <Button onClick={handleCancel} disabled={loading} variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
          <XCircle className="h-4 w-4" />
          {loading ? "Cancelling..." : "Cancel Booking"}
        </Button>
      )}
    </div>
  );
}
