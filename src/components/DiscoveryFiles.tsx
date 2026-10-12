import { useState } from "react";
import { formatBytes } from "@/lib/discovery";
import type { DiscoveryAttachment, DiscoveryAttachmentKind } from "@/lib/types";
import { Button, Field } from "./ui";

export function DiscoveryFiles({
  attachments,
  onUpload,
  onArchive,
}: {
  attachments: DiscoveryAttachment[];
  onUpload: (kind: DiscoveryAttachmentKind, file: File) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<DiscoveryAttachmentKind | null>(null);
  const plans = attachments.filter((file) => file.kind === "floor_plan");
  const renderings = attachments.filter((file) => file.kind === "rendering");

  async function take(kind: DiscoveryAttachmentKind, list: FileList | null, input: HTMLInputElement) {
    const file = list?.[0];
    input.value = "";
    if (!file) return;
    setBusy(kind);
    try {
      await onUpload(kind, file);
    } catch {
      // The page shows the error.
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <FileColumn
        title="Floor plans"
        body="PDF sheets for this project. They stay in a private bucket and open through a signed link."
        empty="No floor plan yet."
        accept="application/pdf,.pdf"
        busy={busy === "floor_plan"}
        files={plans}
        onPick={(list, input) => void take("floor_plan", list, input)}
        onArchive={onArchive}
      />
      <FileColumn
        title="Renderings"
        body="JPEG, PNG, or WebP. A room can use one of these as its thumbnail."
        empty="No renderings yet."
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        busy={busy === "rendering"}
        files={renderings}
        onPick={(list, input) => void take("rendering", list, input)}
        onArchive={onArchive}
      />
    </div>
  );
}

function FileColumn({
  title,
  body,
  empty,
  accept,
  busy,
  files,
  onPick,
  onArchive,
}: {
  title: string;
  body: string;
  empty: string;
  accept: string;
  busy: boolean;
  files: DiscoveryAttachment[];
  onPick: (list: FileList | null, input: HTMLInputElement) => void;
  onArchive: (id: string) => Promise<void>;
}) {
  return (
    <section className="min-w-0 rounded-sm border border-rule bg-white p-4">
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
      <Field label="Upload" className="mt-4">
        <input
          className="block w-full text-sm"
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(event) => onPick(event.target.files, event.target)}
        />
      </Field>
      <p className="mt-1 text-xs text-ink-soft">20 MB max. {busy ? "Uploading…" : ""}</p>
      {files.length === 0 ? <p className="mt-4 text-sm text-ink-soft">{empty}</p> : null}
      <ul className="mt-4 space-y-4">
        {files.map((file) => (
          <li key={file.id} className="min-w-0 border-t border-rule pt-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">{file.file_name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {formatBytes(file.byte_size)}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (!window.confirm(`Remove “${file.file_name}”?`)) return;
                  void onArchive(file.id);
                }}
              >
                Remove
              </Button>
            </div>
            {file.signed_url && file.kind === "rendering" ? (
              <img
                src={file.signed_url}
                alt=""
                className="mt-3 max-h-48 w-full rounded-sm border border-rule object-contain"
              />
            ) : null}
            {file.signed_url && file.kind === "floor_plan" ? (
              <a
                className="mt-2 inline-block text-sm underline underline-offset-2"
                href={file.signed_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open PDF
              </a>
            ) : null}
            {!file.signed_url ? (
              <p className="mt-2 text-xs text-ink-soft">Preview unavailable for this file.</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
