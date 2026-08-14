import { Container } from "@/components/ui/container";
import { ContactForm } from "@/components/contact-form";
import { Phone, Mail, Clock } from "lucide-react";

export default function SupportPage() {
  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">Support</h1>
      <p className="mt-1 text-sm text-muted">Need help with an existing booking or have a question? We&apos;re here 24/7.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="surface-card flex items-center gap-4 rounded-2xl p-5">
            <Phone className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-2">Phone</div>
              <div className="text-sm font-medium text-foreground">+974 4000 1234</div>
            </div>
          </div>
          <div className="surface-card flex items-center gap-4 rounded-2xl p-5">
            <Mail className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-2">Email</div>
              <div className="text-sm font-medium text-foreground">support@ledwave.events</div>
            </div>
          </div>
          <div className="surface-card flex items-center gap-4 rounded-2xl p-5">
            <Clock className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-2">Availability</div>
              <div className="text-sm font-medium text-foreground">24/7 Event-Day Support</div>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </Container>
  );
}
