import { db } from "@/db";
import { ledProducts } from "@/db/schema";
import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Sun, Building2, Gauge, Layers } from "lucide-react";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ScreensPage() {
  const products = await db.select().from(ledProducts).where(eq(ledProducts.isActive, true)).orderBy(ledProducts.id);

  return (
    <>
      <PageHero
        eyebrow="Our LED Screens"
        title="Every panel, broadcast-grade."
        description="Indoor precision for close-viewing conference rooms, and weatherproof brightness for outdoor stages — our fleet covers every pixel pitch your event needs."
      />

      <section className="pb-28">
        <Container className="space-y-8">
          {products.map((p) => (
            <div key={p.id} id={p.slug} className="surface-card scroll-mt-28 grid gap-8 rounded-2xl p-8 lg:grid-cols-[1fr_1.1fr] lg:p-10">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(62,123,250,0.35),transparent_60%)]" />
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-7 gap-px p-5 opacity-70">
                  {Array.from({ length: 70 }).map((_, i) => (
                    <div key={i} className="rounded-[1px] bg-white/10" />
                  ))}
                </div>
                <span className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80">
                  {p.screenType}
                </span>
                {p.isFeatured && (
                  <span className="absolute top-4 right-4 rounded-full bg-accent-2/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
                    Featured
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <h2 className="font-display text-2xl font-semibold text-foreground">{p.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.description}</p>

                <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Spec icon={Layers} label="Pixel Pitch" value={`P${p.pixelPitch}`} />
                  <Spec icon={Gauge} label="Brightness" value={`${p.brightnessNits} nits`} />
                  <Spec icon={Building2} label="Cabinet" value={`${p.cabinetWidthMm}×${p.cabinetHeightMm}mm`} />
                  <Spec icon={Sun} label="Refresh Rate" value={`${p.refreshRateHz} Hz`} />
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-2">From</div>
                    <div className="font-display text-2xl font-bold text-foreground">
                      QAR {Number(p.pricePerCabinetPerDay).toFixed(0)}
                      <span className="text-sm font-normal text-muted"> / cabinet / day</span>
                    </div>
                  </div>
                  <Button href={`/configure?product=${p.slug}`}>Configure This Screen</Button>
                </div>
              </div>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}

function Spec({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <Icon className="h-4 w-4 text-accent" />
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-2">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
