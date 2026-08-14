import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/container";
import { ContactForm } from "@/components/contact-form";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const info = [
  { icon: MapPin, label: "Address", value: "West Bay, Doha, Qatar" },
  { icon: Phone, label: "Phone", value: "+974 4000 1234" },
  { icon: Mail, label: "Email", value: "hello@ledwave.events" },
  { icon: Clock, label: "Support", value: "24/7 Event-Day Support" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's plan your screen."
        description="Have a bespoke production in mind, or just want a human to talk through your options? Reach out and our events team will respond within one business day."
      />
      <section className="pb-28">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-5">
            {info.map((i) => (
              <div key={i.label} className="surface-card flex items-center gap-4 rounded-2xl p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                  <i.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-2">{i.label}</div>
                  <div className="text-sm font-medium text-foreground">{i.value}</div>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </Container>
      </section>
    </>
  );
}
