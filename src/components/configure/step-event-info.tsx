"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { EVENT_TYPES, type UploadedDocument, type WizardState } from "@/lib/wizard-types";
import { cn } from "@/lib/utils";

export function StepEventInfo({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: UploadedDocument[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `Failed to upload ${file.name}`);
          continue;
        }
        uploaded.push({
          mediaAssetId: data.mediaAssetId,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          category: file.type === "application/pdf" ? "pdf" : "reference_image",
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    update({ documents: [...state.documents, ...uploaded] });
    setUploading(false);
  }

  function removeDoc(mediaAssetId: number) {
    update({ documents: state.documents.filter((d) => d.mediaAssetId !== mediaAssetId) });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Tell us about your event</h2>
        <p className="mt-1.5 text-sm text-muted">This helps our operations team prepare the right equipment and crew.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event Name" required value={state.eventName} onChange={(v) => update({ eventName: v })} />
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Event Type</label>
          <select
            value={state.eventType}
            onChange={(e) => update({ eventType: e.target.value as WizardState["eventType"] })}
            className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Venue Name" required value={state.venueName} onChange={(v) => update({ venueName: v })} />
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Indoor / Outdoor</label>
          <div className="flex gap-2 rounded-xl border border-border p-1">
            {(["indoor", "outdoor"] as const).map((v) => (
              <button
                key={v}
                onClick={() => update({ indoorOutdoor: v })}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-all",
                  state.indoorOutdoor === v ? "bg-accent text-white" : "text-muted hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Field
        label="Venue Address"
        required
        value={state.venueAddress}
        onChange={(v) => update({ venueAddress: v })}
        textarea
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Additional Requirements / Notes</label>
        <textarea
          rows={4}
          value={state.additionalNotes}
          onChange={(e) => update({ additionalNotes: e.target.value })}
          placeholder="Anything our team should know — ceiling height, power access, load-in restrictions..."
          className="w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Venue Photos, Floor Plans & Reference Files
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/30 px-6 py-10 text-center transition-colors hover:border-accent/50"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <UploadCloud className="h-6 w-6 text-muted" />}
          <p className="text-sm text-foreground">Click to upload, or drag and drop</p>
          <p className="text-xs text-muted-2">JPG, PNG, WEBP or PDF — up to 15MB each</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {state.documents.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {state.documents.map((doc) => (
              <div key={doc.mediaAssetId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {doc.category === "pdf" ? (
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <ImageIcon className="h-4 w-4 shrink-0 text-accent" />
                  )}
                  <span className="truncate text-xs text-foreground">{doc.fileName}</span>
                </div>
                <button onClick={() => removeDoc(doc.mediaAssetId)} className="shrink-0 text-muted hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
}) {
  const className =
    "w-full rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {textarea ? (
        <textarea rows={2} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      ) : (
        <input required={required} value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      )}
    </div>
  );
}
