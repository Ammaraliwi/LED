import { z } from "zod";

const safeText = z.string().trim().max(5_000).refine((value) => !/<\/?(?:script|iframe|object|embed|style)\b/i.test(value), "Executable markup is not allowed");
const safeHref = z.string().trim().max(500).refine((value) => value.startsWith("/") || value.startsWith("https://") || value.startsWith("mailto:") || value.startsWith("tel:"), "Use a local path or an HTTPS/mail/tel URL");

export const PAGE_SECTION_DEFINITIONS = {
  "home.hero": {
    label: "Homepage hero",
    schema: z.object({
      eyebrow: safeText,
      title: safeText,
      highlight: safeText,
      description: safeText,
      primaryLabel: safeText,
      primaryHref: safeHref,
      secondaryLabel: safeText,
      secondaryHref: safeHref,
    }).strict(),
  },
  "home.about": {
    label: "Homepage about",
    schema: z.object({ heading: safeText, body: safeText }).strict(),
  },
  "home.services": {
    label: "Homepage services",
    schema: z.object({
      heading: safeText,
      intro: safeText,
      items: z.array(z.object({ title: safeText, description: safeText }).strict()).min(1).max(12),
    }).strict(),
  },
  "home.why_choose_us": {
    label: "Why choose LEDWAVE",
    schema: z.object({
      heading: safeText,
      intro: safeText,
      items: z.array(z.object({ title: safeText, description: safeText }).strict()).min(1).max(12),
    }).strict(),
  },
  "home.cta": {
    label: "Homepage call to action",
    schema: z.object({ heading: safeText, body: safeText, buttonLabel: safeText, buttonHref: safeHref }).strict(),
  },
  "about.intro": {
    label: "About page introduction",
    schema: z.object({ heading: safeText, body: safeText }).strict(),
  },
} as const;

export type PageSectionDefinitionKey = keyof typeof PAGE_SECTION_DEFINITIONS;

export const SITE_SETTING_DEFINITIONS = {
  "contact.phone": { label: "Phone", category: "contact", schema: safeText },
  "contact.email": { label: "Email", category: "contact", schema: z.string().email().max(255) },
  "contact.whatsapp": { label: "WhatsApp", category: "contact", schema: safeText },
  "contact.address": { label: "Address", category: "contact", schema: safeText },
  "social.instagram": { label: "Instagram URL", category: "social", schema: safeHref },
  "social.linkedin": { label: "LinkedIn URL", category: "social", schema: safeHref },
  "footer.description": { label: "Footer description", category: "footer", schema: safeText },
  "business.timezone": { label: "Business timezone", category: "business", schema: z.literal("Asia/Qatar") },
} as const;

export type SiteSettingKey = keyof typeof SITE_SETTING_DEFINITIONS;

export function parsePageSection(page: string, sectionKey: string, content: unknown): Record<string, unknown> {
  const key = `${page}.${sectionKey}` as PageSectionDefinitionKey;
  const definition = PAGE_SECTION_DEFINITIONS[key];
  if (!definition) throw new Error(`Unsupported page section: ${key}`);
  return definition.schema.parse(content) as Record<string, unknown>;
}

export function parseSiteSetting(key: string, value: unknown): unknown {
  const definition = SITE_SETTING_DEFINITIONS[key as SiteSettingKey];
  if (!definition) throw new Error(`Unsupported site setting: ${key}`);
  return definition.schema.parse(value);
}
