"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import type { faqs } from "@/db/schema";

type Faq = typeof faqs.$inferSelect;

export function FaqSection({ faqs, hideHeading = false }: { faqs: Faq[]; hideHeading?: boolean }) {
  const [openId, setOpenId] = useState<number | null>(faqs[0]?.id ?? null);

  return (
    <section className={cn("pb-24 sm:pb-32", hideHeading ? "pt-0" : "pt-24 sm:pt-32")}>
      <Container className="max-w-3xl">
        {!hideHeading && <SectionHeading eyebrow="FAQ" title="Answers before you ask." align="center" className="mx-auto" />}

        <div className={cn("divide-y divide-border", hideHeading ? "mt-0" : "mt-14")}>
          {faqs.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="py-5">
                <button
                  onClick={() => setOpenId(open ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="font-medium text-foreground">{f.question}</span>
                  <Plus className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-300", open && "rotate-45 text-accent")} />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm leading-relaxed text-muted">{f.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
