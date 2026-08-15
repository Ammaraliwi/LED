import { ShieldCheck, Zap, Wrench, HeadphonesIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";

const points = [
  {
    icon: Zap,
    title: "Instant, Transparent Pricing",
    description: "Our live pricing engine calculates your full quotation the moment you configure your screen — no waiting on emails.",
  },
  {
    icon: Wrench,
    title: "Certified Technical Crews",
    description: "Every installation is handled by trained riggers and LED technicians, with load-tested structures and redundant power.",
  },
  {
    icon: ShieldCheck,
    title: "Backup Equipment On Standby",
    description: "Premium and outdoor bookings include spare modules and processors so a single failure never becomes your problem.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Event-Day Support",
    description: "A dedicated operator monitors your event from install to dismantle, with a support line answered around the clock.",
  },
];

export interface WhyContent { heading: string; intro: string; items: { title: string; description: string }[]; }

export function WhyChooseUs({ content }: { content: WhyContent }) {
  const visible = content.items.map((item, index) => ({ ...item, icon: points[index % points.length].icon }));
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Why Choose Us"
          title={content.heading}
          description={content.intro}
          align="center"
          className="mx-auto"
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => (
            <div key={p.title} className="surface-card surface-card-hover rounded-2xl p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                <p.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{p.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
