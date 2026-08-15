// Shared pricing engine — used server-side (authoritative) so the
// live quotation the customer sees always matches what gets persisted.

export type PricingSettingsMap = Record<string, unknown>;

export interface AddonLine {
  equipmentId: number;
  name: string;
  quantity: number;
  pricePerDay: number;
}

export interface PricingInput {
  pricePerCabinetPerDay: number;
  totalCabinets: number;
  rentalDays: number;
  includeInstallation: boolean;
  includeDismantling: boolean;
  includeTransport: boolean;
  includeProcessor: boolean;
  includeTechnician: boolean;
  addons: AddonLine[];
  isWeekend: boolean;
  isCorporate: boolean;
  discountPercentOverride?: number;
  settings: PricingSettingsMap;
}

export interface PricingBreakdown {
  rentalSubtotal: number;
  installationFee: number;
  dismantlingFee: number;
  transportFee: number;
  processorFee: number;
  technicianFee: number;
  addonsTotal: number;
  addonsLines: { name: string; quantity: number; lineTotal: number }[];
  discountAmount: number;
  discountLabel: string | null;
  subtotalBeforeTax: number;
  vatAmount: number;
  vatPercent: number;
  total: number;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Multi-day discount curve: day1=100%, day2=85%, day3=75%, day4+=65% (configurable). */
function rentalDayMultiplierSum(days: number, curve: { day1: number; day2: number; day3: number; day4Plus: number }) {
  let sum = 0;
  for (let d = 1; d <= days; d++) {
    if (d === 1) sum += curve.day1;
    else if (d === 2) sum += curve.day2;
    else if (d === 3) sum += curve.day3;
    else sum += curve.day4Plus;
  }
  return sum;
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const s = input.settings;

  const installPerCabinet = num(s.installation_fee_per_cabinet, 5);
  const dismantlePerCabinet = num(s.dismantling_fee_per_cabinet, 3);
  const transportBase = num(s.transport_fee_base, 200);
  const transportPerCabinet = num(s.transport_fee_per_cabinet, 1);
  const technicianDailyRate = num(s.technician_daily_rate, 100);
  const processorDailyRate = num(s.processor_daily_rate, 150);
  const vatPercent = num(s.vat_percent, 5);
  const weekendMultiplier = num(s.weekend_multiplier, 1.1);
  const corporateDiscountPercent = num(s.corporate_discount_percent, 5);
  const minimumRentalPrice = num(s.minimum_rental_price, 1000);

  const curveRaw = s.multi_day_discount_curve as
    | { day1: number; day2: number; day3: number; day4Plus: number }
    | undefined;
  const curve = curveRaw ?? { day1: 1, day2: 0.85, day3: 0.75, day4Plus: 0.65 };

  const days = Math.max(1, input.rentalDays);
  const daySum = rentalDayMultiplierSum(days, curve);

  let rentalSubtotal = input.pricePerCabinetPerDay * input.totalCabinets * daySum;
  if (input.isWeekend) rentalSubtotal *= weekendMultiplier;
  rentalSubtotal = Math.max(rentalSubtotal, input.totalCabinets > 0 ? 0 : 0);

  const installationFee = input.includeInstallation ? installPerCabinet * input.totalCabinets : 0;
  const dismantlingFee = input.includeDismantling ? dismantlePerCabinet * input.totalCabinets : 0;
  const transportFee = input.includeTransport ? transportBase + transportPerCabinet * input.totalCabinets : 0;
  const processorFee = input.includeProcessor ? processorDailyRate * days : 0;
  // Every screen rental requires an on-site technician, regardless of client input.
  const technicianFee = technicianDailyRate * days;

  const addonsLines = input.addons.map((a) => ({
    name: a.name,
    quantity: a.quantity,
    lineTotal: a.pricePerDay * a.quantity * days,
  }));
  const addonsTotal = addonsLines.reduce((sum, l) => sum + l.lineTotal, 0);

  const runningSubtotal =
    rentalSubtotal + installationFee + dismantlingFee + transportFee + processorFee + technicianFee + addonsTotal;

  let discountAmount = 0;
  let discountLabel: string | null = null;
  const discountPct = input.discountPercentOverride ?? (input.isCorporate ? corporateDiscountPercent : 0);
  if (discountPct > 0) {
    discountAmount = runningSubtotal * (discountPct / 100);
    discountLabel = input.isCorporate ? `Corporate discount (${discountPct}%)` : `Discount (${discountPct}%)`;
  }

  let subtotalBeforeTax = runningSubtotal - discountAmount;
  if (subtotalBeforeTax > 0 && subtotalBeforeTax < minimumRentalPrice) {
    subtotalBeforeTax = minimumRentalPrice;
  }

  const vatAmount = subtotalBeforeTax * (vatPercent / 100);
  const total = subtotalBeforeTax + vatAmount;

  return {
    rentalSubtotal: round2(rentalSubtotal),
    installationFee: round2(installationFee),
    dismantlingFee: round2(dismantlingFee),
    transportFee: round2(transportFee),
    processorFee: round2(processorFee),
    technicianFee: round2(technicianFee),
    addonsTotal: round2(addonsTotal),
    addonsLines: addonsLines.map((l) => ({ ...l, lineTotal: round2(l.lineTotal) })),
    discountAmount: round2(discountAmount),
    discountLabel,
    subtotalBeforeTax: round2(subtotalBeforeTax),
    vatAmount: round2(vatAmount),
    vatPercent,
    total: round2(total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------- Configurator math ----------
export interface ConfiguratorResult {
  widthM: number;
  heightM: number;
  cabinetsWide: number;
  cabinetsHigh: number;
  totalCabinets: number;
  areaM2: number;
  aspectRatio: string;
  resolutionEstimate: string;
}

export function computeConfigurator(
  widthM: number,
  heightM: number,
  cabinetWidthMm = 500,
  cabinetHeightMm = 500,
  pixelPitchMm = 2.6
): ConfiguratorResult {
  const cabinetsWide = Math.max(1, Math.ceil((widthM * 1000) / cabinetWidthMm));
  const cabinetsHigh = Math.max(1, Math.ceil((heightM * 1000) / cabinetHeightMm));
  const totalCabinets = cabinetsWide * cabinetsHigh;
  const actualWidthM = (cabinetsWide * cabinetWidthMm) / 1000;
  const actualHeightM = (cabinetsHigh * cabinetHeightMm) / 1000;
  const areaM2 = actualWidthM * actualHeightM;

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const wUnits = Math.round(actualWidthM * 100);
  const hUnits = Math.round(actualHeightM * 100);
  const divisor = gcd(wUnits, hUnits) || 1;
  const aspectRatio = `${Math.round(wUnits / divisor)}:${Math.round(hUnits / divisor)}`;

  const pxWide = Math.round((cabinetsWide * cabinetWidthMm) / pixelPitchMm);
  const pxHigh = Math.round((cabinetsHigh * cabinetHeightMm) / pixelPitchMm);
  const resolutionEstimate = `${pxWide} × ${pxHigh} px`;

  return {
    widthM: actualWidthM,
    heightM: actualHeightM,
    cabinetsWide,
    cabinetsHigh,
    totalCabinets,
    areaM2: round2(areaM2),
    aspectRatio,
    resolutionEstimate,
  };
}
