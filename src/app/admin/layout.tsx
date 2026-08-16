import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/authz";
import { permissionsForRole } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireAdmin(undefined, { allowMfaSetup: true });
  return <AdminShell actor={{ name: actor.name, role: actor.role, mfaEnabled: actor.mfaEnabled, mfaVerified: actor.mfaVerified }} permissions={permissionsForRole(actor.role)}>{children}</AdminShell>;
}
