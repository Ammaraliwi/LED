"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { computeConfigurator } from "@/lib/pricing";

const sizePresets = [
  { label: "2m × 2m", w: 2, h: 2 },
  { label: "4m × 3m", w: 4, h: 3 },
  { label: "6m × 4m", w: 6, h: 4 },
  { label: "8m × 4m", w: 8, h: 4 },
];

export function ConfiguratorPreview() {
  const [active, setActive] = useState(1);
  const preset = sizePresets[active];
  const result = useMemo(() => computeConfigurator(preset.w, preset.h), [preset]);

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Interactive Configurator"
              title="Design your screen in seconds, not emails."
              description="Pick a size, and watch cabinet count, resolution and coverage update instantly. Every dimension on this site is calculated live from real cabinet specs — nothing is guesswork."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              {sizePresets.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setActive(i)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    i === active
                      ? "bg-accent text-white shadow-[0_0_0_1px_rgba(62,123,250,0.5)]"
                      : "border border-border text-muted hover:text-foreground hover:border-white/25"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-10">
              <Button href="/configure" size="lg">
                Build Your Full Screen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="surface-card rounded-2xl p-6 sm:p-8"
          >
            <div
              className="relative mx-auto grid gap-[2px] rounded-lg bg-black p-3"
              style={{
                gridTemplateColumns: `repeat(${result.cabinetsWide}, minmax(0, 1fr))`,
                maxWidth: 420,
                aspectRatio: `${result.widthM} / ${result.heightM}`,
              }}
            >
              {Array.from({ length: result.cabinetsWide * result.cabinetsHigh }).map((_, i) => (
                <div key={i} className="rounded-[2px] bg-gradient-to-br from-accent/70 to-accent-2/40" />
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-y-5 gap-x-4 text-sm sm:grid-cols-4">
              <Stat label="Dimensions" value={`${result.widthM}m × ${result.heightM}m`} />
              <Stat label="Area" value={`${result.areaM2} m²`} />
              <Stat label="Cabinets" value={`${result.totalCabinets}`} />
              <Stat label="Aspect Ratio" value={result.aspectRatio} />
              <Stat label="Resolution" value={result.resolutionEstimate} className="col-span-2 sm:col-span-2" />
              <Stat label="Cabinet Grid" value={`${result.cabinetsWide} × ${result.cabinetsHigh}`} className="col-span-2 sm:col-span-2" />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-muted-2">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
