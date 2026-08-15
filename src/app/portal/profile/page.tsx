import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/components/portal/profile-form";
import { requireCustomer } from "@/lib/admin/authz";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { customerId, email } = await requireCustomer();

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) notFound();

  return (
    <Container className="!px-0 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted">Manage your contact and billing information.</p>

      <div className="mt-8">
        <ProfileForm customer={customer} email={email} />
      </div>
    </Container>
  );
}
