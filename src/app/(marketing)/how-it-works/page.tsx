import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, MonitorCheck, SlidersHorizontal, CalendarCheck2, Truck } from "lucide-react";

const steps = [
  {
    icon: MonitorCheck,
    number: "01",
    title: "Choose",
    description: "Browse our indoor and outdoor LED screens by pixel pitch, brightness and use case. Not sure what you need? Our packages do the choosing for you.",
  },
  {
    icon: SlidersHorizontal,
    number: "02",
    title: "Configure",
    description: "Pick a preset size or enter a fully custom width and height. We calculate cabinet count, resolution and coverage instantly, and check real-time availability for your dates.",
  },
  {
    icon: CalendarCheck2,
    number: "03",
    title: "Book",
    description: "Add any extra equipment — processors, stages, audio, lighting or technicians — see your live price update, then confirm your booking or request an official quotation.",
  },
  {
    icon: Truck,
    number: "04",
    title: "We Handle Everything",
    description: "Our crew delivers, installs, tests and dismantles the equipment around your schedule, with a technical operator on standby throughout your event.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title="From idea to installed screen, in four steps."
        description="No complicated ERP-style forms. A visual, guided booking experience designed to get you an accurate price in minutes."
      />

      <section className="pb-28">
        <Container className="space-y-6">
          {steps.map((s) => (
            <div key={s.number} className="surface-card grid gap-6 rounded-2xl p-8 sm:grid-cols-[auto_1fr] sm:items-center lg:p-10">
              <div className="flex items-center gap-5">
                <span className="font-display text-4xl font-bold text-transparent [-webkit-text-stroke:1.5px_var(--color-accent)]">
                  {s.number}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                  <s.icon className="h-5 w-5 text-accent" />
                </div>
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{s.description}</p>
              </div>
            </div>
          ))}
        </Container>

        <Container className="mt-14 text-center">
          <Button href="/configure" size="lg">
            Start Building Your Screen <ArrowRight className="h-4 w-4" />
          </Button>
        </Container>
      </section>
    </>
  );
}
