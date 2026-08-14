"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedWallVisual } from "@/components/home/led-wall-visual";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-28 pt-16 sm:pt-24">
      <div className="absolute inset-0 led-grid-bg" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />

      {/* floating pixel dots */}
      <div className="absolute top-32 left-[8%] h-2 w-2 rounded-sm bg-accent pixel-dot" />
      <div className="absolute top-56 right-[12%] h-2 w-2 rounded-sm bg-accent-2 pixel-dot" style={{ animationDelay: "1s" }} />
      <div className="absolute top-96 left-[18%] h-1.5 w-1.5 rounded-sm bg-accent pixel-dot" style={{ animationDelay: "2s" }} />

      <Container className="relative">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Trusted for 100+ premium live events
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display mt-8 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            Make Your Event <span className="text-gradient glow-text">Impossible to Ignore.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-7 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered,
            installed and supported by our technical team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Button href="/configure" size="lg">
              Build Your Screen
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/screens" size="lg" variant="outline">
              <PlayCircle className="h-4 w-4" />
              Explore Our Screens
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="mt-20"
        >
          <LedWallVisual />
        </motion.div>
      </Container>
    </section>
  );
}
