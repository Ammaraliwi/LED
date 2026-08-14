import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  quotation_requested: "Quotation Requested",
  pending_approval: "Pending Approval",
  confirmed: "Confirmed",
  deposit_paid: "Deposit Paid",
  scheduled: "Scheduled",
  equipment_prepared: "Equipment Prepared",
  out_for_delivery: "Out for Delivery",
  installed: "Installed",
  event_running: "Event Running",
  dismantling: "Dismantling",
  completed: "Completed",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-surface-2 text-muted",
  quotation_requested: "bg-accent-2/15 text-accent-2 ring-accent-2/30",
  pending_approval: "bg-warning/15 text-warning ring-warning/30",
  confirmed: "bg-accent/15 text-accent ring-accent/30",
  deposit_paid: "bg-accent/15 text-accent ring-accent/30",
  scheduled: "bg-accent/15 text-accent ring-accent/30",
  equipment_prepared: "bg-accent/15 text-accent ring-accent/30",
  out_for_delivery: "bg-accent/15 text-accent ring-accent/30",
  installed: "bg-success/15 text-success ring-success/30",
  event_running: "bg-success/15 text-success ring-success/30",
  dismantling: "bg-warning/15 text-warning ring-warning/30",
  completed: "bg-success/15 text-success ring-success/30",
  cancelled: "bg-danger/15 text-danger ring-danger/30",
  unpaid: "bg-danger/15 text-danger ring-danger/30",
  partially_paid: "bg-warning/15 text-warning ring-warning/30",
  paid: "bg-success/15 text-success ring-success/30",
  overdue: "bg-danger/15 text-danger ring-danger/30",
  refunded: "bg-surface-2 text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        STATUS_COLORS[status] ?? "bg-surface-2 text-muted"
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
