"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, Save } from "lucide-react";
import { computeConfigurator, computePricing } from "@/lib/pricing";

interface Setting { key: string; value: unknown; label: string | null; updatedAt: Date | string; }
interface Product { id: number; name: string; pricePerCabinetPerDay: string; cabinetWidthMm: number; cabinetHeightMm: number; pixelPitch: string; }

export function PricingEditor({ settings, products, canWrite }: { settings: Setting[]; products: Product[]; canWrite: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(settings.map((row) => [row.key, row.value])));
  const [rates, setRates] = useState<Record<number, number>>(() => Object.fromEntries(products.map((row) => [row.id, Number(row.pricePerCabinetPerDay)])));
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? 0);
  const [width, setWidth] = useState(3); const [height, setHeight] = useState(2); const [days, setDays] = useState(1); const [pending, setPending] = useState(false);
  const selected = products.find((product) => product.id === selectedProductId);
  const preview = useMemo(() => {
    if (!selected) return null;
    const configuration = computeConfigurator(width, height, selected.cabinetWidthMm, selected.cabinetHeightMm, Number(selected.pixelPitch));
    return { configuration, price: computePricing({
      pricePerCabinetPerDay: rates[selected.id] ?? 0, totalCabinets: configuration.totalCabinets, rentalDays: days,
      includeInstallation: true, includeDismantling: true, includeTransport: true, includeProcessor: true, includeTechnician: true,
      addons: [], isWeekend: false, isCorporate: false, settings: values,
    }) };
  }, [selected, width, height, days, rates, values]);

  function updateSetting(key: string, raw: string) {
    if (key === "multi_day_discount_curve") {
      try { setValues((current) => ({ ...current, [key]: JSON.parse(raw) })); } catch { /* keep last valid JSON while typing */ }
    } else setValues((current) => ({ ...current, [key]: Number(raw) }));
  }

  async function save() {
    if (!window.confirm("Apply these rates to future quotes and bookings? Existing bookings will not change.")) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        action: "pricing.update",
        settings: Object.entries(values).map(([key, value]) => ({ key, value })),
        productRates: Object.entries(rates).map(([productId, value]) => ({ productId: Number(productId), value })),
      }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Pricing update failed");
      toast.success("Pricing updated for future transactions"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Pricing update failed"); } finally { setPending(false); }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
        <h2 className="font-display text-lg font-semibold">Product rental rates</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{products.map((product) => <label key={product.id}><span className="mb-1.5 block text-xs text-muted">{product.name} · QAR/cabinet/day</span><input disabled={!canWrite} type="number" min="0" step="0.01" value={rates[product.id] ?? 0} onChange={(event) => setRates((current) => ({ ...current, [product.id]: Number(event.target.value) }))} className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60" /></label>)}</div>
      </section>
      <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
        <h2 className="font-display text-lg font-semibold">Services, discounts and tax</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{settings.map((setting) => <label key={setting.key} className={setting.key === "multi_day_discount_curve" ? "md:col-span-2" : ""}><span className="mb-1.5 block text-xs text-muted">{setting.label || setting.key}</span>{setting.key === "multi_day_discount_curve" ? <textarea disabled={!canWrite} defaultValue={JSON.stringify(setting.value, null, 2)} onChange={(event) => updateSetting(setting.key, event.target.value)} rows={5} className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-accent disabled:opacity-60" /> : <input disabled={!canWrite} type="number" min="0" step="0.01" value={Number(values[setting.key] ?? 0)} onChange={(event) => updateSetting(setting.key, event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60" />}</label>)}</div>
        {canWrite && <button disabled={pending} onClick={save} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{pending ? "Saving…" : "Save future pricing"}</button>}
      </section>
    </div>
    <aside className="h-fit rounded-2xl border border-accent/20 bg-accent/[0.04] p-5 xl:sticky xl:top-24">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent"><Calculator className="h-4 w-4" /> Before-save preview</div>
      <div className="mt-5 grid grid-cols-2 gap-3"><label><span className="text-xs text-muted">Product</span><select value={selectedProductId} onChange={(e) => setSelectedProductId(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs">{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span className="text-xs text-muted">Days</span><input type="number" min="1" max="365" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs" /></label><label><span className="text-xs text-muted">Width (m)</span><input type="number" min="0.5" step="0.5" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs" /></label><label><span className="text-xs text-muted">Height (m)</span><input type="number" min="0.5" step="0.5" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs" /></label></div>
      {preview && <div className="mt-6 space-y-2 text-sm"><Line label={`${preview.configuration.totalCabinets} cabinets rental`} value={preview.price.rentalSubtotal} /><Line label="Installation" value={preview.price.installationFee} /><Line label="Dismantling" value={preview.price.dismantlingFee} /><Line label="Transport" value={preview.price.transportFee} /><Line label="Processor" value={preview.price.processorFee} /><Line label="Mandatory technician" value={preview.price.technicianFee} /><Line label={`VAT (${preview.price.vatPercent}%)`} value={preview.price.vatAmount} /><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="font-semibold">Expected total</span><strong className="font-display text-xl text-white">QAR {preview.price.total.toLocaleString()}</strong></div></div>}
      <p className="mt-5 text-xs leading-5 text-muted">Preview is not saved. Confirming the form creates one audited database change and affects new transactions only.</p>
    </aside>
  </div>;
}

function Line({ label, value }: { label: string; value: number }) { return <div className="flex justify-between gap-4 text-muted"><span>{label}</span><span className="font-medium text-white">QAR {value.toLocaleString()}</span></div>; }
