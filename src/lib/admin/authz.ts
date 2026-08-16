import "server-only";

import { auth } from "@/auth";
import { db } from "@/db";
import { staffMfa, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Permission, StaffRole } from "@/lib/admin/permissions";
import { hasPermission, isStaffRole, roleRequiresMfa } from "@/lib/admin/permissions";
import { AuthenticationError, AuthorizationError, MfaRequiredError } from "@/lib/admin/errors";

export interface AdminActor {
  id: number;
  email: string;
  name: string;
  role: StaffRole;
  sessionVersion: number;
  mfaEnabled: boolean;
  mfaVerified: boolean;
}

export async function requireAdmin(permission?: Permission, options: { allowMfaSetup?: boolean } = {}): Promise<AdminActor> {
  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) throw new AuthenticationError();

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      sessionVersion: users.sessionVersion,
      mfaEnabledAt: staffMfa.enabledAt,
    })
    .from(users)
    .leftJoin(staffMfa, eq(staffMfa.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.isActive || !isStaffRole(row.role)) throw new AuthorizationError("Staff access is not available for this account");
  if (Number(session?.user?.sessionVersion) !== row.sessionVersion) throw new AuthenticationError("This session has been revoked");
  if (permission && !hasPermission(row.role, permission)) throw new AuthorizationError();

  const mfaEnabled = Boolean(row.mfaEnabledAt);
  const mfaVerified = session?.user?.mfaVerified === true;
  if (!options.allowMfaSetup && roleRequiresMfa(row.role) && (!mfaEnabled || !mfaVerified)) {
    throw new MfaRequiredError();
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    sessionVersion: row.sessionVersion,
    mfaEnabled,
    mfaVerified,
  };
}

export async function requireCustomer() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const customerId = Number(session?.user?.customerId);
  if (!Number.isInteger(userId) || !Number.isInteger(customerId)) throw new AuthenticationError();

  const [user] = await db
    .select({ name: users.name, email: users.email, isActive: users.isActive, role: users.role, sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.isActive || user.role !== "customer") throw new AuthorizationError("Customer access is not available for this account");
  if (Number(session?.user?.sessionVersion) !== user.sessionVersion) throw new AuthenticationError("This session has been revoked");
  return { userId, customerId, name: user.name, email: user.email };
}
