"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export function MediaUploader() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [visibility, setVisibility] = useState<"public" | "private">("public");
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const file = new FormData(event.currentTarget).get("file"); if (!(file instanceof File)) return;
    setPending(true);
    try {
      const presign = await fetch("/api/admin/media/presign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, visibility }) });
      const setup = await presign.json(); if (!presign.ok) throw new Error(setup.error || "Upload could not start");
      const put = await fetch(setup.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file }); if (!put.ok) throw new Error("Object upload failed");
      const complete = await fetch(`/api/admin/media/${setup.mediaAssetId}/complete`, { method: "POST" }); const result = await complete.json(); if (!complete.ok) throw new Error(result.error || "Upload verification failed");
      toast.success("Media uploaded and verified"); router.refresh(); event.currentTarget.reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); } finally { setPending(false); }
  }
  return <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-dashed border-accent/30 bg-accent/[0.035] p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end"><label><span className="mb-1.5 block text-xs text-muted">File</span><input name="file" type="file" required accept={visibility === "public" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-3 file:py-2 file:text-white" /></label><label><span className="mb-1.5 block text-xs text-muted">Classification</span><select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"><option value="public">Public website image</option><option value="private">Private document</option></select></label><button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><UploadCloud className="h-4 w-4" />{pending ? "Verifying…" : "Upload"}</button></form>;
}
