import Link from "next/link";
import { Presentation, LayoutGrid, Heart, Building2, Rocket, PartyPopper } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";

const solutions = [
  { icon: Presentation, title: "Conferences", description: "Broadcast-crisp keynote backdrops and presenter confidence walls." },
  { icon: LayoutGrid, title: "Exhibitions", description: "Self-supporting booth displays that command attention on any floor." },
  { icon: Heart, title: "Weddings & Celebrations", description: "Elegant indoor screens with cinema-grade color for your biggest day." },
  { icon: Building2, title: "Corporate Events", description: "Brand-perfect visuals for town halls, galas and executive summits." },
  { icon: Rocket, title: "Product Launches", description: "Immersive walls built to reveal, not just display." },
  { icon: PartyPopper, title: "Festivals & Outdoor", description: "High-brightness, weatherproof screens engineered for scale." },
];

export interface ServicesContent { heading: string; intro: string; items: { title: string; description: string }[]; }

export function SolutionsSection({ content }: { content: ServicesContent }) {
  const visible = content.items.map((item, index) => ({ ...item, icon: solutions[index % solutions.length].icon }));
  return (
    <section className="py-24 sm:py-32 bg-surface/30">
      <Container>
        <SectionHeading
          eyebrow="Event Solutions"
          title={content.heading}
          description={content.intro}
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <Link
              key={s.title}
              href="/solutions"
              className="surface-card surface-card-hover rounded-2xl p-7 flex flex-col"
            >
              <s.icon className="h-6 w-6 text-accent-2" />
              <h3 className="mt-5 font-display text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.description}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
