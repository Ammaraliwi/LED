import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { equipment, ledProducts, pricingSettings } from "./schema";
import {
  CORE_PRICING_SETTING_UPDATES,
  EQUIPMENT_DAILY_RATES,
  LED_PRODUCT_DAILY_RATES,
} from "./pricing-values";

async function requireUpdatedRow(
  description: string,
  update: PromiseLike<unknown[]>,
) {
  const rows = await update;
  if (rows.length === 0) {
    throw new Error(`Cannot update missing ${description}. Run npm run db:seed first.`);
  }
}

async function updatePricing() {
  console.log("Updating LEDWAVE pricing...");

  await db.transaction(async (tx) => {
    for (const [slug, pricePerCabinetPerDay] of Object.entries(
      LED_PRODUCT_DAILY_RATES,
    )) {
      await requireUpdatedRow(
        `LED product ${slug}`,
        tx
          .update(ledProducts)
          .set({ pricePerCabinetPerDay })
          .where(eq(ledProducts.slug, slug))
          .returning({ slug: ledProducts.slug }),
      );
    }

    for (const setting of CORE_PRICING_SETTING_UPDATES) {
      await requireUpdatedRow(
        `pricing setting ${setting.key}`,
        tx
          .update(pricingSettings)
          .set({ value: setting.value, label: setting.label, updatedAt: new Date() })
          .where(eq(pricingSettings.key, setting.key))
          .returning({ key: pricingSettings.key }),
      );
    }

    for (const [name, pricePerDay] of Object.entries(EQUIPMENT_DAILY_RATES)) {
      await requireUpdatedRow(
        `equipment item ${name}`,
        tx
          .update(equipment)
          .set({ pricePerDay })
          .where(eq(equipment.name, name))
          .returning({ name: equipment.name }),
      );
    }
  });

  console.log("Pricing update complete.");
  process.exit(0);
}

updatePricing().catch((error) => {
  console.error(error);
  process.exit(1);
});
