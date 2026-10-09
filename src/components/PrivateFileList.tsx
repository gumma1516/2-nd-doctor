"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { getUserFileBlob } from "@/lib/data/files";
import { fileLabel, fileSizeLabel, type StoredFile } from "@/lib/data/types";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui";

export function PrivateFileList({ files }: { files: StoredFile[] }) {
  if (!files.length) return <p className="text-sm text-zinc-500">No files attached.</p>;
  return <ul className="space-y-3">{files.map((file) => <PrivateFile key={file.path} file={file} />)}</ul>;
}

function PrivateFile({ file }: { file: StoredFile }) {
  const label = fileLabel(file);
  const size = fileSizeLabel(file);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const blob = await getUserFileBlob(file.path);
      if (mounted.current) setUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, "Could not load this file. Please retry."));
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <li className="rounded-xl border border-white/8 bg-zinc-950/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 text-sm text-zinc-300">
          <FileText className="size-4 shrink-0 text-brand-200" aria-hidden />
          <span className="min-w-0">
            <span className="block break-all">{label}</span>
            {size && <span className="block text-xs text-zinc-500 mt-0.5">{size}</span>}
          </span>
        </span>
        {url ? <div className="flex gap-4 text-sm font-medium text-brand-300">
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} in a new tab`}>Open file</a>
          <a href={url} download={label} aria-label={`Download ${label}`}>Download</a>
        </div> : <Button type="button" variant="secondary" loading={loading} onClick={load} className="w-auto px-3 py-2 text-sm" aria-label={`Load ${label}`}>{error ? "Retry file" : "Load file"}</Button>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </li>
  );
}
