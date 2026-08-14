import { db } from "@/db";
import { ledProducts, packages as packagesTable, testimonials, projects, siteStats, faqs } from "@/db/schema";
import { Hero } from "@/components/home/hero";
import { ConfiguratorPreview } from "@/components/home/configurator-preview";
import { ScreensShowcase } from "@/components/home/screens-showcase";
import { SolutionsSection } from "@/components/home/solutions-section";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { HowItWorks } from "@/components/home/how-it-works";
import { ProjectsGallery } from "@/components/home/projects-gallery";
import { StatsSection } from "@/components/home/stats-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FaqSection } from "@/components/home/faq-section";
import { ContactCta } from "@/components/home/contact-cta";
import { PackagesPreview } from "@/components/home/packages-preview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, packagesData, testimonialsData, projectsData, statsData, faqsData] = await Promise.all([
    db.select().from(ledProducts).orderBy(ledProducts.id),
    db.select().from(packagesTable),
    db.select().from(testimonials).orderBy(testimonials.sortOrder),
    db.select().from(projects).orderBy(projects.sortOrder),
    db.select().from(siteStats).orderBy(siteStats.sortOrder),
    db.select().from(faqs).orderBy(faqs.sortOrder),
  ]);

  return (
    <>
      <Hero />
      <ConfiguratorPreview />
      <ScreensShowcase products={products} />
      <PackagesPreview packages={packagesData} />
      <SolutionsSection />
      <WhyChooseUs />
      <HowItWorks />
      <ProjectsGallery projects={projectsData} />
      <StatsSection stats={statsData} />
      <TestimonialsSection testimonials={testimonialsData} />
      <FaqSection faqs={faqsData} />
      <ContactCta />
    </>
  );
}
