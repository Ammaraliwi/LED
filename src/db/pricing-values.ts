export const LED_PRODUCT_DAILY_RATES = {
  "indoor-p2-6": "50.00",
  "indoor-p2-9": "45.00",
  "indoor-outdoor-p3-9": "42.00",
} as const;

export const CORE_PRICING_SETTING_VALUES = {
  installation_fee_per_cabinet: 5,
  dismantling_fee_per_cabinet: 3,
  transport_fee_base: 200,
  transport_fee_per_cabinet: 1,
  technician_daily_rate: 100,
  processor_daily_rate: 150,
  minimum_rental_price: 1000,
} as const;

export const CORE_PRICING_SETTING_UPDATES = [
  {
    key: "installation_fee_per_cabinet",
    value: CORE_PRICING_SETTING_VALUES.installation_fee_per_cabinet,
    label: "Installation fee per cabinet (QAR)",
  },
  {
    key: "dismantling_fee_per_cabinet",
    value: CORE_PRICING_SETTING_VALUES.dismantling_fee_per_cabinet,
    label: "Dismantling fee per cabinet (QAR)",
  },
  {
    key: "transport_fee_base",
    value: CORE_PRICING_SETTING_VALUES.transport_fee_base,
    label: "Base transportation fee (QAR)",
  },
  {
    key: "transport_fee_per_cabinet",
    value: CORE_PRICING_SETTING_VALUES.transport_fee_per_cabinet,
    label: "Additional transport per cabinet (QAR)",
  },
  {
    key: "technician_daily_rate",
    value: CORE_PRICING_SETTING_VALUES.technician_daily_rate,
    label: "Technician daily rate (QAR)",
  },
  {
    key: "processor_daily_rate",
    value: CORE_PRICING_SETTING_VALUES.processor_daily_rate,
    label: "LED processor daily rate (QAR)",
  },
  {
    key: "minimum_rental_price",
    value: CORE_PRICING_SETTING_VALUES.minimum_rental_price,
    label: "Minimum rental price (QAR)",
  },
] as const;

export const EQUIPMENT_DAILY_RATES = {
  "LED Video Processor": "150.00",
  "On-Site Technical Operator": "100.00",
} as const;
