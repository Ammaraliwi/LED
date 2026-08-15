import Link from "next/link";
import { AdminCommandButton } from "@/components/admin/dynamic-form";
import { MediaUploader } from "@/components/admin/media-uploader";
import { AdminCard, AdminPageHeader, EmptyState, Pagination, StatusPill, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { listMedia, type PageInput } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";

export default async function MediaPage({ searchParams }: { searchParams: Promise<PageInput> }) {
  const actor = await requireAdmin("media.read"); const data = await listMedia(await searchParams); const canWrite = hasPermission(actor.role, "media.write");
  return <><AdminPageHeader title="Media library" description="Public images and authorized private documents stored in S3-compatible object storage. Database records contain stable object keys, never expiring URLs." />{canWrite && <div className="mb-6"><MediaUploader /></div>}
    <AdminCard className="overflow-hidden">{data.rows.length === 0 ? <EmptyState title="No media assets" description="Configure object storage, then upload the first public image or private document." /> : <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={thClass}>Asset</th><th className={thClass}>Classification</th><th className={thClass}>Type / size</th><th className={thClass}>Dimensions</th><th className={thClass}>Status</th><th className={thClass}>Created</th><th className={thClass}></th></tr></thead><tbody>{data.rows.map((asset) => <tr key={asset.id}><td className={tdClass}>{asset.visibility === "public" && asset.status === "ready" ? <Link href={`/api/media/${asset.id}/content`} className="font-medium text-accent">{asset.originalName}</Link> : <span className="font-medium">{asset.originalName}</span>}<div className="mt-1 max-w-xs truncate text-xs text-muted">{asset.objectKey}</div></td><td className={tdClass}><StatusPill value={asset.visibility} /></td><td className={tdClass}>{asset.mimeType}<div className="text-xs text-muted">{(asset.sizeBytes / 1024).toFixed(1)} KB</div></td><td className={tdClass}>{asset.widthPx && asset.heightPx ? `${asset.widthPx} × ${asset.heightPx}` : "—"}</td><td className={tdClass}><StatusPill value={asset.status} /></td><td className={tdClass}>{formatDate(asset.createdAt)}</td><td className={tdClass}>{canWrite && asset.status !== "deleted" ? <AdminCommandButton payload={{ action: "media.archive", id: asset.id }} tone="danger" confirmMessage="Archive this media record? Existing references may stop rendering.">Archive</AdminCommandButton> : null}</td></tr>)}</tbody></table></div>}<Pagination page={data.page} pageSize={data.pageSize} total={data.total} pathname="/admin/media" /></AdminCard>
  </>;
}
