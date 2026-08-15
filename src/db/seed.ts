import "dotenv/config";
import { db } from "./index";
import {
  ledProducts,
  equipment,
  packages,
  pricingSettings,
  testimonials,
  projects,
  siteStats,
  faqs,
  pageSections,
  siteSettings,
} from "./schema";
import {
  CORE_PRICING_SETTING_UPDATES,
  EQUIPMENT_DAILY_RATES,
  LED_PRODUCT_DAILY_RATES,
} from "./pricing-values";
import { PRICING_DEFINITIONS } from "../lib/pricing-catalog";

async function seed() {
  console.log("Seeding database...");

  await db.insert(ledProducts).values([
    {
      name: "Indoor LED Screen — P2.6",
      slug: "indoor-p2-6",
      screenType: "indoor",
      pixelPitch: "2.6",
      cabinetWidthMm: 500,
      cabinetHeightMm: 500,
      brightnessNits: 1200,
      refreshRateHz: 3840,
      totalCabinets: 320,
      pricePerCabinetPerDay: LED_PRODUCT_DAILY_RATES["indoor-p2-6"],
      imageUrl: "/images/screen-indoor-p26.jpg",
      description: "Ultra-fine pixel pitch for close-viewing conferences, galas and broadcast-quality stage backdrops.",
      isFeatured: true,
    },
    {
      name: "Indoor LED Screen — P2.9",
      slug: "indoor-p2-9",
      screenType: "indoor",
      pixelPitch: "2.9",
      cabinetWidthMm: 500,
      cabinetHeightMm: 500,
      brightnessNits: 1000,
      refreshRateHz: 3840,
      totalCabinets: 400,
      pricePerCabinetPerDay: LED_PRODUCT_DAILY_RATES["indoor-p2-9"],
      imageUrl: "/images/screen-indoor-p29.jpg",
      description: "The industry workhorse — crisp indoor imagery for exhibitions, product launches and corporate events.",
      isFeatured: true,
    },
    {
      name: "Indoor/Outdoor LED Screen — P3.9",
      slug: "indoor-outdoor-p3-9",
      screenType: "outdoor",
      pixelPitch: "3.9",
      cabinetWidthMm: 500,
      cabinetHeightMm: 500,
      brightnessNits: 5500,
      refreshRateHz: 3840,
      totalCabinets: 280,
      pricePerCabinetPerDay: LED_PRODUCT_DAILY_RATES["indoor-outdoor-p3-9"],
      imageUrl: "/images/screen-outdoor-p39.jpg",
      description: "High-brightness weatherproof panels engineered for festivals, stages and outdoor activations.",
      isFeatured: true,
    },
  ]).onConflictDoNothing();

  const equipmentSeed = [
    { name: "LED Video Processor", category: "Processing", pricePerDay: EQUIPMENT_DAILY_RATES["LED Video Processor"], totalQuantity: 12, icon: "cpu" },
    { name: "Video Switcher", category: "Processing", pricePerDay: "350.00", totalQuantity: 8, icon: "shuffle" },
    { name: "Presentation Laptop", category: "Computing", pricePerDay: "120.00", totalQuantity: 15, icon: "laptop" },
    { name: "HDMI / SDI Signal Kit", category: "Signal", pricePerDay: "80.00", totalQuantity: 25, icon: "cable" },
    { name: "Ground Support Stage", category: "Structure", pricePerDay: "900.00", totalQuantity: 6, icon: "layout" },
    { name: "Truss System", category: "Structure", pricePerDay: "600.00", totalQuantity: 10, icon: "grid-3x3" },
    { name: "Line Array Speakers (pair)", category: "Audio", pricePerDay: "500.00", totalQuantity: 10, icon: "speaker" },
    { name: "Wireless Microphone Kit", category: "Audio", pricePerDay: "150.00", totalQuantity: 20, icon: "mic" },
    { name: "Architectural Lighting Kit", category: "Lighting", pricePerDay: "400.00", totalQuantity: 12, icon: "sparkles" },
    { name: "On-Site Technical Operator", category: "Staffing", pricePerDay: EQUIPMENT_DAILY_RATES["On-Site Technical Operator"], totalQuantity: 8, icon: "user-cog" },
    { name: "Backup LED Modules (per 10)", category: "Redundancy", pricePerDay: "200.00", totalQuantity: 20, icon: "shield-check" },
    { name: "Power Distribution Unit", category: "Power", pricePerDay: "180.00", totalQuantity: 15, icon: "plug-zap" },
  ];
  const existingEquipmentNames = new Set(
    (await db.select({ name: equipment.name }).from(equipment)).map(
      ({ name }) => name,
    ),
  );
  const missingEquipment = equipmentSeed.filter(
    ({ name }) => !existingEquipmentNames.has(name),
  );
  if (missingEquipment.length > 0) {
    await db.insert(equipment).values(missingEquipment);
  }

  await db.insert(packages).values([
    {
      name: "Conference Package",
      slug: "conference",
      description: "Everything you need for a polished boardroom or conference-hall presentation wall.",
      startingPrice: "8500.00",
      recommendedEventSize: "Up to 300 attendees",
      includes: ["4m × 3m Indoor LED Wall", "LED Video Processor", "Full Cabling", "Professional Installation", "On-Site Technical Support"],
      imageUrl: "/images/package-conference.jpg",
      screenTypeSuggestion: "indoor-p2-9",
    },
    {
      name: "Exhibition Package",
      slug: "exhibition",
      description: "A striking self-supporting display built for busy exhibition floors and trade shows.",
      startingPrice: "6200.00",
      recommendedEventSize: "Booth or pavilion displays",
      includes: ["3m × 2m LED Display", "Ground Support Structure", "LED Processor", "Installation & Dismantling"],
      imageUrl: "/images/package-exhibition.jpg",
      screenTypeSuggestion: "indoor-p2-9",
    },
    {
      name: "Premium Event Package",
      slug: "premium-event",
      description: "Our flagship offering for galas, launches and headline stages that cannot afford downtime.",
      startingPrice: "18500.00",
      recommendedEventSize: "500+ attendees / headline stage",
      includes: ["8m × 4m Large LED Wall", "Redundant LED Processor", "Full Installation Crew", "Dedicated Technical Operator", "Backup Equipment On Standby"],
      imageUrl: "/images/package-premium.jpg",
      screenTypeSuggestion: "outdoor-p3-9",
    },
  ]).onConflictDoNothing();

  const pricingSeed = [
    ...CORE_PRICING_SETTING_UPDATES,
    { key: "multi_day_discount_curve", value: { day1: 1.0, day2: 0.85, day3: 0.75, day4Plus: 0.65 }, label: "Multi-day rental discount curve" },
    { key: "vat_percent", value: 5, label: "VAT / Tax percentage" },
    { key: "weekend_multiplier", value: 1.1, label: "Weekend pricing multiplier" },
    { key: "corporate_discount_percent", value: 5, label: "Corporate customer discount %" },
  ];
  await db.insert(pricingSettings).values(pricingSeed.map((setting) => {
    const definition = PRICING_DEFINITIONS[setting.key as keyof typeof PRICING_DEFINITIONS];
    return { ...setting, category: definition.category, description: `${definition.label}. Managed through the Admin Portal after bootstrap.`, valueType: setting.key === "multi_day_discount_curve" ? "object" : "number" };
  })).onConflictDoNothing();

  await db.insert(siteSettings).values([
    { key: "contact.phone", value: "+974 4000 1234", label: "Phone", category: "contact" },
    { key: "contact.email", value: "hello@ledwave.events", label: "Email", category: "contact" },
    { key: "contact.whatsapp", value: "+974 4000 1234", label: "WhatsApp", category: "contact" },
    { key: "contact.address", value: "Doha, Qatar", label: "Address", category: "contact" },
    { key: "social.instagram", value: "https://www.instagram.com/", label: "Instagram URL", category: "social" },
    { key: "social.linkedin", value: "https://www.linkedin.com/", label: "LinkedIn URL", category: "social" },
    { key: "footer.description", value: "Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered, installed and supported by our technical team.", label: "Footer description", category: "footer" },
    { key: "business.timezone", value: "Asia/Qatar", label: "Business timezone", category: "business" },
  ]).onConflictDoNothing();

  const pageSectionSeed: (typeof pageSections.$inferInsert)[] = [
    { page: "home", sectionKey: "hero", locale: "en", status: "published" as const, isVisible: true, publishedIsVisible: true, sortOrder: 1, version: 1, publishedVersion: 1, content: { eyebrow: "Trusted for 100+ premium live events", title: "Make Your Event", highlight: "Impossible to Ignore.", description: "Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered, installed and supported by our technical team.", primaryLabel: "Build Your Screen", primaryHref: "/configure", secondaryLabel: "Explore Our Screens", secondaryHref: "/screens" }, publishedContent: { eyebrow: "Trusted for 100+ premium live events", title: "Make Your Event", highlight: "Impossible to Ignore.", description: "Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered, installed and supported by our technical team.", primaryLabel: "Build Your Screen", primaryHref: "/configure", secondaryLabel: "Explore Our Screens", secondaryHref: "/screens" }, publishedAt: new Date() },
    { page: "home", sectionKey: "about", locale: "en", status: "published" as const, isVisible: true, sortOrder: 2, version: 1, content: { heading: "Event technology delivered with precision", body: "LEDWAVE combines premium modular LED screens, transparent pricing and an experienced technical team for events across Qatar." }, publishedAt: new Date() },
    { page: "home", sectionKey: "services", locale: "en", status: "published" as const, isVisible: true, sortOrder: 3, version: 1, content: { heading: "One platform, every kind of stage.", intro: "Whatever the format, our screens, structures and crews adapt to the event — not the other way around.", items: [{ title: "Conferences", description: "Broadcast-crisp keynote backdrops and presenter confidence walls." }, { title: "Exhibitions", description: "Self-supporting booth displays that command attention on any floor." }, { title: "Weddings & Celebrations", description: "Elegant indoor screens with cinema-grade color for your biggest day." }, { title: "Corporate Events", description: "Brand-perfect visuals for town halls, galas and executive summits." }, { title: "Product Launches", description: "Immersive walls built to reveal, not just display." }, { title: "Festivals & Outdoor", description: "High-brightness, weatherproof screens engineered for scale." }] }, publishedAt: new Date() },
    { page: "home", sectionKey: "why_choose_us", locale: "en", status: "published" as const, isVisible: true, sortOrder: 4, version: 1, content: { heading: "Built like a technology company, not a rental counter.", intro: "Reliable equipment and clear service from quotation through dismantling.", items: [{ title: "Instant, Transparent Pricing", description: "Our live pricing engine calculates your full quotation the moment you configure your screen." }, { title: "Certified Technical Crews", description: "Every installation is handled by trained riggers and LED technicians." }, { title: "Backup Equipment On Standby", description: "Spare modules and processors protect important events." }, { title: "24/7 Event-Day Support", description: "A dedicated operator supports the event from install to dismantle." }] }, publishedAt: new Date() },
    { page: "home", sectionKey: "cta", locale: "en", status: "published" as const, isVisible: true, sortOrder: 5, version: 1, content: { heading: "Ready to make your event impossible to ignore?", body: "Configure your screen and get an instant price, or talk to our events team about a bespoke production.", buttonLabel: "Build Your Screen", buttonHref: "/configure" }, publishedAt: new Date() },
    { page: "about", sectionKey: "intro", locale: "en", status: "published" as const, isVisible: true, sortOrder: 1, version: 1, content: { heading: "An event technology company, not an equipment counter.", body: "LEDWAVE was founded to bring broadcast-grade LED technology to live events across Qatar and the Gulf — with the transparency and speed of a modern technology platform." }, publishedAt: new Date() },
  ];
  await db
    .insert(pageSections)
    .values(
      pageSectionSeed.map((section) => ({
        ...section,
        publishedContent: section.content,
        publishedVersion: section.version,
        publishedIsVisible: section.isVisible,
      })),
    )
    .onConflictDoNothing();

  const testimonialSeed = [
    { name: "Fatima Al-Sulaiti", company: "Qatar Business Forum", quote: "The LED wall transformed our keynote stage. Flawless installation, zero downtime, and the crew was on-site the entire event.", rating: 5, sortOrder: 1 },
    { name: "James Whitfield", company: "Meridian Exhibitions", quote: "We've used them for three trade shows now. Their configurator made getting a quote instant instead of a week of back-and-forth emails.", rating: 5, sortOrder: 2 },
    { name: "Layla Haddad", company: "Haddad Weddings & Events", quote: "The visual quality for our client's wedding stage was cinema-grade. Guests thought it was a permanent installation.", rating: 5, sortOrder: 3 },
  ];
  const existingTestimonialNames = new Set(
    (await db.select({ name: testimonials.name }).from(testimonials)).map(
      ({ name }) => name,
    ),
  );
  const missingTestimonials = testimonialSeed.filter(
    ({ name }) => !existingTestimonialNames.has(name),
  );
  if (missingTestimonials.length > 0) {
    await db.insert(testimonials).values(missingTestimonials);
  }

  const projectSeed = [
    { title: "Doha Business Summit 2025", category: "Conferences", imageUrl: "/images/project-conference-1.jpg", description: "12m curved LED backdrop for a 1,200-seat keynote hall.", sortOrder: 1 },
    { title: "Gulf Tech Exhibition", category: "Exhibitions", imageUrl: "/images/project-exhibition-1.jpg", description: "Modular booth walls across 40 exhibitor stands.", sortOrder: 2 },
    { title: "Al-Thani Wedding Celebration", category: "Weddings", imageUrl: "/images/project-wedding-1.jpg", description: "Elegant P2.6 indoor stage screen with custom motion content.", sortOrder: 3 },
    { title: "National Day Outdoor Stage", category: "Outdoor Events", imageUrl: "/images/project-outdoor-1.jpg", description: "High-brightness P3.9 outdoor wall for a 10,000-person celebration.", sortOrder: 4 },
    { title: "Product Launch — Lusail Tower", category: "Corporate Events", imageUrl: "/images/project-corporate-1.jpg", description: "Immersive 270° LED environment for a flagship product reveal.", sortOrder: 5 },
    { title: "West Bay Convention Stage", category: "Stages", imageUrl: "/images/project-stage-1.jpg", description: "Broadcast-grade stage wall with redundant processing.", sortOrder: 6 },
  ];
  const existingProjectTitles = new Set(
    (await db.select({ title: projects.title }).from(projects)).map(
      ({ title }) => title,
    ),
  );
  const missingProjects = projectSeed.filter(
    ({ title }) => !existingProjectTitles.has(title),
  );
  if (missingProjects.length > 0) {
    await db.insert(projects).values(missingProjects);
  }

  const siteStatSeed = [
    { label: "Events Delivered", value: "100", suffix: "+", sortOrder: 1 },
    { label: "Premium LED Cabinets", value: "48", suffix: "+", sortOrder: 2 },
    { label: "Event Support", value: "24/7", suffix: "", sortOrder: 3 },
    { label: "Successful Installations", value: "99", suffix: "%", sortOrder: 4 },
  ];
  const existingSiteStatLabels = new Set(
    (await db.select({ label: siteStats.label }).from(siteStats)).map(
      ({ label }) => label,
    ),
  );
  const missingSiteStats = siteStatSeed.filter(
    ({ label }) => !existingSiteStatLabels.has(label),
  );
  if (missingSiteStats.length > 0) {
    await db.insert(siteStats).values(missingSiteStats);
  }

  const faqSeed = [
    { question: "How far in advance should I book my LED screen?", answer: "We recommend booking at least 2–3 weeks in advance for standard events, and 6–8 weeks for large-scale productions to guarantee inventory and crew availability.", sortOrder: 1 },
    { question: "Do you handle installation and dismantling?", answer: "Yes — every rental includes professional installation and dismantling by our certified technical crew unless you choose a self-collect option.", sortOrder: 2 },
    { question: "What happens if a cabinet fails during my event?", answer: "All premium and outdoor packages include backup modules on standby, and our on-site technician can swap a faulty cabinet in minutes.", sortOrder: 3 },
    { question: "Can I get a custom screen size?", answer: "Absolutely. Our configurator supports fully custom width and height, automatically calculating the nearest cabinet grid and price.", sortOrder: 4 },
    { question: "Is outdoor use safe in wind or rain?", answer: "Our outdoor-rated panels are IP65-protected and structurally rated for typical event wind loads; our team will advise on ground support vs. rigging for your venue.", sortOrder: 5 },
  ];
  const existingFaqQuestions = new Set(
    (await db.select({ question: faqs.question }).from(faqs)).map(
      ({ question }) => question,
    ),
  );
  const missingFaqs = faqSeed.filter(
    ({ question }) => !existingFaqQuestions.has(question),
  );
  if (missingFaqs.length > 0) {
    await db.insert(faqs).values(missingFaqs);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
