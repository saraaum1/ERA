import { useRef, useState } from "react";
import { uploadCoverImage } from "@/lib/era/store";
import { optimisedImage } from "@/lib/era/media";
import { cn } from "@/lib/utils";

/** Lets a provider upload their own cover photo (click or drag & drop) with a live preview. */
export function CoverUpload({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (path: string) => void;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");
  const preview = optimisedImage(value) ?? "";

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setMsg("");
    setBusy(true);
    const r = await uploadCoverImage(file);
    setBusy(false);
    if (r.ok) onChange(r.path);
    else setMsg(r.error);
    if (input.current) input.current.value = "";
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        id="cover-file"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {preview ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border bg-muted">
            <img src={preview} alt="Cover preview" className="h-full w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs uppercase tracking-[0.2em] text-primary">
                Uploading…
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This photo appears on the experience card, details page and ticket.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline !px-4 !py-2"
                onClick={() => input.current?.click()}
                disabled={busy}
              >
                Replace Photo
              </button>
              <button
                type="button"
                className="btn btn-outline !px-4 !py-2"
                onClick={() => onChange("")}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor="cover-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "cover-drop flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 py-12 text-center",
            drag && "is-drag",
          )}
        >
          <svg
            viewBox="0 0 48 48"
            className="h-12 w-12 text-lavender"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 40V18a16 16 0 0 1 32 0v22Z" />
            <path d="M14 34l7-8 5 5 4-4 4 7" />
            <circle cx="30" cy="20" r="2.5" />
          </svg>
          <span className="font-medium text-primary">
            {busy ? "Uploading…" : "Upload a cover photo"}
          </span>
          <span className="text-xs text-muted-foreground">
            Click to choose, or drag & drop · JPG, PNG or WebP · up to 6 MB
          </span>
          <span className="text-xs text-muted-foreground">
            Square photos look best. Without a photo, the card shows the experience's poster.
          </span>
        </label>
      )}
      {(msg || error) && (
        <p className="field-error" role="alert">
          {msg || error}
        </p>
      )}
    </div>
  );
}
