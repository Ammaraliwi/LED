import { db } from "@/db";
import { pricingSettings } from "@/db/schema";
import type { PricingSettingsMap } from "@/lib/pricing";

export async function getPricingSettingsMap(): Promise<PricingSettingsMap> {
  const rows = await db.select().from(pricingSettings);
  const map: PricingSettingsMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ts = Date.now().toString().slice(-5);
  return `LW-${year}-${ts}${rand}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${rand}`;
}
