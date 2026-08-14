"use client";

import { motion } from "framer-motion";

/**
 * A fully bespoke, CSS/SVG-driven "LED video wall" visual — simulates a large
 * modular display running content, complete with cabinet seams, scan glow,
 * and stage light beams. Built in-house instead of stock photography so the
 * brand doesn't lean on generic rental-site imagery.
 */
export function LedWallVisual({ className = "" }: { className?: string }) {
  const cols = 12;
  const rows = 7;
  const cells = Array.from({ length: cols * rows });

  return (
    <div className={`relative ${className}`}>
      {/* stage beams */}
      <div className="absolute -inset-x-20 -top-32 h-72 opacity-40 pointer-events-none">
        <div className="absolute left-1/4 top-0 h-72 w-32 rotate-12 bg-gradient-to-b from-accent/40 to-transparent blur-2xl" />
        <div className="absolute right-1/4 top-0 h-72 w-32 -rotate-12 bg-gradient-to-b from-accent-2/30 to-transparent blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1200 }}
        className="relative mx-auto w-full max-w-5xl"
      >
        <div className="relative rounded-2xl border border-white/10 bg-black p-2 sm:p-3 shadow-[0_60px_140px_-40px_rgba(62,123,250,0.55)]">
          {/* screen content */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-black">
            <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,#3e7bfa_0deg,#0d0f12_90deg,#cba135_180deg,#0d0f12_270deg,#3e7bfa_360deg)] opacity-70 animate-[spin_18s_linear_infinite]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />

            {/* cabinet grid overlay */}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
            >
              {cells.map((_, i) => (
                <div key={i} className="border border-black/70" />
              ))}
            </div>

            {/* scanning glow line */}
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-40%", "140%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-5 px-6 text-center">
              <span className="section-eyebrow text-white/70">Live Preview</span>
              <p className="font-display text-2xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight">
                4m × 3m · P2.6 · 48 Cabinets
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-white/60">
                <span className="rounded-full border border-white/15 px-3 py-1">Indoor</span>
                <span className="rounded-full border border-white/15 px-3 py-1">1920 × 1080 px</span>
                <span className="rounded-full border border-white/15 px-3 py-1">Aspect 4:3</span>
              </div>
            </div>
          </div>

          {/* subtle floor reflection */}
          <div className="pointer-events-none absolute inset-x-4 -bottom-16 h-16 rounded-full bg-accent/20 blur-3xl" />
        </div>
      </motion.div>
    </div>
  );
}
