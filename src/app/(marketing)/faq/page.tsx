import { db } from "@/db";
import { faqs } from "@/db/schema";
import { PageHero } from "@/components/ui/page-hero";
import { FaqSection } from "@/components/home/faq-section";
import { ContactCta } from "@/components/home/contact-cta";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqsData = await db.select().from(faqs).orderBy(faqs.sortOrder);

  return (
    <>
      <PageHero eyebrow="FAQ" title="Answers before you ask." />
      <FaqSection faqs={faqsData} hideHeading />
      <ContactCta />
    </>
  );
}
