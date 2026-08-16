import { z } from "zod";

export const passwordSchema = z.string()
  .min(12, "Password must contain at least 12 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const staffRoleSchema = z.enum(["super_admin", "sales", "operations", "technician", "finance"]);
