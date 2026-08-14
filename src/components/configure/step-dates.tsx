"use client";

import { CheckCircle2, XCircle, Loader2, CalendarDays } from "lucide-react";
import type { WizardState } from "@/lib/wizard-types";
import { cn } from "@/lib/utils";

export interface AvailabilityState {
  checking: boolean;
  checked: boolean;
  available: boolean | null;
  availableCabinets: number | null;
}

export function StepDates({
  state,
  update,
  rentalDays,
  availability,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  rentalDays: number;
  availability: AvailabilityState;
}) {
  function onEventDateChange(value: string) {
    const patch: Partial<WizardState> = { eventDate: value };
    if (!state.installationDate) patch.installationDate = value;
    if (!state.dismantlingDate) patch.dismantlingDate = value;
    update(patch);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">When do you need it?</h2>
        <p className="mt-1.5 text-sm text-muted">We&apos;ll check real-time availability for your dates automatically.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Event Date" value={state.eventDate} onChange={onEventDateChange} required />
        <div className="grid grid-cols-2 gap-4">
          <TimeField label="Event Start" value={state.eventStartTime} onChange={(v) => update({ eventStartTime: v })} />
          <TimeField label="Event End" value={state.eventEndTime} onChange={(v) => update({ eventEndTime: v })} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Installation Date" value={state.installationDate} onChange={(v) => update({ installationDate: v })} required />
        <TimeField label="Installation Time" value={state.installationTime} onChange={(v) => update({ installationTime: v })} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Dismantling Date" value={state.dismantlingDate} onChange={(v) => update({ dismantlingDate: v })} required />
        <TimeField label="Dismantling Time" value={state.dismantlingTime} onChange={(v) => update({ dismantlingTime: v })} />
      </div>

      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-accent" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-2">Rental Duration</div>
            <div className="font-display text-lg font-semibold text-foreground">
              {rentalDays} day{rentalDays > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <AvailabilityBadge availability={availability} />
      </div>
    </div>
  );
}

function AvailabilityBadge({ availability }: { availability: AvailabilityState }) {
  if (!availability.checked && !availability.checking) {
    return <span className="text-xs text-muted-2">Select your dates to check availability</span>;
  }
  if (availability.checking) {
    return (
      <span className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability...
      </span>
    );
  }
  if (availability.available) {
    return (
      <span className="flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-xs font-medium text-success ring-1 ring-success/30">
        <CheckCircle2 className="h-3.5 w-3.5" /> Available for these dates
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 rounded-full bg-danger/15 px-4 py-2 text-xs font-medium text-danger ring-1 ring-danger/30">
      <XCircle className="h-3.5 w-3.5" />
      Unavailable — only {availability.availableCabinets ?? 0} cabinets free
    </span>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <input
        type="date"
        required={required}
        value={value}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
          "[color-scheme:dark]"
        )}
      />
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
      />
    </div>
  );
}
