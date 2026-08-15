import Link from "next/link";
import { DynamicAdminForm } from "@/components/admin/dynamic-form";
import { AdminCard, AdminPageHeader, EmptyState, Pagination, StatusPill, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { listProducts, type PageInput } from "@/lib/admin/queries";
import { hasPermission } from "@/lib/admin/permissions";
import { formatCurrency } from "@/lib/utils";

const productFields = [
  { name: "name", label: "Product name", required: true }, { name: "slug", label: "URL slug", required: true },
  { name: "screenType", label: "Screen type", type: "select" as const, options: [{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }], required: true },
  { name: "pixelPitch", label: "Pixel pitch (mm)", type: "number" as const, valueType: "number" as const, step: "0.1", required: true },
  { name: "cabinetWidthMm", label: "Cabinet width (mm)", type: "number" as const, valueType: "number" as const, required: true, defaultValue: 500 },
  { name: "cabinetHeightMm", label: "Cabinet height (mm)", type: "number" as const, valueType: "number" as const, required: true, defaultValue: 500 },
  { name: "brightnessNits", label: "Brightness (nits)", type: "number" as const, valueType: "nullableNumber" as const },
  { name: "refreshRateHz", label: "Refresh rate (Hz)", type: "number" as const, valueType: "nullableNumber" as const },
  { name: "totalCabinets", label: "Total cabinet inventory", type: "number" as const, valueType: "number" as const, required: true },
  { name: "pricePerCabinetPerDay", label: "QAR per cabinet/day", type: "number" as const, valueType: "number" as const, step: "0.01", required: true },
  { name: "mediaAssetId", label: "Public media asset ID", type: "number" as const, valueType: "nullableNumber" as const },
  { name: "description", label: "Description", type: "textarea" as const },
  { name: "specifications", label: "Structured specifications", type: "json" as const, valueType: "json" as const, defaultValue: {} },
  { name: "isFeatured", label: "Featured", type: "checkbox" as const, valueType: "boolean" as const },
  { name: "isActive", label: "Active", type: "checkbox" as const, valueType: "boolean" as const, defaultValue: true },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<PageInput> }) {
  const actor = await requireAdmin("products.read"); const canWrite = hasPermission(actor.role, "products.write"); const input = await searchParams; const data = await listProducts(input);
  return <><AdminPageHeader title="LED products & inventory" description="Manage the product catalog and total fleet. Date-specific availability is derived from bookings and inventory blocks." actions={<form className="flex gap-2"><input name="q" defaultValue={data.q} placeholder="Search products" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" /><select name="status" defaultValue={data.status} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black">Filter</button></form>} />
    {canWrite && <div className="mb-6"><DynamicAdminForm command="product.create" fields={productFields} nesting="data" title="Create LED product" submitLabel="Create product" /></div>}
    <AdminCard className="overflow-hidden">{data.rows.length === 0 ? <EmptyState title="No products found" /> : <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={thClass}>Product</th><th className={thClass}>Pitch/type</th><th className={thClass}>Cabinets</th><th className={thClass}>Rate</th><th className={thClass}>Status</th><th className={thClass}></th></tr></thead><tbody>{data.rows.map((product) => <tr key={product.id}><td className={tdClass}><div className="font-medium">{product.name}</div><div className="text-xs text-muted">{product.slug}</div></td><td className={tdClass}>P{Number(product.pixelPitch)} · {product.screenType}</td><td className={tdClass}>{product.totalCabinets}</td><td className={tdClass}>{formatCurrency(product.pricePerCabinetPerDay)}</td><td className={tdClass}><StatusPill value={product.isActive ? "active" : "inactive"} /></td><td className={tdClass}><Link href={`/admin/products/${product.id}`} className="text-xs font-semibold text-accent">Manage</Link></td></tr>)}</tbody></table></div>}<Pagination page={data.page} pageSize={data.pageSize} total={data.total} pathname="/admin/products" query={{ q: data.q, status: data.status }} /></AdminCard>
  </>;
}

export { productFields };
