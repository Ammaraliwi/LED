import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";

const steps = [
  { number: "01", title: "Choose", description: "Select your LED screen — indoor or outdoor, by pixel pitch and purpose." },
  { number: "02", title: "Configure", description: "Choose size, dates and additional equipment. Watch your price update live." },
  { number: "03", title: "Book", description: "Receive your instant price and confirm the reservation in minutes." },
  { number: "04", title: "We Handle Everything", description: "Our team delivers, installs, tests and dismantles the equipment." },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 bg-surface/30">
      <Container>
        <SectionHeading eyebrow="How It Works" title="From idea to installed screen, in four steps." align="center" className="mx-auto" />

        <div className="relative mt-20 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute top-8 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          {steps.map((s) => (
            <div key={s.number} className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="font-display text-5xl font-bold text-transparent [-webkit-text-stroke:1.5px_var(--color-accent)] mb-4">
                {s.number}
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted max-w-xs">{s.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
