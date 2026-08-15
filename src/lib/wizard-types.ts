import type { ledProducts, equipment, packages } from "@/db/schema";
import type { ConfiguratorResult } from "@/lib/pricing";

export type LedProduct = typeof ledProducts.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type Package = typeof packages.$inferSelect;

export type EventType =
  | "conference"
  | "exhibition"
  | "wedding"
  | "corporate_event"
  | "product_launch"
  | "festival"
  | "private_event"
  | "other";

export interface AddonSelection {
  equipmentId: number;
  quantity: number;
}

export interface UploadedDocument {
  mediaAssetId: number;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  category: "venue_photo" | "floor_plan" | "stage_drawing" | "reference_image" | "pdf" | "other";
}

export interface WizardState {
  step: number;

  // Step 1 — Screen configuration
  ledProductId: number | null;
  sizeMode: "preset" | "custom";
  presetIndex: number;
  customWidthM: string;
  customHeightM: string;
  packageId: number | null;

  // Step 2 — Dates
  eventDate: string;
  installationDate: string;
  installationTime: string;
  eventStartTime: string;
  eventEndTime: string;
  dismantlingDate: string;
  dismantlingTime: string;

  // Step 3 — Services & Add-ons
  includeInstallation: boolean;
  includeDismantling: boolean;
  includeTransport: boolean;
  includeProcessor: boolean;
  includeTechnician: boolean;
  addons: AddonSelection[];

  // Step 4 — Event info
  eventName: string;
  eventType: EventType;
  venueName: string;
  venueAddress: string;
  indoorOutdoor: "indoor" | "outdoor";
  additionalNotes: string;
  documents: UploadedDocument[];
}

export const SIZE_PRESETS = [
  { label: "2m × 2m", w: 2, h: 2 },
  { label: "3m × 2m", w: 3, h: 2 },
  { label: "4m × 2m", w: 4, h: 2 },
  { label: "4m × 3m", w: 4, h: 3 },
  { label: "5m × 3m", w: 5, h: 3 },
  { label: "6m × 3m", w: 6, h: 3 },
  { label: "6m × 4m", w: 6, h: 4 },
  { label: "8m × 4m", w: 8, h: 4 },
];

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "conference", label: "Conference" },
  { value: "exhibition", label: "Exhibition" },
  { value: "wedding", label: "Wedding" },
  { value: "corporate_event", label: "Corporate Event" },
  { value: "product_launch", label: "Product Launch" },
  { value: "festival", label: "Festival" },
  { value: "private_event", label: "Private Event" },
  { value: "other", label: "Other" },
];

export function initialWizardState(): WizardState {
  return {
    step: 1,
    ledProductId: null,
    sizeMode: "preset",
    presetIndex: 3,
    customWidthM: "4",
    customHeightM: "3",
    packageId: null,

    eventDate: "",
    installationDate: "",
    installationTime: "09:00",
    eventStartTime: "18:00",
    eventEndTime: "23:00",
    dismantlingDate: "",
    dismantlingTime: "23:30",

    includeInstallation: true,
    includeDismantling: true,
    includeTransport: true,
    includeProcessor: true,
    includeTechnician: true,
    addons: [],

    eventName: "",
    eventType: "conference",
    venueName: "",
    venueAddress: "",
    indoorOutdoor: "indoor",
    additionalNotes: "",
    documents: [],
  };
}

export interface ActiveConfig extends ConfiguratorResult {
  product: LedProduct | null;
}
