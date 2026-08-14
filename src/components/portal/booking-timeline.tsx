import { Check } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const FULL_TIMELINE = [
  "confirmed",
  "deposit_paid",
  "scheduled",
  "equipment_prepared",
  "out_for_delivery",
  "installed",
  "event_running",
  "dismantling",
  "completed",
];

export function BookingTimeline({ currentStatus, history }: { currentStatus: string; history: { status: string; changedAt: Date | string }[] }) {
  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">
        This booking was cancelled{history[history.length - 1] ? ` on ${formatDate(history[history.length - 1].changedAt)}` : ""}.
      </div>
    );
  }

  if (currentStatus === "draft" || currentStatus === "quotation_requested" || currentStatus === "pending_approval") {
    return (
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
        {currentStatus === "draft"
          ? "This booking is saved as a draft — complete checkout to confirm it."
          : "Your quotation is being reviewed. We'll notify you once it's approved."}
      </div>
    );
  }

  const currentIndex = FULL_TIMELINE.indexOf(currentStatus);

  return (
    <div className="flex flex-wrap gap-3">
      {FULL_TIMELINE.map((step, i) => {
        const done = i <= currentIndex;
        const entry = history.find((h) => h.status === step);
        return (
          <div
            key={step}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset",
              done ? "bg-accent/15 text-accent ring-accent/30" : "bg-surface-2 text-muted-2 ring-transparent"
            )}
            title={entry ? formatDate(entry.changedAt) : undefined}
          >
            {done && <Check className="h-3 w-3" />}
            {step.replace(/_/g, " ")}
          </div>
        );
      })}
    </div>
  );
}
