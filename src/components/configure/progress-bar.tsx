import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Screen", "Dates", "Services", "Event Details", "Account", "Review"];

export function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-accent text-white",
                  active && "bg-accent/15 text-accent ring-1 ring-accent",
                  !done && !active && "bg-surface-2 text-muted-2"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : num}
              </div>
              <span className={cn("hidden text-xs font-medium sm:block", active ? "text-foreground" : "text-muted-2")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px w-4 sm:w-8", done ? "bg-accent" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}
