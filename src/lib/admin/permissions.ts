export const STAFF_ROLES = ["super_admin", "sales", "operations", "technician", "finance"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserRole = "customer" | StaffRole;

export const ALL_PERMISSIONS = [
  "dashboard.read",
  "products.read",
  "products.write",
  "inventory.read",
  "inventory.write",
  "pricing.read",
  "pricing.write",
  "bookings.read",
  "bookings.write",
  "bookings.update_status",
  "customers.read",
  "customers.write",
  "payments.read",
  "payments.record",
  "invoices.read",
  "invoices.write",
  "content.read",
  "content.write",
  "content.publish",
  "media.read",
  "media.write",
  "users.read",
  "users.manage",
  "users.manage_roles",
  "settings.read",
  "settings.write",
  "audit.read",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const commercial: Permission[] = [
  "dashboard.read",
  "products.read",
  "inventory.read",
  "pricing.read",
  "bookings.read",
  "bookings.write",
  "bookings.update_status",
  "customers.read",
  "customers.write",
  "payments.read",
  "invoices.read",
  "content.read",
  "content.write",
  "media.read",
  "media.write",
];

const operations: Permission[] = [
  "dashboard.read",
  "products.read",
  "products.write",
  "inventory.read",
  "inventory.write",
  "pricing.read",
  "bookings.read",
  "bookings.write",
  "bookings.update_status",
  "customers.read",
  "media.read",
  "media.write",
  "users.read",
];

export const ROLE_PERMISSIONS: Readonly<Record<StaffRole, ReadonlySet<Permission>>> = {
  super_admin: new Set(ALL_PERMISSIONS),
  sales: new Set(commercial),
  operations: new Set(operations),
  technician: new Set(["dashboard.read", "inventory.read", "bookings.read", "bookings.update_status", "media.read"]),
  finance: new Set([
    "dashboard.read",
    "products.read",
    "pricing.read",
    "bookings.read",
    "customers.read",
    "payments.read",
    "payments.record",
    "invoices.read",
    "invoices.write",
    "audit.read",
  ]),
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return isStaffRole(role) && ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: string | null | undefined): Permission[] {
  return isStaffRole(role) ? [...ROLE_PERMISSIONS[role]] : [];
}

export function roleRequiresMfa(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "finance";
}
