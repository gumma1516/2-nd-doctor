"use client";

import { useId, useRef, useState } from "react";
import { UploadCloud, X, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type UploadItem = { id: string; file: File };

type Limits = {
  maxFiles: number;
  maxFileSizeMB: number;
  maxTotalSizeMB: number;
  accept: readonly string[];
};

type Props = {
  id: string;
  items: UploadItem[];
  onChange: (items: UploadItem[]) => void;
  limits: Limits;
  accent?: "brand" | "teal";
  title?: string;
  helper?: string;
  error?: string;
};

const MB = 1024 * 1024;
const formatSize = (bytes: number) =>
  bytes < MB ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / MB).toFixed(1)} MB`;

/**
 * Accessible file dropzone with click, keyboard and drag-and-drop support.
 * Enforces file type, per-file size, total size and file count limits client-side.
 * NOTE: Server-side validation is still required once uploads hit real storage.
 */
export function FileDropzone({
  id,
  items,
  onChange,
  limits,
  accent = "brand",
  title = "Click to upload",
  helper,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<string[]>([]);
  const descId = useId();

  const addFiles = (incoming: FileList | File[]) => {
    const errors: string[] = [];
    const next = [...items];
    let total = next.reduce((sum, i) => sum + i.file.size, 0);

    for (const file of Array.from(incoming)) {
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!limits.accept.includes(ext)) {
        errors.push(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > limits.maxFileSizeMB * MB) {
        errors.push(`${file.name}: exceeds ${limits.maxFileSizeMB} MB`);
        continue;
      }
      if (next.length >= limits.maxFiles) {
        errors.push(`Maximum ${limits.maxFiles} files allowed`);
        break;
      }
      if (total + file.size > limits.maxTotalSizeMB * MB) {
        errors.push(`Total size cannot exceed ${limits.maxTotalSizeMB} MB`);
        break;
      }
      if (next.some((i) => i.file.name === file.name && i.file.size === file.size)) {
        continue; // silently skip duplicates
      }
      total += file.size;
      next.push({ id: crypto.randomUUID(), file });
    }

    setRejections(errors);
    onChange(next);
  };

  const remove = (itemId: string) => onChange(items.filter((i) => i.id !== itemId));

  const accentText = accent === "brand" ? "text-brand-400" : "text-teal-400";
  const accentBorder = accent === "brand" ? "border-brand-500 bg-brand-500/5" : "border-teal-500 bg-teal-500/5";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        id={id}
        aria-describedby={`${descId}${error ? ` ${id}-error` : ""}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-2xl transition-colors cursor-pointer bg-zinc-950/50 hover:bg-zinc-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          dragging ? accentBorder : error ? "border-red-500/60" : "border-zinc-800"
        )}
      >
        <div className="space-y-2 text-center flex flex-col items-center pointer-events-none">
          <div
            className={cn(
              "size-16 rounded-full flex items-center justify-center mb-2 border transition-transform",
              accent === "brand" ? "bg-brand-500/10 border-brand-500/20" : "bg-teal-500/10 border-teal-500/20",
              accentText,
              dragging && "scale-110"
            )}
          >
            <UploadCloud className="size-8" aria-hidden />
          </div>
          <p className="text-zinc-400">
            <span className={cn("font-semibold", accentText)}>{title}</span> or drag and drop
          </p>
          <p id={descId} className="text-sm text-zinc-500">
            {limits.accept.map((a) => a.slice(1).toUpperCase()).join(", ")} · up to {limits.maxFileSizeMB} MB each ·
            max {limits.maxFiles} files
          </p>
          {helper && <p className="text-xs text-zinc-600 max-w-xs mt-2">{helper}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={limits.accept.join(",")}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
      {rejections.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-xs text-amber-400">
          {rejections.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-zinc-400">Selected files ({items.length})</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(({ id: itemId, file }) => (
              <li
                key={itemId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileIcon className={cn("size-5 shrink-0", accentText)} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{file.name}</p>
                    <p className="text-xs text-zinc-600">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => remove(itemId)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
