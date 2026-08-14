import { Container } from "@/components/ui/container";

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 led-grid-bg opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      <Container className="relative text-center">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">{description}</p>}
      </Container>
    </section>
  );
}
