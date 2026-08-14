"use client";

import { Minus, Plus } from "lucide-react";
import type { Equipment, WizardState } from "@/lib/wizard-types";
import { cn, formatCurrency } from "@/lib/utils";

const coreServices: { key: keyof Pick<WizardState, "includeInstallation" | "includeDismantling" | "includeTransport" | "includeProcessor" | "includeTechnician">; label: string; description: string }[] = [
  { key: "includeInstallation", label: "Professional Installation", description: "Certified crew handles full rig and setup." },
  { key: "includeDismantling", label: "Dismantling", description: "Post-event strike and equipment collection." },
  { key: "includeTransport", label: "Transportation", description: "Delivery to and from your venue." },
  { key: "includeProcessor", label: "LED Processor", description: "Signal processing hardware for your content." },
  { key: "includeTechnician", label: "Technical Operator", description: "On-site technician throughout your event." },
];

export function StepServices({
  equipment,
  state,
  update,
}: {
  equipment: Equipment[];
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  function toggleService(key: (typeof coreServices)[number]["key"]) {
    update({ [key]: !state[key] } as Partial<WizardState>);
  }

  function setAddonQty(equipmentId: number, quantity: number) {
    const existing = state.addons.find((a) => a.equipmentId === equipmentId);
    if (quantity <= 0) {
      update({ addons: state.addons.filter((a) => a.equipmentId !== equipmentId) });
      return;
    }
    if (existing) {
      update({ addons: state.addons.map((a) => (a.equipmentId === equipmentId ? { ...a, quantity } : a)) });
    } else {
      update({ addons: [...state.addons, { equipmentId, quantity }] });
    }
  }

  const grouped = equipment.reduce<Record<string, Equipment[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Core Services</h2>
        <p className="mt-1.5 text-sm text-muted">Included by default — toggle off anything you&apos;re arranging yourself.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {coreServices.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleService(s.key)}
              className={cn(
                "flex items-start justify-between gap-4 rounded-2xl border p-5 text-left transition-all",
                state[s.key] ? "border-accent bg-accent/10" : "border-border hover:border-white/25"
              )}
            >
              <div>
                <div className="text-sm font-medium text-foreground">{s.label}</div>
                <div className="mt-1 text-xs text-muted">{s.description}</div>
              </div>
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
                  state[s.key] ? "bg-accent justify-end" : "bg-surface-2 justify-start"
                )}
              >
                <div className="h-5 w-5 rounded-full bg-white" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Additional Equipment</h2>
        <p className="mt-1.5 text-sm text-muted">Add extra gear — priced per day, updates your quote instantly.</p>

        <div className="mt-5 space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-2">{category}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const selected = state.addons.find((a) => a.equipmentId === item.id);
                  const qty = selected?.quantity ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-4 transition-all",
                        qty > 0 ? "border-accent bg-accent/10" : "border-border"
                      )}
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-2">{formatCurrency(item.pricePerDay)}/day</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setAddonQty(item.id, qty - 1)}
                          disabled={qty === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted hover:text-foreground disabled:opacity-30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-medium text-foreground">{qty}</span>
                        <button
                          onClick={() => setAddonQty(item.id, qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
