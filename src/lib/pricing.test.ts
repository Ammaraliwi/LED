import assert from "node:assert/strict";
import test from "node:test";
import { computeConfigurator, computePricing } from "./pricing";

function oneDayP26Pricing(includeTechnician: boolean) {
  return computePricing({
    pricePerCabinetPerDay: 50,
    totalCabinets: 24,
    rentalDays: 1,
    includeInstallation: true,
    includeDismantling: true,
    includeTransport: true,
    includeProcessor: true,
    includeTechnician,
    addons: [],
    isWeekend: false,
    isCorporate: false,
    settings: {},
  });
}

test("3m x 2m uses 24 standard cabinets", () => {
  const screen = computeConfigurator(3, 2);

  assert.equal(screen.totalCabinets, 24);
});

test("3m x 2m P2.6 one-day pricing matches the approved rates", () => {
  const pricing = oneDayP26Pricing(true);

  assert.deepEqual(
    {
      rentalSubtotal: pricing.rentalSubtotal,
      installationFee: pricing.installationFee,
      dismantlingFee: pricing.dismantlingFee,
      transportFee: pricing.transportFee,
      processorFee: pricing.processorFee,
      technicianFee: pricing.technicianFee,
      subtotalBeforeTax: pricing.subtotalBeforeTax,
      vatAmount: pricing.vatAmount,
      total: pricing.total,
    },
    {
      rentalSubtotal: 1200,
      installationFee: 120,
      dismantlingFee: 72,
      transportFee: 224,
      processorFee: 150,
      technicianFee: 100,
      subtotalBeforeTax: 1866,
      vatAmount: 93.3,
      total: 1959.3,
    },
  );
});

test("technician fee remains mandatory when a client submits false", () => {
  const pricing = oneDayP26Pricing(false);

  assert.equal(pricing.technicianFee, 100);
  assert.equal(pricing.total, 1959.3);
});
