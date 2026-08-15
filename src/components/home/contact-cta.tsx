import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export interface CtaContent { heading: string; body: string; buttonLabel: string; buttonHref: string; }

const DEFAULT_CTA: CtaContent = { heading: "Ready to make your event impossible to ignore?", body: "Configure your screen and get an instant price, or talk to our events team about a bespoke production.", buttonLabel: "Build Your Screen", buttonHref: "/configure" };

export function ContactCta({ content = DEFAULT_CTA }: { content?: CtaContent }) {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 led-grid-bg opacity-30" />
          <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/25 blur-[100px]" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              {content.heading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              {content.body}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href={content.buttonHref} size="lg">
                {content.buttonLabel} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/contact" size="lg" variant="outline">
                Talk to Our Team
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
