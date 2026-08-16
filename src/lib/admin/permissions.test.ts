import assert from "node:assert/strict";
import test from "node:test";
import { ALL_PERMISSIONS, hasPermission, roleRequiresMfa, STAFF_ROLES } from "./permissions";

test("customers cannot receive any Admin permission", () => {
  for (const permission of ALL_PERMISSIONS) assert.equal(hasPermission("customer", permission), false);
});

test("super_admin has every permission and mandatory MFA", () => {
  for (const permission of ALL_PERMISSIONS) assert.equal(hasPermission("super_admin", permission), true);
  assert.equal(roleRequiresMfa("super_admin"), true);
});

test("staff roles are restricted to their operating scope", () => {
  assert.equal(hasPermission("sales", "pricing.write"), false);
  assert.equal(hasPermission("operations", "payments.record"), false);
  assert.equal(hasPermission("technician", "bookings.read"), true);
  assert.equal(hasPermission("technician", "customers.read"), false);
  assert.equal(hasPermission("finance", "payments.record"), true);
  assert.equal(hasPermission("finance", "products.write"), false);
  assert.deepEqual(STAFF_ROLES, ["super_admin", "sales", "operations", "technician", "finance"]);
  assert.equal(roleRequiresMfa("finance"), true);
});
