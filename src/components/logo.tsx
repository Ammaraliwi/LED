import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display font-semibold tracking-tight text-lg", className)}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 ring-1 ring-accent/40">
        <span className="grid grid-cols-2 gap-[3px]">
          <span className="h-[5px] w-[5px] rounded-[1px] bg-accent" />
          <span className="h-[5px] w-[5px] rounded-[1px] bg-accent/40" />
          <span className="h-[5px] w-[5px] rounded-[1px] bg-accent/40" />
          <span className="h-[5px] w-[5px] rounded-[1px] bg-accent" />
        </span>
      </span>
      <span>
        LED<span className="text-accent">WAVE</span>
      </span>
    </span>
  );
}
