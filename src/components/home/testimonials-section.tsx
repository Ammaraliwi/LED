import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import type { testimonials } from "@/db/schema";

type Testimonial = typeof testimonials.$inferSelect;

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="py-24 sm:py-32 bg-surface/30">
      <Container>
        <SectionHeading eyebrow="Testimonials" title="Trusted by event teams across the region." align="center" className="mx-auto" />

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="surface-card rounded-2xl p-8 flex flex-col">
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent-2 text-accent-2" />
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-foreground/90 flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-semibold text-accent">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-2">{t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
