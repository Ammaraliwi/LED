"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, motion, useMotionValue, useSpring } from "framer-motion";

export function StatCounter({ value, suffix, label }: { value: string; suffix?: string | null; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  const isNumeric = !Number.isNaN(numeric) && /^[0-9.]+$/.test(value);

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 24, stiffness: 90 });
  const [display, setDisplay] = useState(isNumeric ? "0" : value);

  useEffect(() => {
    if (isInView && isNumeric) {
      motionValue.set(numeric);
    }
  }, [isInView, isNumeric, motionValue, numeric]);

  useEffect(() => {
    if (!isNumeric) return;
    const unsub = spring.on("change", (v) => {
      setDisplay(Math.floor(v).toString());
    });
    return unsub;
  }, [spring, isNumeric]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center text-center gap-2"
    >
      <div className="font-display text-4xl sm:text-5xl font-bold text-gradient glow-text">
        {display}
        {suffix}
      </div>
      <div className="text-sm text-muted uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}
