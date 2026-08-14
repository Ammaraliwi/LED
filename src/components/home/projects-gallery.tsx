"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import type { projects } from "@/db/schema";

type Project = typeof projects.$inferSelect;

const categories = ["All", "Corporate Events", "Conferences", "Exhibitions", "Weddings", "Stages", "Outdoor Events"];

export function ProjectsGallery({ projects, hideHeading = false }: { projects: Project[]; hideHeading?: boolean }) {
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <section className={cn("pb-24 sm:pb-32", hideHeading ? "pt-0" : "pt-24 sm:pt-32")}>
      <Container>
        {!hideHeading && (
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Featured Projects"
              title="Recent installations across Qatar and the Gulf."
              description="A selection of the events our screens have powered — from intimate galas to 10,000-person outdoor celebrations."
            />
            <Link href="/projects" className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:gap-2.5 transition-all sm:flex">
              View full gallery <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                filter === c
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:text-foreground hover:border-white/25"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => (
            <div
              key={p.id}
              className={`group relative overflow-hidden rounded-2xl border border-border ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
            >
              <div className={`relative ${i === 0 ? "aspect-[16/12]" : "aspect-[4/3]"} bg-gradient-to-br from-surface-2 to-black overflow-hidden`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(203,161,53,0.25),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(62,123,250,0.3),transparent_55%)]" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/40" />
                <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-accent">{p.category}</span>
                  <h3 className="mt-1.5 font-display text-lg font-semibold text-white">{p.title}</h3>
                  <p className="mt-1 text-xs text-white/60 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {p.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
