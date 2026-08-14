import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Presentation, LayoutGrid, Heart, Building2, Rocket, PartyPopper, ArrowRight } from "lucide-react";

const solutions = [
  {
    icon: Presentation,
    title: "Conferences",
    description:
      "From boardroom keynotes to 1,000-seat summits, our indoor LED walls deliver broadcast-crisp presentation surfaces that keep every attendee's eyes on the stage.",
    features: ["Confidence monitors & IMAG support", "Seamless multi-screen configurations", "Same-day rehearsal access"],
  },
  {
    icon: LayoutGrid,
    title: "Exhibitions",
    description:
      "Self-supporting modular displays built for busy exhibition floors — fast to install, fast to strike, and durable across multi-day shows.",
    features: ["Ground-support structures", "Modular booth-friendly sizing", "Multi-day show durability"],
  },
  {
    icon: Heart,
    title: "Weddings & Celebrations",
    description:
      "Cinema-grade color and elegant framing for the moments that matter most — subtle enough for a ballroom, striking enough to be the backdrop of every photo.",
    features: ["Silent, low-glare operation", "Custom motion content support", "White-glove on-site styling"],
  },
  {
    icon: Building2,
    title: "Corporate Events",
    description: "Brand-perfect visuals for town halls, galas, award nights and executive summits with color accuracy your brand guidelines demand.",
    features: ["Color-calibrated to brand assets", "Redundant signal paths", "Dedicated on-site technician"],
  },
  {
    icon: Rocket,
    title: "Product Launches",
    description: "Immersive walls engineered to build anticipation and deliver the reveal — from single hero screens to full 270° environments.",
    features: ["Curved & immersive configurations", "Synchronized multi-wall playback", "Cinematic reveal sequencing"],
  },
  {
    icon: PartyPopper,
    title: "Festivals & Outdoor",
    description: "High-brightness, IP65-rated panels engineered for scale, weather and wind load — built for stages that run all day, every day.",
    features: ["5,000+ nit outdoor brightness", "Weatherproof, wind-load rated", "Backup modules on standby"],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Event Solutions"
        title="One platform, every kind of stage."
        description="Whatever the format, our screens, structures and crews adapt to the event — not the other way around."
      />

      <section className="pb-28">
        <Container className="space-y-6">
          {solutions.map((s) => (
            <div
              key={s.title}
              className="surface-card grid gap-8 rounded-2xl p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-10"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30">
                <s.icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">{s.description}</p>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="text-xs text-foreground/70">
                      · {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button href="/configure" variant="outline" className="shrink-0">
                Get a Quote <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
