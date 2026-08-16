import { db } from "@/db";
import { ledProducts, equipment, packages } from "@/db/schema";
import { BookingWizard } from "@/components/configure/booking-wizard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ConfigurePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; package?: string }>;
}) {
  const [products, equipmentList, packagesList, params] = await Promise.all([
    db.select().from(ledProducts).where(eq(ledProducts.isActive, true)).orderBy(ledProducts.id),
    db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(equipment.category),
    db.select().from(packages).where(eq(packages.isActive, true)),
    searchParams,
  ]);

  return (
    <BookingWizard
      products={products}
      equipmentList={equipmentList}
      packagesList={packagesList}
      initialProductSlug={params.product}
      initialPackageSlug={params.package}
    />
  );
}
