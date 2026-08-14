import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import type { ledProducts } from "@/db/schema";

type Product = typeof ledProducts.$inferSelect;

export function ScreensShowcase({ products }: { products: Product[] }) {
  return (
    <section className="py-24 sm:py-32 bg-surface/30">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Our LED Screens"
            title="Engineered for every environment."
            description="From close-viewing indoor conference walls to high-brightness outdoor stages, every panel in our fleet is broadcast-grade."
          />
          <Link href="/screens" className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:gap-2.5 transition-all sm:flex">
            View all screens <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/screens#${p.slug}`}
              className="surface-card surface-card-hover group relative overflow-hidden rounded-2xl p-6 flex flex-col"
            >
              <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-xl bg-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(62,123,250,0.35),transparent_60%)]" />
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-px p-4 opacity-70">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="rounded-[1px] bg-white/10 group-hover:bg-accent/40 transition-colors" style={{ transitionDelay: `${(i % 8) * 15}ms` }} />
                  ))}
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80">
                  {p.screenType}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{p.name}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2">{p.description}</p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-2">Pixel Pitch P{p.pixelPitch}</span>
                <span className="font-semibold text-accent">from QAR {Number(p.pricePerCabinetPerDay).toFixed(0)}/cabinet/day</span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
