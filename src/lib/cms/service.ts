import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { pageSections, siteSettings } from "@/db/schema";

export async function getPublishedSection<T>(
  page: string,
  sectionKey: string,
  fallback: T,
  locale = "en",
): Promise<T> {
  const [section] = await db
    .select({ content: pageSections.publishedContent })
    .from(pageSections)
    .where(and(
      eq(pageSections.page, page),
      eq(pageSections.sectionKey, sectionKey),
      eq(pageSections.locale, locale),
      isNotNull(pageSections.publishedContent),
      eq(pageSections.publishedIsVisible, true),
    ))
    .limit(1);
  return (section?.content as unknown as T | undefined) ?? fallback;
}

export async function getSiteSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
