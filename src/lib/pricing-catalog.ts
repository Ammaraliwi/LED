import { z } from "zod";
import type { PricingSettingsMap } from "@/lib/pricing";

const numberSetting = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);

export const PRICING_DEFINITIONS = {
  installation_fee_per_cabinet: { label: "Installation fee per cabinet", category: "services", schema: numberSetting(0, 5_000) },
  dismantling_fee_per_cabinet: { label: "Dismantling fee per cabinet", category: "services", schema: numberSetting(0, 5_000) },
  transport_fee_base: { label: "Transportation base fee", category: "transport", schema: numberSetting(0, 100_000) },
  transport_fee_per_cabinet: { label: "Transportation per cabinet", category: "transport", schema: numberSetting(0, 5_000) },
  technician_daily_rate: { label: "Mandatory technician daily rate", category: "services", schema: numberSetting(0, 100_000) },
  processor_daily_rate: { label: "LED processor daily rate", category: "services", schema: numberSetting(0, 100_000) },
  minimum_rental_price: { label: "Minimum order subtotal", category: "rental", schema: numberSetting(0, 1_000_000) },
  vat_percent: { label: "VAT / tax percentage", category: "tax", schema: numberSetting(0, 100) },
  weekend_multiplier: { label: "Weekend rental multiplier", category: "rental", schema: numberSetting(0.1, 10) },
  corporate_discount_percent: { label: "Corporate discount percentage", category: "discounts", schema: numberSetting(0, 100) },
  multi_day_discount_curve: {
    label: "Multi-day rental rate curve",
    category: "discounts",
    schema: z.object({
      day1: numberSetting(0, 2),
      day2: numberSetting(0, 2),
      day3: numberSetting(0, 2),
      day4Plus: numberSetting(0, 2),
    }).strict().refine((value) => value.day1 >= value.day2 && value.day2 >= value.day3 && value.day3 >= value.day4Plus, {
      message: "Multi-day rates must not increase on later days",
    }),
  },
} as const;

export type PricingKey = keyof typeof PRICING_DEFINITIONS;
export const PRICING_KEYS = Object.keys(PRICING_DEFINITIONS) as PricingKey[];
export const PRICING_FORMULA_VERSION = "ledwave-2026-08-v2";

export function parsePricingValue(key: string, value: unknown): unknown {
  const definition = PRICING_DEFINITIONS[key as PricingKey];
  if (!definition) throw new Error(`Unsupported pricing key: ${key}`);
  return definition.schema.parse(value);
}

export function validateCompletePricingSettings(settings: PricingSettingsMap): PricingSettingsMap {
  const parsed: PricingSettingsMap = {};
  for (const key of PRICING_KEYS) {
    if (!(key in settings)) throw new Error(`Pricing configuration is incomplete: ${key} is missing`);
    parsed[key] = parsePricingValue(key, settings[key]);
  }
  return parsed;
}
