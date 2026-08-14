import { db } from "@/db";
import { siteStats } from "@/db/schema";
import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/container";
import { StatCounter } from "@/components/ui/stat-counter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Eye, Handshake } from "lucide-react";

export const dynamic = "force-dynamic";

const values = [
  { icon: Target, title: "Precision", description: "Every cabinet, cable and calculation is engineered to spec — no approximations on your event day." },
  { icon: Eye, title: "Transparency", description: "Live, itemized pricing from the first click. What you configure is exactly what you're quoted." },
  { icon: Handshake, title: "Partnership", description: "We treat every event like our own production, from pre-visit planning to the final dismantle." },
];

export default async function AboutPage() {
  const stats = await db.select().from(siteStats).orderBy(siteStats.sortOrder);

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="An event technology company, not an equipment counter."
        description="LEDWAVE was founded to bring broadcast-grade LED technology to live events across Qatar and the Gulf — with the transparency and speed of a modern technology platform."
      />

      <section className="pb-20">
        <Container className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="section-eyebrow">Our Story</p>
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight">
              Built by engineers who were tired of slow, opaque rental quotes.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              <p>
                LEDWAVE started with a simple frustration: booking a premium LED wall for an event meant days of back-and-forth
                emails just to get a price. We rebuilt the process from the ground up — real-time inventory, transparent
                pricing, and a configurator that shows you exactly what you&apos;re getting before you ever pick up the phone.
              </p>
              <p>
                Today our fleet of indoor and outdoor LED cabinets, backed by a certified technical crew, powers conferences,
                exhibitions, weddings and festivals across the region — with the same broadcast-grade standards used on major
                international productions.
              </p>
            </div>
            <Button href="/contact" className="mt-8">
              Talk to Our Team <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {values.map((v) => (
              <div key={v.title} className="surface-card rounded-2xl p-6 col-span-2 sm:col-span-1">
                <v.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface/30 py-20">
        <Container className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {stats.map((s) => (
            <StatCounter key={s.id} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </Container>
      </section>
    </>
  );
}
