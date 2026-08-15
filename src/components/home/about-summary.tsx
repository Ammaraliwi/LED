import { Container } from "@/components/ui/container";

export function AboutSummary({ content }: { content: { heading: string; body: string } }) {
  return <section className="border-y border-border bg-surface/20 py-16"><Container><div className="mx-auto max-w-3xl text-center"><p className="section-eyebrow">About LEDWAVE</p><h2 className="font-display mt-4 text-3xl font-semibold tracking-tight">{content.heading}</h2><p className="mt-5 text-sm leading-7 text-muted sm:text-base">{content.body}</p></div></Container></section>;
}
