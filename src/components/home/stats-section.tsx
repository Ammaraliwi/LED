import { Container } from "@/components/ui/container";
import { StatCounter } from "@/components/ui/stat-counter";
import type { siteStats } from "@/db/schema";

type Stat = typeof siteStats.$inferSelect;

export function StatsSection({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative py-20 border-y border-border overflow-hidden">
      <div className="absolute inset-0 led-grid-bg opacity-40" />
      <Container className="relative grid grid-cols-2 gap-10 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCounter key={s.id} value={s.value} suffix={s.suffix} label={s.label} />
        ))}
      </Container>
    </section>
  );
}
