import { PortalShell } from "@/components/portal/portal-shell";
import { requireCustomer } from "@/lib/admin/authz";
import { redirect } from "next/navigation";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomer().catch(() => redirect("/login?callbackUrl=/portal"));
  return <PortalShell name={customer.name}>{children}</PortalShell>;
}
