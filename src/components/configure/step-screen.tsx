"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SIZE_PRESETS, type LedProduct, type WizardState } from "@/lib/wizard-types";
import { computeConfigurator } from "@/lib/pricing";

export function StepScreen({
  products,
  state,
  update,
}: {
  products: LedProduct[];
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  const screenType = products.find((p) => p.id === state.ledProductId)?.screenType ?? "indoor";
  const filteredProducts = products.filter((p) => p.screenType === screenType);
  const selectedProduct = products.find((p) => p.id === state.ledProductId) ?? null;

  const widthM = state.sizeMode === "custom" ? parseFloat(state.customWidthM) || 0 : SIZE_PRESETS[state.presetIndex].w;
  const heightM = state.sizeMode === "custom" ? parseFloat(state.customHeightM) || 0 : SIZE_PRESETS[state.presetIndex].h;

  const result = useMemo(
    () =>
      computeConfigurator(
        widthM || 1,
        heightM || 1,
        selectedProduct?.cabinetWidthMm ?? 500,
        selectedProduct?.cabinetHeightMm ?? 500,
        selectedProduct ? Number(selectedProduct.pixelPitch) : 2.6
      ),
    [widthM, heightM, selectedProduct]
  );

  function setScreenType(type: "indoor" | "outdoor") {
    const first = products.find((p) => p.screenType === type);
    if (first) update({ ledProductId: first.id });
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Select Screen Type</h2>
        <p className="mt-1.5 text-sm text-muted">Choose the environment your event takes place in.</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {(["indoor", "outdoor"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setScreenType(t)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all",
                screenType === t ? "border-accent bg-accent/10 glow-accent" : "border-border hover:border-white/25"
              )}
            >
              <div className="font-display text-base font-semibold capitalize text-foreground">{t} LED Screen</div>
              <div className="mt-1 text-xs text-muted">
                {t === "indoor" ? "Fine pixel pitch for close viewing" : "High brightness, weatherproof"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Select Pixel Pitch</h2>
        <p className="mt-1.5 text-sm text-muted">Finer pitch means sharper detail up close.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => update({ ledProductId: p.id })}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all",
                state.ledProductId === p.id ? "border-accent bg-accent/10 glow-accent" : "border-border hover:border-white/25"
              )}
            >
              <div className="font-display text-lg font-semibold text-foreground">P{p.pixelPitch}</div>
              <div className="mt-1 text-xs text-muted line-clamp-2">{p.description}</div>
              <div className="mt-3 text-xs font-medium text-accent">QAR {Number(p.pricePerCabinetPerDay).toFixed(0)}/cabinet/day</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Select Screen Size</h2>
        <p className="mt-1.5 text-sm text-muted">Choose a common size or enter fully custom dimensions.</p>

        <div className="mt-5 flex gap-2 rounded-xl border border-border p-1 w-fit">
          {(["preset", "custom"] as const).map((m) => (
            <button
              key={m}
              onClick={() => update({ sizeMode: m })}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all",
                state.sizeMode === m ? "bg-accent text-white" : "text-muted hover:text-foreground"
              )}
            >
              {m === "preset" ? "Standard Sizes" : "Custom Size"}
            </button>
          ))}
        </div>

        {state.sizeMode === "preset" ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SIZE_PRESETS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => update({ presetIndex: i })}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  state.presetIndex === i ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted hover:border-white/25"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid max-w-sm grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-muted">Width (meters)</label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={state.customWidthM}
                onChange={(e) => update({ customWidthM: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted">Height (meters)</label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={state.customHeightM}
                onChange={(e) => update({ customHeightM: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live visual preview */}
      <div className="surface-card rounded-2xl p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div
            className="mx-auto grid w-full max-w-md gap-[2px] rounded-lg bg-black p-3"
            style={{
              gridTemplateColumns: `repeat(${result.cabinetsWide}, minmax(0, 1fr))`,
              aspectRatio: `${result.widthM} / ${result.heightM}`,
            }}
          >
            {Array.from({ length: result.cabinetsWide * result.cabinetsHigh }).map((_, i) => (
              <div key={i} className="rounded-[2px] bg-gradient-to-br from-accent/70 to-accent-2/40" />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm lg:grid-cols-1">
            <PreviewStat label="Screen Dimensions" value={`${result.widthM}m × ${result.heightM}m`} />
            <PreviewStat label="Total Area" value={`${result.areaM2} m²`} />
            <PreviewStat label="LED Cabinets Required" value={`${result.totalCabinets}`} />
            <PreviewStat label="Aspect Ratio" value={result.aspectRatio} />
            <PreviewStat label="Estimated Resolution" value={result.resolutionEstimate} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-2">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
