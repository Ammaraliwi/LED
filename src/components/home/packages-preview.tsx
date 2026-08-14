import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn, formatCurrency } from "@/lib/utils";
import type { packages } from "@/db/schema";

type Package = typeof packages.$inferSelect;

export function PackagesPreview({ packages, hideHeading = false }: { packages: Package[]; hideHeading?: boolean }) {
  return (
    <section className={cn("pb-24 sm:pb-32", hideHeading ? "pt-0" : "pt-24 sm:pt-32")}>
      <Container>
        {!hideHeading && (
          <SectionHeading
            eyebrow="Rental Packages"
            title="Skip the configurator — go straight to booking."
            description="Pre-built bundles for the most common event formats, priced and ready to go."
          />
        )}

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {packages.map((pkg, i) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl p-8 ${
                i === 1 ? "border-2 border-accent surface-card glow-accent" : "surface-card surface-card-hover"
              }`}
            >
              {i === 1 && (
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold text-foreground">{pkg.name}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{pkg.description}</p>

              <div className="mt-6">
                <span className="text-xs uppercase tracking-wider text-muted-2">Starting from</span>
                <div className="font-display text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(pkg.startingPrice)}
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-2">Recommended for: {pkg.recommendedEventSize}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {pkg.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button href={`/configure?package=${pkg.slug}`} className="mt-8 justify-center" variant={i === 1 ? "primary" : "outline"}>
                Book Now <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {!hideHeading && (
          <div className="mt-8 text-center">
            <Link href="/packages" className="text-sm font-medium text-accent hover:underline">
              Compare all packages in detail →
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
