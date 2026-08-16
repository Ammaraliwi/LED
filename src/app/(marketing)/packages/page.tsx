import { db } from "@/db";
import { packages } from "@/db/schema";
import { PageHero } from "@/components/ui/page-hero";
import { PackagesPreview } from "@/components/home/packages-preview";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const packagesData = await db.select().from(packages).where(eq(packages.isActive, true));

  return (
    <>
      <PageHero
        eyebrow="Rental Packages"
        title="Pre-built bundles for every event size."
        description="Skip the configurator and go straight to a fully-equipped package — priced, included, and ready to book."
      />
      <PackagesPreview packages={packagesData} hideHeading />
    </>
  );
}
