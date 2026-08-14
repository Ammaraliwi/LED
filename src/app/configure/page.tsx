import { db } from "@/db";
import { ledProducts, equipment, packages } from "@/db/schema";
import { BookingWizard } from "@/components/configure/booking-wizard";

export const dynamic = "force-dynamic";

export default async function ConfigurePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; package?: string }>;
}) {
  const [products, equipmentList, packagesList, params] = await Promise.all([
    db.select().from(ledProducts).orderBy(ledProducts.id),
    db.select().from(equipment).orderBy(equipment.category),
    db.select().from(packages),
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
