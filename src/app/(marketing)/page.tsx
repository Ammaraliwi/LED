import { db } from "@/db";
import { ledProducts, packages as packagesTable, testimonials, projects, siteStats, faqs } from "@/db/schema";
import { eq } from "drizzle-orm";
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
import { AboutSummary } from "@/components/home/about-summary";
import { getPublishedSection } from "@/lib/cms/service";
import type { HeroContent } from "@/components/home/hero";
import type { ServicesContent } from "@/components/home/solutions-section";
import type { WhyContent } from "@/components/home/why-choose-us";
import type { CtaContent } from "@/components/home/contact-cta";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const defaults = {
    hero: { eyebrow: "Trusted for 100+ premium live events", title: "Make Your Event", highlight: "Impossible to Ignore.", description: "Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered, installed and supported by our technical team.", primaryLabel: "Build Your Screen", primaryHref: "/configure", secondaryLabel: "Explore Our Screens", secondaryHref: "/screens" },
    about: { heading: "Event technology delivered with precision", body: "LEDWAVE combines premium modular LED screens, transparent pricing and an experienced technical team for events across Qatar." },
    services: { heading: "One platform, every kind of stage.", intro: "Whatever the format, our screens, structures and crews adapt to the event — not the other way around.", items: [{ title: "Conferences", description: "Broadcast-crisp keynote backdrops and presenter confidence walls." }, { title: "Exhibitions", description: "Self-supporting booth displays that command attention on any floor." }, { title: "Weddings & Celebrations", description: "Elegant indoor screens with cinema-grade color for your biggest day." }, { title: "Corporate Events", description: "Brand-perfect visuals for town halls, galas and executive summits." }, { title: "Product Launches", description: "Immersive walls built to reveal, not just display." }, { title: "Festivals & Outdoor", description: "High-brightness, weatherproof screens engineered for scale." }] },
    why: { heading: "Built like a technology company, not a rental counter.", intro: "Reliable equipment and clear service from quotation through dismantling.", items: [{ title: "Instant, Transparent Pricing", description: "Our live pricing engine calculates your full quotation the moment you configure your screen." }, { title: "Certified Technical Crews", description: "Every installation is handled by trained riggers and LED technicians." }, { title: "Backup Equipment On Standby", description: "Spare modules and processors protect important events." }, { title: "24/7 Event-Day Support", description: "A dedicated operator supports the event from install to dismantle." }] },
    cta: { heading: "Ready to make your event impossible to ignore?", body: "Configure your screen and get an instant price, or talk to our events team about a bespoke production.", buttonLabel: "Build Your Screen", buttonHref: "/configure" },
  };
  const [products, packagesData, testimonialsData, projectsData, statsData, faqsData, hero, about, services, why, cta] = await Promise.all([
    db.select().from(ledProducts).where(eq(ledProducts.isActive, true)).orderBy(ledProducts.id),
    db.select().from(packagesTable).where(eq(packagesTable.isActive, true)),
    db.select().from(testimonials).where(eq(testimonials.isActive, true)).orderBy(testimonials.sortOrder),
    db.select().from(projects).where(eq(projects.isActive, true)).orderBy(projects.sortOrder),
    db.select().from(siteStats).where(eq(siteStats.isActive, true)).orderBy(siteStats.sortOrder),
    db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(faqs.sortOrder),
    getPublishedSection<HeroContent>("home", "hero", defaults.hero),
    getPublishedSection("home", "about", defaults.about),
    getPublishedSection<ServicesContent>("home", "services", defaults.services),
    getPublishedSection<WhyContent>("home", "why_choose_us", defaults.why),
    getPublishedSection<CtaContent>("home", "cta", defaults.cta),
  ]);

  return (
    <>
      <Hero content={hero} />
      <ConfiguratorPreview />
      <AboutSummary content={about} />
      <ScreensShowcase products={products} />
      <PackagesPreview packages={packagesData} />
      <SolutionsSection content={services} />
      <WhyChooseUs content={why} />
      <HowItWorks />
      <ProjectsGallery projects={projectsData} />
      <StatsSection stats={statsData} />
      <TestimonialsSection testimonials={testimonialsData} />
      <FaqSection faqs={faqsData} />
      <ContactCta content={cta} />
    </>
  );
}
