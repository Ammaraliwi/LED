export interface InventoryUsage {
  reservedCabinets: number;
  blockedCabinets: number;
}

export function availableCabinets(totalCabinets: number, usage: InventoryUsage): number {
  return Math.max(0, totalCabinets - usage.reservedCabinets - usage.blockedCabinets);
}

export function canReserve(totalCabinets: number, requiredCabinets: number, usage: InventoryUsage): boolean {
  return requiredCabinets > 0 && availableCabinets(totalCabinets, usage) >= requiredCabinets;
}
