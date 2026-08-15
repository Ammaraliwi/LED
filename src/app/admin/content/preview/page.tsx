import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pageSections } from "@/db/schema";
import { AdminCard, AdminPageHeader, StatusPill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";

export default async function ContentPreviewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin("content.read"); const page = (await searchParams).page === "about" ? "about" : "home";
  const sections = await db.select().from(pageSections).where(eq(pageSections.page, page)).orderBy(asc(pageSections.sortOrder));
  return <><AdminPageHeader title={`Draft preview: ${page}`} description="This protected preview displays the exact structured draft data. Publishing is a separate audited action." actions={<Link href="/admin/content" className="rounded-lg border border-white/10 px-3 py-2 text-sm">Back to editor</Link>} /><div className="space-y-5">{sections.map((section) => <AdminCard key={section.id} className="p-6"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{section.sectionKey.replaceAll("_", " ")}</h2><StatusPill value={section.status} /></div><pre className="mt-5 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-5 text-sm leading-6 text-muted">{JSON.stringify(section.content, null, 2)}</pre></AdminCard>)}</div></>;
}
